import { constituencies } from '../../data/constituencies';
import { parties as partyData } from '../../data/parties';
import type { PartyId } from '../../data/types';
import type { RNG } from '../engine/random';

export interface SeatAllocation {
  seats: Record<PartyId, number>;
  totalSeats: number;
  constituencyResults: Record<string, Record<PartyId, number>>;
  method: string;
}

/**
 * 席位分配：两级近似（方案 §5.5）
 * 第一级：各选区按 Hagenbach-Bischoff 商（票数/(席次+1)）分配。
 * 第二级：剩余票在全国层面按最大余数法分配。
 * 这是对魏玛实际选举法的近似实现，而非现代单一全国比例制。
 */
export function allocateSeats(
  shares: Record<PartyId, number>,
  totalSeats: number,
  rng: RNG,
  fairness = 1
): SeatAllocation {
  const activeParties = Object.keys(shares).filter((p) => shares[p] > 0.15);
  const seats: Record<PartyId, number> = {};
  for (const p of partyData) seats[p.id] = 0;

  const totalConstSeats = constituencies.reduce((s, c) => s + c.seats, 0);
  const scale = totalSeats / totalConstSeats;
  const constituencyResults: Record<string, Record<PartyId, number>> = {};

  const allocatedPerParty: Record<PartyId, number> = {};
  for (const p of activeParties) allocatedPerParty[p] = 0;
  let allocated = 0;

  for (const c of constituencies) {
    const cSeats = Math.max(1, Math.round(c.seats * scale));
    const local: Record<PartyId, number> = {};
    let sum = 0;
    for (const p of activeParties) {
      const mod = c.party_modifiers[p] ?? 0;
      const raw = Math.max(0, shares[p] * (1 + mod * 0.45) + rng.normal() * 0.35);
      local[p] = raw;
      sum += raw;
    }
    for (const p of activeParties) local[p] = (local[p] / (sum || 1)) * 100;
    constituencyResults[c.id] = local;

    const quota = 100 / (cSeats + 1);
    let cAllocated = 0;
    const remainders: { p: PartyId; r: number }[] = [];
    for (const p of activeParties) {
      const raw = Math.floor(local[p] / quota);
      const take = Math.min(raw, cSeats - cAllocated);
      if (take > 0) {
        allocatedPerParty[p] += take;
        cAllocated += take;
      }
      remainders.push({ p, r: local[p] / quota - raw });
    }
    // 剩余席位按余数分配
    remainders.sort((a, b) => b.r - a.r);
    let idx = 0;
    while (cAllocated < cSeats && idx < remainders.length * 2) {
      const cand = remainders[idx % remainders.length];
      allocatedPerParty[cand.p] += 1;
      cAllocated += 1;
      idx++;
    }
    allocated += cAllocated;
  }

  // 第二级：剩余席位按“剩余票”最大余数法
  let remaining = totalSeats - allocated;
  if (remaining > 0) {
    const pool: { p: PartyId; r: number }[] = [];
    for (const p of activeParties) {
      const ideal = (shares[p] / 100) * totalSeats;
      const leftover = Math.max(0, ideal - allocatedPerParty[p]);
      pool.push({ p, r: leftover });
    }
    pool.sort((a, b) => b.r - a.r);
    let i = 0;
    while (remaining > 0 && pool.length > 0) {
      const cand = pool[i % pool.length];
      if (cand.r <= 0) break;
      allocatedPerParty[cand.p] += 1;
      cand.r -= 1;
      remaining--;
      i++;
    }
  }

  // 若超出（因取整），从最大党递减
  let totalAllocated = Object.values(allocatedPerParty).reduce((a, b) => a + b, 0);
  while (totalAllocated > totalSeats) {
    const largest = Object.entries(allocatedPerParty).sort((a, b) => b[1] - a[1])[0];
    allocatedPerParty[largest[0]] -= 1;
    totalAllocated--;
  }

  for (const [p, n] of Object.entries(allocatedPerParty)) seats[p] = n;

  return {
    seats,
    totalSeats,
    constituencyResults,
    method: '两级近似：选区 Hagenbach-Bischoff 商 + 全国剩余票最大余数法',
  };
}

/** 多数门槛（方案 §25.6） */
export function majorityThreshold(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}
