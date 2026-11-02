import { parties as partyData, partyMap } from '../../data/parties';
import { voterGroups as groupData } from '../../data/voterGroups';
import type { PartyId } from '../../data/types';
import type { GameState } from '../types';
import type { RNG } from '../engine/random';
import { clamp } from '../engine/random';

export interface VoteComputation {
  shares: Record<PartyId, number>;
  groupShares: Record<string, Record<PartyId, number>>;
  turnout: number;
  validVotes: number;
  /** 各党在全国层面的平均条件乘数（用于把“结构”与“当期条件”分离） */
  avgMultiplier: Record<PartyId, number>;
  factors: { factor: string; detail: string; weight: number }[];
}

export function isPartyActive(id: PartyId, date: string): boolean {
  const p = partyMap.get(id);
  if (!p) return false;
  if (p.active_from > date) return false;
  if (p.active_to && p.active_to < date) return false;
  // DDP 在 1930-07-28 改组为 DStP
  if (id === 'ddp' && date >= '1930-07-28') return false;
  if (id === 'dstp' && date < '1930-07-28') return false;
  if (id === 'uspd' && date > '1922-09-24') return false;
  return true;
}

function interestMatch(groupId: string, partyId: PartyId): number {
  const g = groupData.find((x) => x.id === groupId)!;
  const p = partyMap.get(partyId)!;
  const s = g.sensitivity;
  const score =
    s.welfare * p.policy.welfare * 0.3 +
    s.wages * p.policy.labor * 0.28 +
    s.nationalism * -p.policy.foreign * 0.18 +
    s.religion * p.policy.religion * 0.12 +
    s.security * (0.4 - p.ideology.social_authority_liberty) * 0.12;
  return clamp(score, -1, 1);
}

function ideologyMatch(groupId: string, partyId: PartyId): number {
  const g = groupData.find((x) => x.id === groupId)!;
  const p = partyMap.get(partyId)!;
  const d = (Math.abs(g.ideal.economic - p.ideology.economic_left_right) + Math.abs(g.ideal.social - p.ideology.social_authority_liberty)) / 2;
  return clamp(1 - d, 0, 1);
}

/**
 * 选民群体—政党效用模型（方案 §5.4）
 * PartyUtility = 基础认同 + 意识形态接近度 + 政策匹配 + 政府绩效 + 组织 + 竞选 + 领袖 - 丑闻 + 抗议动员 + 扰动
 */
export function computeVotes(state: GameState, rng: RNG, opts: { campaign: boolean; fairness: number }): VoteComputation {
  const shares: Record<PartyId, number> = {};
  const groupShares: Record<string, Record<PartyId, number>> = {};
  const multiplierAcc: Record<PartyId, number> = {};
  const weightAcc: Record<PartyId, number> = {};
  const active = partyData.filter((p) => isPartyActive(p.id, state.date) && !state.parties[p.id]?.banned);

  const perf = Math.max(-1, Math.min(1, (state.society.satisfaction - 52) / 48));
  const violence = state.society.violence;
  const unemployment = state.economy.unemployment;
  // 执政疲劳：同一政府在任越久，选民越倾向惩罚它（Weimar 政府平均寿命约 8 个月）
  const govStart = new Date(state.government.startDate);
  const now = new Date(state.date);
  const govMonths = Math.max(0, (now.getFullYear() - govStart.getFullYear()) * 12 + (now.getMonth() - govStart.getMonth()));
  const fatigue = Math.min(1.1, (govMonths / 48) * 0.55);
  // T = 1 时，群体内份额严格正比于“结构基础 × 条件乘数”：
  // 史实结构决定基准，政策与危机只通过乘数改变结果，模型可解释、可控。
  const T = 1;

  for (const g of groupData) {
    const gs = state.voterGroups[g.id];
    if (!gs) continue;
    const scores: Record<PartyId, number> = {};
    const multipliers: Record<PartyId, number> = {};
    const structuralBase: Record<PartyId, number> = {};

    for (const p of active) {
      const ps = state.parties[p.id];
      // 结构基础：党派在群体中的固有支持（∝ 史实得票结构）
      const structural = Math.max(0.05, gs.affinity[p.id] ?? 0);
      let m = 1;

      // ① 群体—政党匹配（意识形态 + 利益）
      const match = ideologyMatch(g.id, p.id) * 0.18 + (interestMatch(g.id, p.id) + 1) * 0.12;
      m *= 0.72 + match;

      // ② 政府绩效归因
      if (ps.inGovernment) m *= Math.exp(perf * 0.4 - fatigue);
      else if (p.anti_system <= 0.4) m *= Math.exp(-perf * 0.35);

      // ③ 危机乘数：失业与不满为反体制政党提供动员资源。
      //    饱和项保证“已经很大的党”不会因同一场危机被再次成倍放大。
      if (p.anti_system > 0.4) {
        const crisis =
          Math.max(0, unemployment - 8) / 12 +
          Math.max(0, 50 - state.society.satisfaction) / 55 +
          Math.max(0, violence - 40) / 90;
        const saturation = 1 - Math.min(0.78, structural / 120);
        m *= Math.min(6, Math.exp(crisis * 1.05 * p.anti_system * saturation));
        // 疏离感
        m *= 1 + (gs.alienation / 220) * saturation;
      }

      // ④ 组织、动员与领袖
      m *= 0.72 + ps.organization / 260 + ps.mobilization / 300 + ps.leadership / 420;

      // ⑤ 竞选期
      if (opts.campaign) m *= 0.88 + ps.mobilization / 320 + ps.media / 380 + rng.normal() * 0.03;

      // ⑥ 丑闻
      m *= 1 - Math.min(0.5, ps.scandal / 160);

      // ⑦ 秩序诉求：暴力上升时，威权倾向政党在高安全敏感群体中获益
      if (p.ideology.social_authority_liberty < -0.3) {
        m *= Math.exp((violence - 40) * 0.006 * (g.sensitivity.security - 0.3));
      } else {
        m *= Math.exp(-(violence - 40) * 0.002);
      }

      // ⑧ 宗教—世俗错配
      if (g.sensitivity.religion > 0.7 && p.policy.religion < 0) m *= 0.82;
      if (g.sensitivity.religion < 0.2 && p.policy.religion > 0.7) m *= 0.88;

      m *= 1 + rng.normal() * 0.02;
      multipliers[p.id] = Math.max(0.01, m);
      structuralBase[p.id] = structural;
    }

    // 归一化：乘数的加权几何均值固定为 1，
    // 使“条件”只改变党派之间的相对强弱，不整体抬高或压低所有政党。
    let logSum = 0;
    let baseSum = 0;
    for (const pid of Object.keys(multipliers)) {
      const b = structuralBase[pid];
      logSum += b * Math.log(multipliers[pid]);
      baseSum += b;
    }
    const geoMean = baseSum > 0 ? Math.exp(logSum / baseSum) : 1;

    for (const pid of Object.keys(multipliers)) {
      const m = multipliers[pid] / geoMean;
      multiplierAcc[pid] = (multiplierAcc[pid] ?? 0) + m * g.weight;
      weightAcc[pid] = (weightAcc[pid] ?? 0) + g.weight;
      scores[pid] = Math.log(structuralBase[pid] * m);
    }

    // Softmax（T 控制乘数的影响强度）
    const maxScore = Math.max(...Object.values(scores));
    let sum = 0;
    const exps: Record<PartyId, number> = {};
    for (const [pid, sc] of Object.entries(scores)) {
      const v = Math.exp((sc - maxScore) / T);
      exps[pid] = v;
      sum += v;
    }
    const local: Record<PartyId, number> = {};
    for (const [pid, v] of Object.entries(exps)) local[pid] = (v / sum) * 100;
    groupShares[g.id] = local;
  }

  // 按群体权重 × 投票率聚合
  let turnoutWeighted = 0;
  let weightSum = 0;
  for (const g of groupData) {
    const gs = state.voterGroups[g.id];
    const local = groupShares[g.id];
    if (!gs || !local) continue;
    const turnout = clamp(g.turnout_base * 100 + (gs.satisfaction - 50) * 0.25 - gs.alienation * 0.12, 45, 96) / 100;
    turnoutWeighted += g.weight * turnout;
    weightSum += g.weight;
    for (const [pid, share] of Object.entries(local)) {
      shares[pid] = (shares[pid] ?? 0) + (g.weight * turnout * share) / 100;
    }
  }
  const turnout = weightSum > 0 ? (turnoutWeighted / weightSum) * 100 : 80;

  // 归一化
  const total = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(shares)) shares[k] = (shares[k] / total) * 100;

  // 选举公平性：压制反对派、放大执政党
  if (opts.fairness < 0.85) {
    const suppression = (0.85 - opts.fairness) * 1.6;
    const govParties = new Set(state.government.parties);
    let boostSum = 0;
    for (const p of active) {
      if (govParties.has(p.id)) {
        const boost = shares[p.id] * suppression * 0.6;
        shares[p.id] += boost;
        boostSum += boost;
      } else if (p.anti_system > 0.5 || p.id === 'spd') {
        const cut = shares[p.id] * suppression * 0.8;
        shares[p.id] = Math.max(0, shares[p.id] - cut);
        boostSum -= cut;
      }
    }
    const t2 = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
    for (const k of Object.keys(shares)) shares[k] = (shares[k] / t2) * 100;
    void boostSum;
  }

  const factors = [
    { factor: '经济与社会状况', detail: `失业 ${state.economy.unemployment.toFixed(1)}%、生活满意度 ${state.society.satisfaction.toFixed(0)}`, weight: 0.3 },
    { factor: '政府绩效归因', detail: `执政联盟获得 ${perf > 0 ? '正向' : '负向'}评价`, weight: 0.25 },
    { factor: '选民惯性', detail: '群体党派亲和度按月缓慢调整，短期冲击不会立即改变投票', weight: 0.2 },
    { factor: '组织与动员', detail: '党组织密度、媒体与领袖影响力', weight: 0.15 },
    { factor: '政治暴力', detail: `暴力指数 ${state.society.violence.toFixed(0)}`, weight: 0.1 },
  ];

  const avgMultiplier: Record<PartyId, number> = {};
  for (const pid of Object.keys(multiplierAcc)) {
    avgMultiplier[pid] = multiplierAcc[pid] / Math.max(1e-6, weightAcc[pid]);
  }

  return {
    shares,
    groupShares,
    avgMultiplier,
    turnout,
    validVotes: Math.round(turnout * 400000),
    factors,
  };
}

/** 月度支持度更新：向模型结果缓慢收敛（选民惯性） */
export function updatePartySupport(state: GameState, rng: RNG) {
  const comp = computeVotes(state, rng, { campaign: false, fairness: 0.95 });
  for (const p of partyData) {
    const ps = state.parties[p.id];
    if (!ps) continue;
    if (!isPartyActive(p.id, state.date) || ps.banned) {
      ps.support = Math.max(0, ps.support * 0.7);
      continue;
    }
    const target = comp.shares[p.id] ?? 0;
    ps.support += (target - ps.support) * 0.18;
  }
  // 归一化
  const total = Object.values(state.parties).reduce((a, b) => a + b.support, 0) || 1;
  for (const ps of Object.values(state.parties)) ps.support = (ps.support / total) * 100;

}
