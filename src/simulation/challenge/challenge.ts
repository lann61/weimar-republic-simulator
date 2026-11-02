import type { GameState } from '../types';
import type { ChallengeCondition } from '../../data/types';
import { getPath } from '../engine/state';

/** 比较工具 */
function compare(v: number, op: string, target: number): boolean {
  switch (op) {
    case '>':
      return v > target;
    case '<':
      return v < target;
    case '>=':
      return v >= target;
    case '<=':
      return v <= target;
    case '==':
      return v === target;
    default:
      return false;
  }
}

/** 评估单个挑战条件（WMR-017） */
export function evaluateCondition(
  state: GameState,
  c: ChallengeCondition
): { current: number; met: boolean } {
  if (c.custom === 'parliamentary_governance') return { current: state.government.type === 'presidential_cabinet' || !!state.flags.enablingActPassed ? 0 : 1, met: state.government.type !== 'presidential_cabinet' && !state.flags.enablingActPassed };
  if (c.custom === 'government_majority') {
    const seats = state.government.parties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);
    const support = state.government.supportParties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);
    const threshold = Math.floor(state.parliamentSeatsTotal / 2) + 1;
    return { current: seats, met: seats + support >= threshold };
  }
  if (c.custom === 'no_major_party_ban') {
    const banned = Object.values(state.parties).filter((p) => p.banned && p.seatsLastElection > 0);
    return { current: banned.length, met: banned.length === 0 };
  }
  const current = getPath(state, c.path ?? '');
  return { current, met: compare(current, c.op ?? '>=', c.value ?? 0) };
}

/** 每月更新挑战进度；约束违反立即失败，截止日期到达时判定通过/失败 */
export function stepChallenge(state: GameState, date = state.cursorDate ?? state.date, inclusive = true) {
  const ch = state.challenge;
  if (!ch || ch.status !== 'active') return;
  for (const c of ch.constraints) {
    if (!evaluateCondition(state, c).met) { ch.status = 'failed'; ch.note = '约束被违反：' + c.label; return; }
  }
  ch.progress = ch.objectives.map(o => {
    const old = ch.progress.find(p => p.id === o.id);
    if (old?.evaluatedAt) return old;
    const result = evaluateCondition(state, o);
    const due = o.deadline && (inclusive ? date >= o.deadline : date > o.deadline);
    return { id: o.id, label: o.label, ...result, evaluatedAt: due ? o.deadline : undefined };
  });
  const failed = ch.progress.find(p => p.evaluatedAt && !p.met);
  if (failed) { ch.status = 'failed'; ch.note = failed.label + '：截止日期 ' + failed.evaluatedAt + ' 未达成'; }
  else if (ch.progress.length && ch.progress.every(p => p.evaluatedAt)) {
    ch.status = 'passed'; ch.note = '所有目标均在各自截止日期结算达成';
  }
}
