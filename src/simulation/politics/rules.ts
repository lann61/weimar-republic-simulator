import type { GameState } from '../types';
import { policyMap } from '../../data/policies';
import { addPath, defaultBoundsFor, getPath } from '../engine/state';
import { clamp } from '../engine/random';

export const currentDate = (s: GameState) => s.cursorDate ?? s.date;

export function changeVars(s: GameState, vars: Record<string, number>, source: string) {
  s.metricChanges ??= {};
  for (const [path, amount] of Object.entries(vars)) {
    const before = getPath(s, path);
    const [lo, hi] = defaultBoundsFor(path);
    const delta = clamp(before + amount, lo, hi) - before;
    addPath(s as unknown as Record<string, unknown>, path, delta);
    if (delta) (s.metricChanges[path] ??= []).push({ source, delta });
  }
}

export function issueEmergencyDecree(s: GameState, reason: string, scope: string, months: number) {
  if (s.meta.ended) return;
  const date = currentDate(s);
  s.article48.push({ id: `a48_${date}_${s.article48.length}`, date, reason, scope, months,
    presidentId: s.presidentId, chancellorId: s.government.chancellorId,
    parliamentaryReaction: s.institutions.parliamentAuthority > 45 ? '国会保留撤销与监督权' : '国会监督能力薄弱', active: true });
  s.stats.article48Count++;
  changeVars(s, { 'institutions.emergencyDependence': 2, 'institutions.presidentialPowerUse': 1 }, reason);
  s.log.push({ id: `log_a48_${s.article48.length}`, date, type: 'article48', title: reason,
    detail: `${scope}；有效期 ${months} 个月。`, importance: 'major' });
}

export function reconcileParliament(s: GameState) {
  s.government.parties = s.government.parties.filter(id => !s.parties[id]?.banned);
  s.government.supportParties = s.government.supportParties.filter(id => !s.parties[id]?.banned);
  for (const p of Object.values(s.parties)) {
    p.inGovernment = s.government.parties.includes(p.id);
    p.supportsGovernment = s.government.supportParties.includes(p.id);
  }
  s.government.seatsAtFormation = s.government.parties.reduce((n, id) => n + (s.parties[id]?.seats ?? 0), 0);
  s.government.parliamentSeatsTotal = s.parliamentSeatsTotal;
  const i = s.governmentHistory.findIndex(g => g.id === s.government.id);
  if (i >= 0) s.governmentHistory[i] = structuredClone(s.government);
}

export function prohibitParty(s: GameState, id: string) {
  const p = s.parties[id];
  if (!p || (p.banned && p.seats === 0)) return;
  s.parliamentSeatsTotal = Math.max(0, s.parliamentSeatsTotal - p.seats);
  p.banned = true; p.active = false; p.seats = 0; p.support = 0;
  reconcileParliament(s);
}

const CONFLICTS = [
  ['pol_expansion', 'pol_austerity'], ['pol_welfare_expand', 'pol_welfare_cut'],
  ['pol_tax_up', 'pol_tax_down'], ['pol_trade_open', 'pol_trade_protection'],
];
export function enactPolicy(s: GameState, id: string): string {
  const p = policyMap.get(id);
  if (s.meta.ended) return '模拟已结束，最终状态已冻结';
  if (!p) return '政策不存在';
  if (s.activePolicies.some(a => a.policyId === id)) return '该政策已经生效';
  const opposing = CONFLICTS.find(group => group.includes(id)) ?? [];
  const removed = s.activePolicies.filter(a => opposing.includes(a.policyId));
  // 政策切换撤回旧政策尚在执行的预算安排，避免相反措施叠加。
  for (const a of removed) {
    const old = policyMap.get(a.policyId);
    const budget = Object.fromEntries(Object.entries(old?.immediate ?? {}).filter(([k]) => ['economy.spending', 'economy.taxRevenue'].includes(k)).map(([k,v]) => [k,-v]));
    changeVars(s, budget, `撤回：${old?.name_zh}`);
  }
  s.activePolicies = s.activePolicies.filter(a => !opposing.includes(a.policyId));
  changeVars(s, p.immediate, p.name_zh);
  s.activePolicies.push({ id: `${id}_${currentDate(s)}`, policyId: id, startDate: currentDate(s), monthsLeft: p.duration_months, note: p.name_zh });
  if (id === 'pol_emergency_rule') issueEmergencyDecree(s, p.name_zh, p.description, p.duration_months);
  if (id === 'pol_republic_defense') s.flags.militaryBargain = 0;
  s.meta.divergence = Math.min(1, s.meta.divergence + 0.03);
  s.log.push({ id: `log_pol_${id}_${s.log.length}`, date: currentDate(s), type: 'economy', title: `政策实施：${p.name_zh}`,
    detail: `${p.description} 持续 ${p.duration_months} 个月。${removed.length ? '已替换相反方向的政策。' : ''}`, importance: 'major' });
  return `已实施：${p.name_zh}`;
}

/** 持续制度约束只可由后续明确改革解除，不随月度均值回归消失。 */
export function enforceInstitutions(s: GameState) {
  if (s.flags.civilRightsSuspended) s.society.mediaFreedom = Math.min(s.society.mediaFreedom, 18);
  if (s.flags.enablingActPassed) {
    s.institutions.parliamentAuthority = Math.min(s.institutions.parliamentAuthority, 12);
    s.institutions.emergencyDependence = Math.max(s.institutions.emergencyDependence, 70);
  }
  if (s.flags.judiciaryPurged) s.institutions.judicialIndependence = Math.min(s.institutions.judicialIndependence, 15);
  if (s.flags.onePartyState) {
    s.society.mediaFreedom = Math.min(s.society.mediaFreedom, 8);
    s.institutions.partyCompromise = Math.min(s.institutions.partyCompromise, 10);
  }
  if (s.flags.unionsBanned) s.society.strikes = Math.min(s.society.strikes, 12);
}

export function measureChanges<T>(s: GameState, source: string, run: () => T): T {
  const before = Object.fromEntries(['economy','society','institutions','diplomacy'].flatMap(sec => Object.entries(s[sec as 'economy']).map(([k,v]) => [sec + '.' + k,v])));
  const result = run();
  s.metricChanges ??= {};
  for (const [path,v] of Object.entries(before)) {
    const delta = getPath(s,path) - v;
    if (Math.abs(delta) > 1e-9) (s.metricChanges[path] ??= []).push({ source, delta });
  }
  return result;
}
