import { partyMap, parties as partyData } from '../../data/parties';
import { people } from '../../data/people';
import { OFFICE_LABELS } from '../../data/governments';
import type { PartyId } from '../../data/types';
import type { GameState, GovernmentState } from '../types';
import type { RNG } from '../engine/random';
import { majorityThreshold } from './seats';

/** 各党可出任总理的人物池（用于反事实路径中的内阁轮替） */
export const PARTY_CHANCELLOR_POOL: Record<PartyId, string[]> = {
  spd: ['person_mueller_hermann', 'person_wels', 'person_bauer', 'person_scheidemann', 'person_braun_otto', 'person_severing'],
  zentrum: ['person_marx_wilhelm', 'person_wirth', 'person_bruening', 'person_kaas', 'person_fehrenbach', 'person_erzberger'],
  dvp: ['person_curtius', 'person_stresemann', 'person_scholz', 'person_dingeldey'],
  ddp: ['person_koch_weser', 'person_heuss', 'person_dietrich_hermann', 'person_kuelz'],
  dstp: ['person_heuss', 'person_dietrich_hermann', 'person_kuelz'],
  dnvp: ['person_hugenberg', 'person_hergt', 'person_westarp', 'person_schiele'],
  bvp: ['person_held', 'person_schaeffer_fritz', 'person_heim'],
  nsdap: ['person_hitler', 'person_goering', 'person_frick'],
  wirtschaftspartei: ['person_dingeldey'],
  landvolk: ['person_schiele'],
  csvd: ['person_stegerwald'],
  vrp: ['person_breitscheid'],
  kpd: ['person_thalmann'],
  uspd: ['person_crispien'],
  dhp: ['person_held'],
};

export const PARTY_LEADERS: Record<PartyId, string> = {
  spd: 'person_mueller_hermann',
  uspd: 'person_crispien',
  kpd: 'person_thalmann',
  zentrum: 'person_marx_wilhelm',
  bvp: 'person_held',
  ddp: 'person_koch_weser',
  dstp: 'person_heuss',
  dvp: 'person_curtius',
  dnvp: 'person_hugenberg',
  nsdap: 'person_hitler',
  wirtschaftspartei: 'person_dingeldey',
  landvolk: 'person_schiele',
  dhp: 'person_held',
  csvd: 'person_stegerwald',
  vrp: 'person_breitscheid',
};

/** 历史上出现过的联合组合（用于“历史合作记录”加分） */
const HISTORICAL_COALITIONS: PartyId[][] = [
  ['spd', 'zentrum', 'ddp'],
  ['spd', 'zentrum', 'ddp', 'dvp'],
  ['spd', 'zentrum', 'ddp', 'dvp', 'bvp'],
  ['zentrum', 'ddp', 'dvp'],
  ['zentrum', 'dvp', 'ddp', 'bvp'],
  ['dnvp', 'dvp', 'zentrum', 'ddp', 'bvp'],
  ['dnvp', 'dvp', 'zentrum'],
  ['nsdap', 'dnvp'],
];

const OFFICE_ORDER = ['chancellor', 'vice_chancellor', 'foreign', 'interior', 'finance', 'economy', 'labor', 'justice', 'defense', 'agriculture', 'transport', 'education'];

export interface CoalitionOutcome {
  type: GovernmentState['type'];
  parties: PartyId[];
  supportParties: PartyId[];
  chancellorId: string;
  score: number;
  explanation: string[];
  seats: number;
  totalSeats: number;
}

function coalitionDistance(parties: PartyId[]): number {
  if (parties.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < parties.length; i++) {
    for (let j = i + 1; j < parties.length; j++) {
      const a = partyMap.get(parties[i])!;
      const b = partyMap.get(parties[j])!;
      sum +=
        Math.abs(a.ideology.economic_left_right - b.ideology.economic_left_right) +
        Math.abs(a.ideology.social_authority_liberty - b.ideology.social_authority_liberty);
      n++;
    }
  }
  return n ? sum / n / 2 : 0;
}

function compatible(parties: PartyId[]): boolean {
  for (const p of parties) {
    const party = partyMap.get(p);
    if (!party) return false;
    for (const q of parties) {
      if (p !== q && party.red_lines.includes(q)) return false;
    }
  }
  return true;
}

function isHistoricalCombination(parties: PartyId[]): boolean {
  const set = new Set(parties);
  return HISTORICAL_COALITIONS.some((c) => c.length === set.size && c.every((p) => set.has(p)));
}

/** 枚举所有包含最大党的可行多数联盟（限制规模以控制计算量） */
function enumerateCoalitions(candidates: PartyId[], seats: Record<PartyId, number>, threshold: number): PartyId[][] {
  const result: PartyId[][] = [];
  const n = candidates.length;
  if (n > 12) return result;
  const total = 1 << n;
  for (let mask = 1; mask < total; mask++) {
    const combo: PartyId[] = [];
    let s = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) {
      combo.push(candidates[i]);
      s += seats[candidates[i]] ?? 0;
    }
    if (s >= threshold && combo.length <= 5) result.push(combo);
  }
  return result;
}

export function formGovernment(state: GameState, rng: RNG): CoalitionOutcome {
  const seats: Record<PartyId, number> = {};
  for (const [pid, ps] of Object.entries(state.parties)) seats[pid] = ps.seats;

  const totalSeats = state.parliamentSeatsTotal;
  const threshold = majorityThreshold(totalSeats);
  const ranked = Object.entries(seats)
    .filter(([pid, s]) => s > 0 && !state.parties[pid]?.banned && partyMap.get(pid))
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => pid);

  if (ranked.length === 0) {
    return {
      type: 'caretaker',
      parties: [],
      supportParties: [],
      chancellorId: state.government.chancellorId,
      score: 0,
      explanation: ['国会无有效席位，组建看守政府。'],
      seats: 0,
      totalSeats,
    };
  }

  const largest = ranked[0];
  const democratic = ranked.filter((p) => (partyMap.get(p)?.anti_system ?? 1) < 0.6);
  const candidates = ranked.filter((p) => (partyMap.get(p)?.anti_system ?? 1) < 0.6);

  const coalitions = enumerateCoalitions(candidates, seats, threshold)
    .filter((c) => compatible(c))
    .map((c) => {
      const s = c.reduce((a, p) => a + (seats[p] ?? 0), 0);
      const dist = coalitionDistance(c);
      let score = 100 - dist * 55 - ((s - threshold) / totalSeats) * 40;
      if (isHistoricalCombination(c)) score += 8;
      // 组阁算术的基本约束：排除第一大党的联盟需要额外解释，权重因此显著降低
      if (c.includes(largest)) score += 26;
      else score -= 20;
      // 总统偏好：保守派总统偏好不含SPD的联盟
      const presConservative = state.presidentId === 'person_hindenburg';
      if (presConservative && c.includes('spd')) score -= 8;
      if (presConservative && (c.includes('dnvp') || c.includes('dvp'))) score += 5;
      // 危机时期偏好“大联盟”
      if (state.society.polarization > 65 && c.length >= 3) score += 4;
      score += rng.normal() * 2;
      return { c, s, score, dist };
    })
    .sort((a, b) => b.score - a.score);

  const explanation: string[] = [];

  if (coalitions.length > 0) {
    const best = coalitions[0];
    explanation.push(
      `可行多数联盟 ${coalitions.length} 个；选择意识形态距离最小且历史合作记录最佳的方案（距离 ${best.dist.toFixed(2)}，席位 ${best.s}/${totalSeats}，门槛 ${threshold}）。`
    );
    const chancellor = pickChancellor(state, best.c[0] ?? largest);
    return {
      type: 'coalition',
      parties: best.c,
      supportParties: [],
      chancellorId: chancellor,
      score: best.score,
      explanation,
      seats: best.s,
      totalSeats,
    };
  }

  // 无可行多数：由最大“民主”政党尝试少数政府。
  // 反体制最大党不得凭席位排名自动获得总理职位（WMR-009）。
  const minorityLeader = democratic[0] ?? null;
  if (!minorityLeader) {
    explanation.push(
      '最大党为反体制政党，不能自动获得组阁资格；由总统任命总统内阁，是否任命其领袖交由制度事件处理。'
    );
    return {
      type: 'presidential_cabinet',
      parties: [],
      supportParties: [],
      chancellorId: pickPresidentialChancellor(state, rng),
      score: 10,
      explanation,
      seats: 0,
      totalSeats,
    };
  }
  const largestPrefs = (partyMap.get(minorityLeader)?.coalition_preferences ?? []).filter(
    (p) => seats[p] > 0 && (partyMap.get(p)?.anti_system ?? 1) < 0.6
  );
  const minorityParties = [minorityLeader, ...largestPrefs.slice(0, 2)];
  let uniqueMinority = [...new Set(minorityParties)];
  // 少数政府同样不得跨越政党的“绝不联合”红线
  while (uniqueMinority.length > 1 && !compatible(uniqueMinority)) {
    uniqueMinority = uniqueMinority.slice(0, -1);
  }
  const minoritySeats = uniqueMinority.reduce((a, p) => a + (seats[p] ?? 0), 0);

  if (minoritySeats > totalSeats * 0.3) {
    explanation.push(
      `无法形成多数联盟（最大党 ${partyMap.get(largest)?.short_name} 未参与组阁，最大民主政党 ${partyMap.get(minorityLeader)?.short_name} ${seats[minorityLeader]} 席，门槛 ${threshold}）。转为少数政府，依赖外部容忍。`
    );
    return {
      type: 'minority',
      parties: uniqueMinority,
      supportParties: democratic.filter((p) => !uniqueMinority.includes(p)).slice(0, 2),
      chancellorId: pickChancellor(state, minorityLeader),
      score: 30,
      explanation,
      seats: minoritySeats,
      totalSeats,
    };
  }

  // 总统内阁
  explanation.push('无法形成任何可行多数，且最大党不具备组阁条件。总统任命总统内阁，依赖第48条治理。');
  return {
    type: 'presidential_cabinet',
    parties: [],
    supportParties: [],
    chancellorId: pickPresidentialChancellor(state, rng),
    score: 10,
    explanation,
    seats: 0,
    totalSeats,
  };
}

/**
 * 选择总理人选：优先党内领袖，但若该党已连续执政两届以上，
 * 则换用同党另一位资深人物，避免反事实路径出现“同一总理连任十几年”。
 */
function pickChancellor(state: GameState, partyId: PartyId): string {
  const pool = PARTY_CHANCELLOR_POOL[partyId] ?? [PARTY_LEADERS[partyId]].filter(Boolean);
  const available = pool.filter((id) => isPersonEligibleForOffice(id, state.date, 'chancellor'));
  if (available.length === 0) return state.government.chancellorId;

  // 选举不会机械轮换同党人物：现任仍符合党籍与在世资格时允许续任。
  const current = state.government.chancellorId;
  const member = people.find(p => p.id === current)?.party_memberships.some(m => m.party_id === partyId && (!m.from || m.from <= state.date) && (!m.to || m.to >= state.date));
  if (member && available.includes(current)) return current;
  return available[0];
}

function personMapHas(id: string): boolean {
  // 真实检查人物是否存在（WMR-010）
  return people.some((p) => p.id === id);
}

/** 人物在指定日期是否在世（用于总理/部长资格） */
function isAliveAt(id: string, date: string): boolean {
  const p = people.find((x) => x.id === id);
  if (!p) return false;
  return p.birth_date <= date && p.death_date >= date;
}

/**
 * 人物是否具备担任某职务的资格（WMR-010）：
 * 存在、在世、党籍时期覆盖该日期，总理还需具备相应角色或党籍。
 */
export function isPersonEligibleForOffice(
  personId: string,
  date: string,
  office: string,
  partyId?: PartyId
): boolean {
  const p = people.find((x) => x.id === personId);
  if (!p) return false;
  if (p.birth_date > date || p.death_date < date) return false;
  if (partyId) {
    const member = p.party_memberships.some(
      (m) => m.party_id === partyId && (m.from === null || m.from <= date) && (!m.to || m.to >= date)
    );
    if (!member) return false;
  }
  if (office === 'chancellor') {
    return (
      p.roles.some((r) => ['chancellor', 'party_leader', 'minister', 'president'].includes(r)) ||
      p.party_memberships.length > 0
    );
  }
  return true;
}

function pickPresidentialChancellor(state: GameState, rng: RNG): string {
  const pool = ['person_bruening', 'person_papen', 'person_schleicher', 'person_luther', 'person_marx_wilhelm'];
  const available = pool.filter((p) => p !== state.government.chancellorId);
  return rng.pick(available);
}

/** 为推演内阁分配部长：只使用真实人物，且明确标记为推演 */
export function buildSimulatedCabinet(parties: PartyId[], chancellorId: string, date: string): GovernmentState['members'] {
  const members: GovernmentState['members'] = [];
  const used = new Set<string>([chancellorId]);
  members.push({
    person_id: chancellorId,
    office_id: 'chancellor',
    office_zh: OFFICE_LABELS.chancellor,
    party_id: parties[0] ?? null,
    political_identity: 'party',
    from: date,
    to: null,
    appointment_mode: 'presidential_appointment',
    cabinet_status: 'full_member',
  });

  const offices = OFFICE_ORDER.filter((o) => o !== 'chancellor');
  let idx = 0;
  for (const office of offices) {
    const party = parties[idx % Math.max(1, parties.length)];
    const pool = people.filter(
      (p) =>
        !used.has(p.id) &&
        p.birth_date <= date &&
        p.death_date >= date &&
        p.party_memberships.some((m) => m.party_id === party && (m.from === null || m.from <= date) && (!m.to || m.to >= date)) &&
        p.roles.some((r) => ['minister', 'party_leader', 'member_of_parliament', 'state_minister'].includes(r))
    );
    const pick =
      pool[0] ??
      people.find(
        (p) =>
          !used.has(p.id) &&
          p.birth_date <= date &&
          p.death_date >= date &&
          p.party_memberships.some((m) => m.party_id === party && (m.from === null || m.from <= date) && (!m.to || m.to >= date))
      );
    if (pick) {
      used.add(pick.id);
      members.push({
        person_id: pick.id,
        office_id: office,
        office_zh: OFFICE_LABELS[office] ?? office,
        party_id: party,
        political_identity: 'party',
        from: date,
        to: null,
        appointment_mode: 'chancellor_nomination',
        cabinet_status: 'full_member',
      });
    }
    idx++;
  }
  return members;
}
