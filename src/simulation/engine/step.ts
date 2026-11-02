import { elections as electionData } from '../../data/elections';
import type { GameState, MonthlyNews, Snapshot, ElectionScheduleEntry } from '../types';
import type { RNG } from './random';
import { clamp } from './random';
import { monthStart, SIM_END, addMonths, formatDate, monthIndex, phaseOf, PHASE_LABELS } from './date';
import { stepEconomy } from '../economy/economy';
import { stepSociety, stepVoterGroups } from '../society/society';
import { stepInstitutions } from '../politics/institutions';
import { stepDiplomacy } from '../diplomacy/diplomacy';
import { updatePartySupport } from '../elections/voting';
import { runElection, checkGovernmentSurvival, replaceGovernment, monthsInOffice, anchorWeight, installHistoricalGovernment } from '../elections/run';
import { governments } from '../../data/governments';
import { dueEvents, rollConditional, applyChoice, autoResolve, stepDelayed, settleDelayed, blockedInMonth } from '../events/engine';
import { partyMap } from '../../data/parties';
import { personMap } from '../../data/people';
import { determineEnding } from './ending';
import { stepChallenge } from '../challenge/challenge';
import { currentDate, enforceInstitutions, issueEmergencyDecree, measureChanges } from '../politics/rules';
import { ensureWorldEvents, stepWorldEvents, WORLD_CATEGORIES } from '../events/world';

/** 史实全国选举日程（方案 §18.1） */
const ELECTION_SCHEDULE: { month: string; id: string; type: 'reichstag' | 'national_assembly'; label: string }[] = [
  { month: '1919-01', id: 'election_1919_01', type: 'national_assembly', label: '国民议会选举' },
  { month: '1920-06', id: 'election_1920_06', type: 'reichstag', label: '国会选举' },
  { month: '1924-05', id: 'election_1924_05', type: 'reichstag', label: '国会选举' },
  { month: '1924-12', id: 'election_1924_12', type: 'reichstag', label: '国会选举' },
  { month: '1928-05', id: 'election_1928_05', type: 'reichstag', label: '国会选举' },
  { month: '1930-09', id: 'election_1930_09', type: 'reichstag', label: '国会选举' },
  { month: '1932-07', id: 'election_1932_07', type: 'reichstag', label: '国会选举' },
  { month: '1932-11', id: 'election_1932_11', type: 'reichstag', label: '国会选举' },
  { month: '1933-03', id: 'election_1933_03', type: 'reichstag', label: '国会选举（国会纵火案后）' },
];

export interface AdvanceResult {
  state: GameState;
  advanced: boolean;
  blockedByEvent: boolean;
  messages: string[];
}

export function advanceMonth(input: GameState, rng: RNG): AdvanceResult {
  const state = input;
  const messages: string[] = [];

  if (state.meta.ended) return { state, advanced: false, blockedByEvent: false, messages: ['模拟已结束'] };

  // 有待处理事件时，必须先处理
  if (state.pendingEvent) {
    return { state, advanced: false, blockedByEvent: true, messages: ['请先处理当前事件'] };
  }

  ensureWorldEvents(state);
  state.date = monthStart(addMonths(state.date, 1));
  state.metricChanges = {};
  state.cursorDate = state.date;
  state.decisionsThisMonth = 0;
  state.phase = phaseOf(state.date);

  if (monthIndex(state.date) > monthIndex('1934-08-01')) {
    state.date = '1934-08-31';
    state.cursorDate = state.date;
    state.meta.ended = true;
    state.meta.ending = determineEnding(state);
    state.meta.endingTitle = '模拟结束：1934年8月';
    return { state, advanced: true, blockedByEvent: false, messages: ['模拟到达时间边界（1934年8月）'] };
  }

  // ── 1. 延迟影响与政策 ────────────────────────────────────
  stepDelayed(state);
  // 无需选择的局势变量先进入指标，再传导至经济、社会、选民和制度反馈。
  const worldEvent = stepWorldEvents(state);

  // ── 2. 外部环境与经济 ────────────────────────────────────
  measureChanges(state, '外交关系与资本信心反馈', () => stepDiplomacy(state));
  const econ = measureChanges(state, '产出、信贷与财政反馈', () => stepEconomy(state, rng));

  // ── 3. 社会与制度 ────────────────────────────────────────
  measureChanges(state, '社会情绪与秩序反馈', () => stepSociety(state, rng));
  stepVoterGroups(state);
  measureChanges(state, '制度与执政支持反馈', () => stepInstitutions(state));
  measureChanges(state, '持续制度约束', () => enforceInstitutions(state));

  // ── 4. 政党支持度 ────────────────────────────────────────
  updatePartySupport(state, rng);

  // ── 4b. 总统内阁的紧急法令使用 ──────────────────────────
  if (state.government.type === 'presidential_cabinet' && monthIndex(state.date) % 2 === 0) {
    issueEmergencyDecree(state, '总统内阁紧急治理', '财政与社会支出调整', 3);
  }

  // ── 5. 第48条状态衰减 ────────────────────────────────────
  for (const r of state.article48) {
    if (r.active && monthIndex(state.date) - monthIndex(r.date) >= r.months) r.active = false;
  }

  // ── 6. 政府更迭 ──────────────────────────────────────────
  // 史实锚定较强时：按史实日期更迭内阁，不做随机倒阁
  const curMonth = state.date.slice(0, 7);
  const anchor = anchorWeight(state);

  if (state.meta.mode === 'historical' && state.meta.divergence === 0 && !state.flags.playerGovernment && state.government.isHistorical) {
    const scheduled = governments
      .filter((g) => g.from.slice(0, 7) === curMonth && g.id !== state.government.id)
      // 被取缔的政党无法组成政府：史实内阁若依赖该党，则不能按日期强行安装
      .filter((g) => !g.parties.some((p) => state.parties[p]?.banned))
      .sort((a, b) => (a.from < b.from ? -1 : 1));
    if (scheduled.length > 0) {
      const g = scheduled[0];
      // 政府在其真实成立日期才生效；月初未到期的政府延后到事件游标到达时安装（WMR-008）
      if (g.from <= (state.cursorDate ?? state.date)) {
        installHistoricalGovernment(state, g.id);
        messages.push(`内阁更迭：${g.name_zh}`);
      } else {
        state.flags.pendingGovernmentId = g.id;
        state.flags.pendingGovernmentDate = g.from;
      }
    }
  } else {
    const survival = checkGovernmentSurvival(state, rng);
    if (survival.fall) {
      state.flags.cabinetReviewDue = 1;
      state.flags.cabinetReviewReason = survival.reason;
    }
  }

  // ── 7. 统一选举调度器（WMR-016） ──────────────────────────
  // 史实日程、事件解散/提前选举统一排队；同一月份只执行一次，并记录触发原因。
  // 史实锚定强时按史实日期举行国会选举；玩家显著偏离后不再强制史实日程
  const postponed = typeof state.flags.electionPostponedUntil === 'string' && state.flags.electionPostponedUntil.slice(0, 7) > curMonth;
  const sched = anchor > 0.55 && !postponed && !state.flags.onePartyState ? ELECTION_SCHEDULE.find((e) => e.month === curMonth) : undefined;
  const candidates: ElectionScheduleEntry[] = [];
  if (sched) {
    candidates.push({
      date: electionData.find(e => e.id === sched.id)!.date,
      type: sched.type,
      label: sched.label,
      historicalId: sched.id,
      trigger: 'schedule',
      reason: '史实全国选举日程',
    });
  }

  // 制宪选举：国会尚未产生时必须举行，否则永远没有议会、没有政府（WMR-030）
  if (state.elections.length === 0 && monthIndex(state.date) >= monthIndex('1919-01')) {
    candidates.push({
      date: state.date,
      type: 'national_assembly',
      label: '国民议会选举',
      historicalId: anchor > 0.55 ? 'election_1919_01' : undefined,
      trigger: 'schedule',
      reason: '制宪选举（国会尚未产生）',
    });
  }

  // 偏离史实后：按四年任期举行模型选举，避免历史日程关闭后永远不选举（WMR-030）
  const lastElection = state.elections[state.elections.length - 1];
  if (!state.flags.onePartyState && anchor <= 0.55 && lastElection && monthIndex(state.date) - monthIndex(lastElection.date) >= 48) {
    candidates.push({
      date: state.date,
      type: 'reichstag',
      label: '国会选举（任期届满）',
      trigger: 'schedule',
      reason: '四年任期届满',
    });
  }
  // 兼容旧存档：pendingElectionDate 转为候选
  const pending = state.flags.pendingElectionDate;
  if (typeof pending === 'string' && state.date >= pending) {
    candidates.push({
      date: state.date,
      type: 'reichstag',
      label: '国会选举（提前举行）',
      trigger: 'early',
      reason: '旧版存档的待定选举',
    });
    delete state.flags.pendingElectionDate;
    delete state.flags.reichstagDissolved;
  }
  // 事件队列中的选举
  const dueEntries = (state.electionSchedule ?? []).filter((e) => e.date.slice(0, 7) <= curMonth);
  candidates.push(...dueEntries);
  state.electionSchedule = (state.electionSchedule ?? []).filter((e) => e.date.slice(0, 7) > curMonth);

  if (candidates.length > 0 && !state.flags.onePartyState) {
    candidates.sort((a,b) => a.date.localeCompare(b.date));
    const chosen = candidates.find(c => c.historicalId) ?? candidates[0];
    if (!state.elections.some(e => e.date.slice(0,7) === curMonth)) {
      state.electionSchedule ??= [];
      state.electionSchedule.push(chosen);
    }
  }

  // 总统职位由总统选举事件（ev_hindenburg_elected / ev_presidential_1932_second）设置，
  // 不再由固定日程直接替换 presidentId（WMR-012）。

  // ── 7b. 挑战情景判定（WMR-017） ───────────────────────────
  // 挑战在事件选择和月末结算后判定。

  // ── 8. 新闻与快照 ────────────────────────────────────────
  const news = generateNews(state, econ);
  if (worldEvent) {
    news.body = `${worldEvent.description} ${worldEvent.transmission} 影响已自动生效，并延续 ${worldEvent.duration} 个月。${news.body}`;
    news.headline = `局势突发：${worldEvent.title}`;
    news.tags.unshift('自动局势事件', WORLD_CATEGORIES[worldEvent.category]);
  }
  state.news.push(news);
  state.snapshots.push(makeSnapshot(state));

  // ── 9. 结局检查 ──────────────────────────────────────────

  // ── 10. 事件队列 ─────────────────────────────────────────
  // 政府危机由真实支持与信任状态触发，通过事件交给玩家处理。
  logBlockedEvents(state);
  openNextEvent(state, rng);

  state.meta.rngCalls = rng.calls;
  return { state, advanced: true, blockedByEvent: !!state.pendingEvent, messages };
}

/**
 * 记录因前置条件不足而未发生的历史事件。
 * 只结算“上个月”：同月内的事件链（如 6 月 20 日条约决定 → 6 月 28 日签署）
 * 需要等前者结算后才轮到后者，因此不能在月初就判定后者“未发生”。
 */
export function logBlockedEvents(state: GameState) {
  const prev = new Date(state.date);
  prev.setMonth(prev.getMonth() - 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  for (const e of blockedInMonth(state, prevMonth)) {
    const key = `blocked_${e.id}`;
    if (state.flags[key]) continue;
    state.flags[key] = 1;
    state.log.push({
      id: `log_blocked_${e.id}`,
      date: state.date,
      type: 'event',
      title: `历史条件不成立：${e.title}`,
      detail: '前置条件未满足，该事件在本局没有发生。史实结果仅供对照。',
      importance: 'major',
    });
  }
}

export function openNextEvent(state: GameState, rng: RNG) {
  if (state.pendingEvent || state.meta.ended) return;
  for (let guard = 0; guard < 300; guard++) {
    const next = dueEvents(state)[0];
    const election = (state.electionSchedule ?? []).filter(e => e.date.slice(0,7) <= state.date.slice(0,7)).sort((a,b) => a.date.localeCompare(b.date))[0];
    const govDue = typeof state.flags.pendingGovernmentDate === 'string' ? state.flags.pendingGovernmentDate : '9999';
    const delayDue = state.delayedEffects.map(d => d.triggerDate).sort()[0] ?? '9999';
    if (election && (!next || election.date <= next.date) && election.date <= govDue && election.date <= delayDue) {
      const date = currentDate(state) > election.date ? currentDate(state) : election.date;
      stepChallenge(state,date,false); state.cursorDate = date;
      if (!state.flags.onePartyState && !state.elections.some(e => e.date.slice(0,7) === date.slice(0,7))) {
        runElection(state,rng,{ ...election, date });
      }
      state.electionSchedule = state.electionSchedule!.filter(e => e.date.slice(0,7) !== election.date.slice(0,7));
      delete state.flags.reichstagDissolved;
      continue;
    }
    const delayed = state.delayedEffects.filter(d => d.triggerDate.slice(0,7) <= state.date.slice(0,7)).sort((a,b) => a.triggerDate.localeCompare(b.triggerDate))[0];
    if (delayed && (!next || delayed.triggerDate <= next.date)) {
      const date = currentDate(state) > delayed.triggerDate ? currentDate(state) : delayed.triggerDate;
      stepChallenge(state, date, false);
      state.cursorDate = date;
      settleDelayed(state);
      continue;
    }
    const govId = state.flags.pendingGovernmentId, govDate = state.flags.pendingGovernmentDate;
    if (typeof govId === 'string' && typeof govDate === 'string' && (!next || govDate <= next.date)) {
      delete state.flags.pendingGovernmentId; delete state.flags.pendingGovernmentDate;
      if (state.meta.mode === 'historical' && state.meta.divergence === 0 && !state.flags.playerGovernment) {
        state.cursorDate = currentDate(state) > govDate ? currentDate(state) : govDate;
        installHistoricalGovernment(state, govId);
      }
      continue;
    }
    if (!next) { closeMonth(state); return; }
    const date = next.trigger.type === 'historical_date' ? next.date : state.date;
    const nextDate = currentDate(state) > date ? currentDate(state) : date;
    stepChallenge(state, nextDate, false);
    state.cursorDate = nextDate;
    state.evaluatedEvents ??= {};
    state.evaluatedEvents[next.id] = state.date.slice(0, 7);
    if (!rollConditional(state, rng, next)) continue;
    state.pendingEvent = { eventId: next.id, choices: next.choices.map(c => c.id), openedAt: nextDate };
    return;
  }
  throw new Error('事件队列未收敛');
}

function closeMonth(state: GameState) {
  const [year, month] = state.date.split('-').map(Number);
  const end = state.date.slice(0, 7) + '-' + new Date(year, month, 0).getDate();
  state.cursorDate = end;
  stepChallenge(state, end, true);
  enforceInstitutions(state);
  if (state.snapshots[state.snapshots.length - 1]?.date === state.date) state.snapshots[state.snapshots.length - 1] = makeSnapshot(state);
  const ending = checkImmediateEnding(state);
  if (ending || state.date.slice(0, 7) === SIM_END.slice(0, 7)) {
    state.meta.ended = true;
    state.meta.ending = ending ?? determineEnding(state);
    state.meta.endingTitle = '模拟结束：1934年8月';
    state.date = end;
  }
}

export function resolvePending(state: GameState, choiceId: string, rng: RNG): string[] {
  if (!state.pendingEvent || state.meta.ended) return [];
  const { eventId } = state.pendingEvent;
  const res = applyChoice(state, eventId, choiceId, rng);
  // 非法选项/重复提交：保留事件弹窗，不改变状态（WMR-022）
  if (!res.ok) return res.messages;
  state.pendingEvent = null;
  stepChallenge(state, currentDate(state), false);
  openNextEvent(state, rng);
  return res.messages;
}

export function skipPending(state: GameState, rng: RNG): string[] {
  if (!state.pendingEvent || state.meta.ended) return [];
  const { eventId } = state.pendingEvent;
  autoResolve(state, eventId, rng);
  state.pendingEvent = null;
  stepChallenge(state, currentDate(state), false);
  openNextEvent(state, rng);
  return ['已选择暂不干预，系统按史实路径处理。'];
}

function makeSnapshot(state: GameState): Snapshot {
  const parties: Record<string, number> = {};
  for (const [pid, ps] of Object.entries(state.parties)) parties[pid] = ps.support;
  return {
    date: state.date,
    economy: { ...state.economy },
    society: { ...state.society },
    institutions: { ...state.institutions },
    diplomacy: { ...state.diplomacy },
    parties,
    governmentId: state.government.id,
    chancellorId: state.government.chancellorId,
  };
}

function generateNews(state: GameState, econ: { note: string }): MonthlyNews {
  const prev = state.snapshots[state.snapshots.length - 1];
  const tags: string[] = [];
  let headline = '';
  let body = '';

  const dU = prev ? state.economy.unemployment - (prev.economy.unemployment ?? state.economy.unemployment) : 0;
  const dSat = prev ? state.society.satisfaction - (prev.society.satisfaction ?? state.society.satisfaction) : 0;
  const dViol = prev ? state.society.violence - (prev.society.violence ?? state.society.violence) : 0;

  if (state.economy.inflation > 100) {
    headline = '物价再度失控，货币购买力急剧下降';
    body = `通胀年化 ${state.economy.inflation.toFixed(0)}%，储蓄与工资的实际价值持续缩水。`;
    tags.push('经济');
  } else if (dU > 0.6) {
    headline = '失业人数继续上升，救济机构承压';
    body = `失业率升至 ${state.economy.unemployment.toFixed(1)}%。${econ.note}`;
    tags.push('就业');
  } else if (dViol > 2) {
    headline = '街头冲突加剧，警方在多个城市增派警力';
    body = `政治暴力指数升至 ${state.society.violence.toFixed(0)}。执法中立性受到质疑。`;
    tags.push('治安');
  } else if (dSat > 1.5) {
    headline = '经济指标改善，公众情绪回暖';
    body = `生活满意度升至 ${state.society.satisfaction.toFixed(0)}，工业生产指数 ${state.economy.output.toFixed(0)}。`;
    tags.push('社会');
  } else if (state.institutions.emergencyDependence > 55) {
    headline = '政府再度援引第48条，国会表达不满';
    body = `紧急法令依赖度 ${state.institutions.emergencyDependence.toFixed(0)}，议会权威 ${state.institutions.parliamentAuthority.toFixed(0)}。`;
    tags.push('制度');
  } else {
    headline = `${formatDate(state.date)}：政局在平静中推进`;
    body = `${PHASE_LABELS[state.phase]}。执政联盟：${state.government.parties.map((p) => partyMap.get(p)?.short_name).join('、') || '无党派'}。`;
    tags.push('综合');
  }

  return { date: state.date, headline, body, tags };
}

function checkImmediateEnding(state: GameState): string | null {
  // 席位过半本身不终止模拟，仍须处理实际制度变化。
  // 1934-08-02 的兴登堡去世与军队宣誓事件完成后，才判定“独裁巩固”（WMR-014）
  if (
    currentDate(state) >= '1934-08-02' && state.flags.officesMerged && state.flags.personalArmyOath && state.flags.onePartyState &&
    state.government.chancellorId === 'person_hitler' &&
    state.firedEvents.includes('ev_hindenburg_death') &&
    state.firedEvents.includes('ev_army_oath')
  ) {
    return 'nazi_consolidation';
  }
  return null;
}

export function governmentDays(state: GameState): number {
  return monthsInOffice(state.government.startDate, state.date) * 30;
}

export { clamp };
