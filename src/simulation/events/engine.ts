import { recordStrategy } from './strategy';
import { events, eventMap } from '../../data/events';
import { policyMap } from '../../data/policies';
import { partyMap } from '../../data/parties';
import { personMap } from '../../data/people';
import type { HistoricalEvent, EventChoice, StructuralEffect } from '../../data/types';
import type { GameState, GovernmentState } from '../types';
import type { RNG } from '../engine/random';
import { clamp } from '../engine/random';
import { addPath, defaultBoundsFor, getPath } from '../engine/state';
import { addMonths, monthIndex } from '../engine/date';
import { installHistoricalGovernment, anchorWeight } from '../elections/run';
import { buildSimulatedCabinet } from '../elections/coalition';
import { adaptChoiceEffects, adaptEventText } from './adapter';
import { currentDate, changeVars, issueEmergencyDecree, prohibitParty, reconcileParliament, enforceInstitutions, enactPolicy } from '../politics/rules';
import { replaceGovernment } from '../elections/run';

const IMPORTANCE_ORDER: Record<string, number> = { critical: 0, major: 1, minor: 2 };

/**
 * 非共和制下不应发生的共和国制度事件（WMR-028）：
 * 国民议会/制宪、历次国会选举、总统选举与继任、国会纵火与授权法。
 * 君主制/苏维埃/威权路径不应看到这些事件，否则会出现“没有选举却有选举事件”的矛盾。
 */
const REPUBLIC_ONLY_EVENTS = new Set([
  'ev_election_1919',
  'ev_weimar_assembly',
  'ev_weimar_constitution',
  'ev_election_1920',
  'ev_election_1924_05',
  'ev_election_1924_12',
  'ev_election_1928',
  'ev_election_1930',
  'ev_election_1932_07',
  'ev_election_1932_11',
  'ev_election_1933',
  'ev_ebert_death',
  'ev_presidential_1925',
  'ev_hindenburg_elected',
  'ev_presidential_1932_first',
  'ev_presidential_1932_second',
  'ev_elite_bargain',
  'ev_hitler_appointed',
  'ev_reichstag_fire',
  'ev_enabling_act_debate',
  'ev_reichstag_dissolved_1933',
]);

/**
 * 绑定特定历史政府/总理的事件（WMR-028 扩展）：
 * 玩家显著偏离史实后，这些事件按剧本触发会与当前实际政府不符
 * （例如帝制路径总理是马克斯·冯·巴登，却弹出“库诺政府垮台”）。
 * 偏离时不再触发，改由模型的内阁生存/组阁机制处理政府更迭。
 */
const HISTORICAL_GOVERNMENT_EVENTS = new Set([
  'ev_scheidemann_resign',
  'ev_wirth_cabinet',
  'ev_cuno_fall',
  'ev_luther_cabinet',
  'ev_rand_scandal',
  'ev_grand_coalition_1928',
  'ev_mueller_fall',
  'ev_bruening_cabinet',
  'ev_papen_cabinet',
  'ev_schleicher_cabinet',
]);

export function conditionsMet(state: GameState, e: HistoricalEvent): boolean {
  if (e.id === 'ev_mueller_fall' && state.flags.parliamentaryBudgetDeal === 1) return false;
  if (e.id === 'ev_bruening_cabinet' && state.flags.muellerSuccessionApproved === 0) return false;
  if (e.id === 'ev_versailles_signed' && state.flags.treatyAccepted === 0) return false;
  if (['ev_laender_gleichschaltung','ev_civil_service_purge','ev_union_dissolved','ev_parties_banned'].includes(e.id) && state.flags.enablingActPassed !== 1) return false;
  if (e.id === 'ev_enabling_act_debate' && state.flags.civilRightsSuspended === 0) return false;
  if (e.id === 'ev_reichstag_dissolved_1933' && state.flags.hitlerAppointmentAllowed !== 1) return false;
  if (state.meta.mode === 'historical' && state.meta.divergence === 0 && e.trigger.type === 'historical_date') return true;
  const conds = e.trigger.conditions;
  if (!conds || conds.length === 0) return true;
  for (const c of conds) {
    const v = getPath(state, c.path);
    const ok =
      c.op === '>' ? v > c.value : c.op === '<' ? v < c.value : c.op === '>=' ? v >= c.value : c.op === '<=' ? v <= c.value : v === c.value;
    if (!ok) return false;
  }
  return true;
}

export function requiresMet(state: GameState, e: HistoricalEvent, fired: Set<string>): boolean {
  const req = e.trigger.requires_events;
  if (!req || req.length === 0) return true;
  return req.every((id) => fired.has(id));
}

/**
 * 当月到期且可触发的事件。
 * 历史日期事件同样要满足前置条件与事件链，否则该事件“不会发生”——历史由此分叉。
 */
export function dueEvents(state: GameState): HistoricalEvent[] {
  const fired = new Set(state.firedEvents);
  const curMonth = state.date.slice(0, 7);
  const isRepublic = String(state.flags.regime ?? 'republic') === 'republic';
  // 只有玩家显著偏离史实时，才过滤共和国专属事件；
  // 史实路径在 1933 年转入威权后仍需继续国会纵火/授权法等事件。
  const historicalPath = anchorWeight(state) > 0.55;

  const postponed = state.flags.electionPostponedUntil;
  const adjusted = typeof postponed === 'string' ? events.map(e => {
    if (e.date.startsWith('1933-03') && e.trigger.type === 'historical_date') {
      return { ...e, date: e.category === 'election' ? postponed : postponed.slice(0,7) + e.date.slice(7) };
    }
    return e;
  }) : events;
  return adjusted
    .filter((e) => {
      if (fired.has(e.id) && !(e.id === 'ev_alternative_cabinet' && state.flags.cabinetReviewDue === 1)) return false;
      if (state.evaluatedEvents?.[e.id] === curMonth && e.trigger.type !== 'historical_date') return false;
      if (!isRepublic && !historicalPath && REPUBLIC_ONLY_EVENTS.has(e.id)) return false;
      // 通用政府危机版本继续保留因果链。
      if (!requiresMet(state, e, fired)) return false;
      if (!conditionsMet(state, e)) return false;
      if (e.trigger.type === 'historical_date') return e.date.slice(0, 7) === curMonth;
      if (monthIndex(e.date) > monthIndex(state.date)) return false;
      return true;
    })
    // 先按日期、再按重要性：同月内的事件按时间顺序结算，事件链（前置 → 后续）才不会错序
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]));
}

/** 指定月份内因前置条件不足而未发生的历史事件 */
export function blockedInMonth(state: GameState, month: string): HistoricalEvent[] {
  const fired = new Set(state.firedEvents);
  return events.filter(
    (e) =>
      !fired.has(e.id) &&
      e.trigger.type === 'historical_date' &&
      e.date.slice(0, 7) === month &&
      (!conditionsMet(state, e) || !requiresMet(state, e, fired))
  );
}

export function blockedThisMonth(state: GameState): HistoricalEvent[] {
  return blockedInMonth(state, state.date.slice(0, 7));
}

/** 条件事件需要掷骰：在判定通过后才标记为“可触发” */
export function rollConditional(state: GameState, rng: RNG, ev: HistoricalEvent): boolean {
  if (ev.trigger.type === 'historical_date') return true;
  const p = ev.trigger.probability ?? 0.5;
  return rng.chance(p);
}

export interface ApplyResult {
  messages: string[];
  diverged: boolean;
  /** 是否成功应用（非法 choiceId / 事件不存在 / 已处理时为 false，state 不变） */
  ok: boolean;
}

const REGIME_LABELS: Record<string, string> = {
  republic: '共和制',
  constitutional_monarchy: '君主立宪制',
  council_republic: '苏维埃共和制',
  authoritarian: '威权体制',
};

/**
 * 应用结构性影响：让玩家选择直接改变政权、国家元首与政府构成。
 * 这是“选择影响历史走向”的核心通道——此前的选项只能修改数值变量，
 * 无法改变政府类型或国家元首，导致“保留君主制”后仍是议会共和国。
 */
function applyStructuralEffect(
  state: GameState,
  s: StructuralEffect,
  event: HistoricalEvent,
  messages: string[]
) {
  if (!s.installGovernmentId && ((s.chancellorId && s.chancellorId !== state.government.chancellorId) ||
      (event.id === 'ev_november_revolution' && s.regime !== 'republic'))) {
    state.government.endDate = currentDate(state);
    appointChancellor(state, s.chancellorId ?? state.government.chancellorId, undefined, event.title);
  }
  if (s.regime) {
    state.flags.regime = s.regime;
    // 数值化的政权标记，供事件条件使用（getPath 只读取数字）
    state.flags.republicanRegime = s.regime === 'republic' ? 1 : 0;
    // 回到共和制时清除君主/苏维埃的国家元首覆写，让 headOfState() 回落到总统逻辑
    if (s.regime === 'republic') {
      delete state.flags.headOfStateId;
      delete state.flags.headOfStateTitle;
      delete state.flags.headOfStateSince;
    }
  }
  if (s.headOfStateId) state.flags.headOfStateId = s.headOfStateId;
  if (s.headOfStateTitle) state.flags.headOfStateTitle = s.headOfStateTitle;
  if (s.headOfStateSince) state.flags.headOfStateSince = s.headOfStateSince;
  if (s.presidentId) {
    state.presidentId = s.presidentId;
    state.presidentSince = s.headOfStateSince ?? currentDate(state);
    delete state.flags.presidentVacant;
  }

  // 直接安装史实内阁（优先）
  if (s.installGovernmentId) {
    installHistoricalGovernment(state, s.installGovernmentId);
    if (s.governmentType) state.government.type = s.governmentType;
    if (s.governmentName) state.government.name_zh = s.governmentName;
  } else {
    const gov = state.government;
    if (s.chancellorId) gov.chancellorId = s.chancellorId;
    if (s.rulingParties) {
      gov.parties = [...s.rulingParties];
      for (const p of Object.values(state.parties)) p.inGovernment = false;
      for (const pid of gov.parties) if (state.parties[pid]) state.parties[pid].inGovernment = true;
    }
    if (s.supportParties) {
      gov.supportParties = [...s.supportParties];
      for (const p of Object.values(state.parties)) p.supportsGovernment = false;
      for (const pid of gov.supportParties) if (state.parties[pid]) state.parties[pid].supportsGovernment = true;
    }
    if (s.governmentType) gov.type = s.governmentType;
    if (s.governmentName) gov.name_zh = s.governmentName;

    // 总理或执政党发生变化时，重建内阁名单以保持名单与政府构成一致
    if (s.chancellorId || s.rulingParties) {
      gov.members = buildSimulatedCabinet(
        gov.parties.length ? gov.parties : ['zentrum'],
        gov.chancellorId,
        state.date
      );
    }
  }

  const regimeLabel = REGIME_LABELS[String(state.flags.regime ?? 'republic')] ?? '';
  const note = s.note ?? `政治结构改变：${regimeLabel}${s.governmentName ? `，${s.governmentName}` : ''}。`;
  messages.push(note);

  // 同步当前政府在政府史中的记录，避免“政府更迭史”仍显示旧名称/旧类型
  let histIdx = -1;
  for (let i = state.governmentHistory.length - 1; i >= 0; i--) {
    if (state.governmentHistory[i].id === state.government.id) {
      histIdx = i;
      break;
    }
  }
  if (histIdx >= 0) {
    state.governmentHistory[histIdx] = {
      ...state.governmentHistory[histIdx],
      type: state.government.type,
      name_zh: state.government.name_zh,
      parties: [...state.government.parties],
      chancellorId: state.government.chancellorId,
      members: state.government.members.map((m) => ({ ...m })),
    };
  }

  state.log.push({
    id: `log_struct_${event.id}_${state.date}`,
    date: currentDate(state),
    type: 'institution',
    title: `政治结构改变：${event.title}`,
    detail: note,
    importance: 'critical',
  });
}

/**
 * 总理更替事务（WMR-023）：关闭旧政府、写入政府史、同步统计与日志。
 * 若指定 governmentId，则安装对应史实内阁；若总理未变化，则不重复新建。
 */
export function appointChancellor(
  state: GameState,
  personId: string,
  governmentId?: string,
  note?: string
): GovernmentState {
  if (governmentId) {
    return installHistoricalGovernment(state, governmentId);
  }
  const prev = state.government;
  // 总理未变化：不重复关闭/新建
  if (prev.chancellorId === personId && !prev.endDate) {
    return prev;
  }

  const date = currentDate(state);
  prev.endDate = date;
  prev.endReason = note ?? `总理更替：${personId}`;
  const idx = state.governmentHistory.findIndex((g) => g.id === prev.id && g.endDate === null);
  if (idx >= 0) state.governmentHistory[idx] = { ...prev };

  const gov: GovernmentState = {
    ...prev,
    id: `gov_appointed_${date.replace(/-/g, '')}_${state.governmentHistory.length}`,
    chancellorId: personId,
    startDate: date,
    endDate: null,
    endReason: undefined,
    isHistorical: false,
    isSimulated: true,
  };
  state.government = gov;
  state.governmentHistory.push(gov);
  state.lastGovernmentChange = date;
  state.stats.governmentsFormed++;
  state.log.push({
    id: `log_appoint_${gov.id}`,
    date,
    type: 'government',
    title: '总理更替',
    detail: `${personMap.get(personId)?.name_zh ?? personId} 出任总理${note ? `：${note}` : ''}。`,
    importance: 'critical',
  });
  return gov;
}

export function applyChoice(state: GameState, eventId: string, choiceId: string, rng: RNG): ApplyResult {
  if (state.meta.ended) return { messages: ['模拟已结束，最终状态已冻结'], diverged: false, ok: false };
  const event = eventMap.get(eventId);
  const messages: string[] = [];
  if (!event) return { messages: ['事件不存在'], diverged: false, ok: false };
  // 幂等：同一事件在同一局只能结算一次
  if (state.firedEvents.includes(eventId) && !(eventId === 'ev_alternative_cabinet' && state.pendingEvent?.eventId === eventId && state.flags.cabinetReviewDue === 1)) {
    return { messages: ['该事件已处理，忽略重复提交'], diverged: false, ok: false };
  }

  // 非法 choiceId 不得静默回退到第一项（WMR-022）
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { messages: [`无效的选项：${choiceId}（事件 ${eventId}）`], diverged: false, ok: false };
  }
  // 按当前政局改写选项效果：偏离史实后不安装与当前政府不符的史实内阁（WMR-029）
  const eff = adaptChoiceEffects(state, choice.effects, event);
  const adapted = adaptEventText(state, event);
  const text = adapted.choices.find(c => c.id === choice.id)!;
  const traceLengths = Object.fromEntries(Object.entries(state.metricChanges ?? {}).map(([k,v]) => [k,v.length]));
  const before = Object.fromEntries(['economy','society','institutions','diplomacy'].flatMap(section => Object.entries(state[section as 'economy']).map(([k,v]) => [section + '.' + k, v])));
  const causes = state.decisions.filter(d => event.trigger.requires_events?.includes(d.eventId)).map(d => (d.title ?? d.eventId) + '：' + d.label);

  if (eff.set) {
    for (const [path, value] of Object.entries(eff.set)) {
      const [lo, hi] = defaultBoundsFor(path);
      addPath(state as unknown as Record<string, unknown>, path, clamp(value, lo, hi) - getPath(state, path));
    }
  }
  if (eff.vars) {
    for (const [path, delta] of Object.entries(eff.vars)) {
      const [lo, hi] = defaultBoundsFor(path);
      const next = clamp(getPath(state, path) + delta, lo, hi);
      addPath(state as unknown as Record<string, unknown>, path, next - getPath(state, path));
    }
  }
  if (eventId === 'ev_alternative_cabinet') state.flags.lastCabinetReview = currentDate(state);
  if (eff.flags) {
    for (const [k, v] of Object.entries(eff.flags)) state.flags[k] = v;
  }
  if (eff.structure) {
    applyStructuralEffect(state, eff.structure, event, messages);
  }
  if (eff.policy_id) enactPolicy(state, eff.policy_id);
  if (eff.delayed) {
    for (const d of eff.delayed) {
      state.delayedEffects.push({
        id: `delay_${eventId}_${choiceId}_${d.months}_${state.decisions.length}`,
        triggerDate: addMonths(currentDate(state), d.months),
        flags: d.flags,
        months: d.months,
        vars: d.vars ?? {},
        note: d.note,
        eventId,
      });
    }
  }
  if (eff.action) {
    const a = eff.action;
    switch (a.type) {
      case 'dissolve_reichstag': {
        const electionDate = eventId === 'ev_reichstag_dissolved_1933' ? '1933-03-05' : addMonths(currentDate(state), 2);
        state.flags.dissolutions = Number(state.flags.dissolutions ?? 0) + 1;
        state.flags.reichstagDissolved = true;
        state.electionSchedule = state.electionSchedule ?? [];
        state.electionSchedule.push({
          date: electionDate,
          type: 'reichstag',
          label: '国会选举（解散后）',
          trigger: 'dissolution',
          reason: event.title,
        });
        messages.push(`国会解散，选举定于 ${electionDate}。`);
        break;
      }
      case 'call_election': {
        state.electionSchedule = state.electionSchedule ?? [];
        state.electionSchedule.push({
          date: a.date ?? addMonths(currentDate(state), a.months ?? 2),
          type: 'reichstag',
          label: '国会选举（提前举行）',
          trigger: 'early',
          reason: event.title,
        });
        break;
      }
      case 'article_48': {
        issueEmergencyDecree(state, adapted.title, a.scope, a.months);
        messages.push(`依第48条颁布紧急法令：${a.scope}（预计持续 ${a.months} 个月）。`);
        break;
      }
      case 'ban_party': {
        prohibitParty(state, a.party_id);
        break;
      }
      case 'appoint_chancellor': {
        appointChancellor(state, a.person_id, a.government_id, event.title);
        messages.push(`总理更替：${personMap.get(a.person_id)?.name_zh ?? a.person_id}。`);
        break;
      }
      case 'end_simulation': {
        // 1933 年的权力移交不是模拟终点：1933—1934 的制度拆除过程仍须呈现
        // 最终结局由实际制度状态判定，不由阶段性夺权锁定。
        state.flags.naziSeizure = true;
        if (a.ending === 'democratic_collapse' || a.ending === 'state_disorder') state.meta.ended = true;
        break;
      }
      case 'form_government': {
        if (a.government_id) {
          installHistoricalGovernment(state, a.government_id);
          messages.push(`组建政府：${state.government.name_zh}。`);
        }
        break;
      }
      case 'resign_chancellor':
        replaceGovernment(state, rng, adapted.title);
        break;
    }
  }

  // 偏离度：任何与史实路径不同的选择都会累积偏离（方案 §12.5）
  const historicalId = event.historical_choice_id ?? event.choices[0]?.id;
  const diverged = historicalId ? choice.id !== historicalId : false;
  if (diverged) {
    const base = event.importance === 'critical' ? 0.09 : event.importance === 'major' ? 0.05 : 0.02;
    // 非史实的结构性选择（改政权/国家元首/总理）是重大反事实，额外累加偏离
    const structural =
      eff.structure && (eff.structure.regime || eff.structure.headOfStateId || eff.structure.chancellorId) ? 0.25 : 0;
    state.meta.divergence = clamp(state.meta.divergence + base + structural, 0, 1);
  }

  if (state.flags.kpdMandatesRemoved === 1 && eventId === 'ev_kpd_mandates') prohibitParty(state, 'kpd');
  if (state.flags.onePartyState === 1 && eventId === 'ev_parties_banned') {
    for (const id of Object.keys(state.parties)) if (id !== 'nsdap') prohibitParty(state, id);
    state.parliamentSeatsTotal = state.parties.nsdap?.seats ?? 0;
  }
  if (eff.structure?.chancellorId || eff.structure?.headOfStateId) state.flags.playerGovernment = diverged ? 1 : 0;
  if (diverged && event.category === 'government_crisis') state.flags.playerGovernment = 1;
  if (state.flags.parliamentaryBudgetDeal === 1) state.flags.playerGovernment = 1;
  recordStrategy(state,eff);
  enforceInstitutions(state);
  reconcileParliament(state);
  state.decisionMemory ??= [];
  state.decisionMemory.push({ eventId, choiceId, date: currentDate(state), expires: addMonths(currentDate(state), 12),
    monthly: Object.fromEntries(Object.entries(eff.vars ?? {}).filter(([k]) => /^(institutions|society|diplomacy)\./.test(k)).slice(0, 3).map(([k,v]) => [k, clamp(v * 0.015, -0.12, 0.12)])),
    note: `${adapted.title}：${text.label}` });
  const actual: Record<string, number> = {};
  for (const [path, value] of Object.entries(before)) {
    const delta = getPath(state,path) - value;
    if (delta) actual[path] = delta;
  }
  state.metricChanges ??= {};
  for (const [path,delta] of Object.entries(actual)) {
    const recorded = (state.metricChanges[path] ?? []).slice(traceLengths[path] ?? 0).reduce((n,c) => n + c.delta,0);
    if (Math.abs(delta - recorded) > 1e-9) (state.metricChanges[path] ??= []).push({ source: `${adapted.title}：${text.label}`, delta: delta - recorded });
  }
  state.firedEvents.push(eventId);
  state.decisions.push({ date: currentDate(state), eventId, choiceId: choice.id, label: text.label, title: adapted.title,
    shortTerm: text.short_term, longTerm: text.long_term, effects: actual, causes });
  state.stats.decisionsMade++;
  state.decisionsThisMonth++;

  state.log.push({
    id: `log_dec_${eventId}_${state.date}`,
    date: currentDate(state),
    type: 'decision',
    title: adapted.title,
    causes,
    detail: `决策：${text.label}。短期：${text.short_term} 长期：${text.long_term}${event.data_quality === 'simulation_derived' ? '（模型决策）' : diverged ? '（与史实路径不同）' : '（与史实路径一致）'}`,
    importance: event.importance,
  });

  void rng;
  return { messages, diverged, ok: true };
}

/** 仅在玩家主动委托时按默认选项处理 */
export function autoResolve(state: GameState, eventId: string, rng: RNG): ApplyResult {
  const event = eventMap.get(eventId);
  if (!event) return { messages: [], diverged: false, ok: false };
  const id = event.historical_choice_id ?? event.choices[0].id;
  const res = applyChoice(state, eventId, id, rng);
  if (!res.ok) return res;
  state.decisions[state.decisions.length - 1].automatic = true;
  state.stats.decisionsMade--;
  state.log.push({
    id: `log_auto_${eventId}`,
    date: currentDate(state),
    type: 'event',
    title: `（未干预）${event.title}`,
    detail: `系统按史实路径处理：${event.historical_outcome}`,
    importance: 'minor',
  });
  return res;
}

/** 每月结算延迟影响与政策效果 */
export function settleDelayed(state: GameState) {
  const remaining = [];
  for (const d of state.delayedEffects) {
    if (d.triggerDate <= currentDate(state)) {
      if (d.flags) Object.assign(state.flags, d.flags);
      changeVars(state, d.vars, d.note);
      state.log.push({
        id: `log_delay_${d.id}`,
        date: currentDate(state),
        type: 'economy',
        title: '延迟影响显现',
        detail: d.note,
        importance: 'minor',
      });
    } else {
      remaining.push(d);
    }
  }
  state.delayedEffects = remaining;
}

export function stepDelayed(state: GameState) {
  settleDelayed(state);
  state.decisionMemory = (state.decisionMemory ?? []).filter(m => m.expires >= state.date);
  for (const memory of state.decisionMemory) changeVars(state, memory.monthly, memory.note);
  const stillActive = [];
  for (const ap of state.activePolicies) {
    const pol = policyMap.get(ap.policyId);
    if (pol) {
      changeVars(state, Object.fromEntries(Object.entries(pol.monthly).filter(([path]) => path !== 'economy.deficit')), pol.name_zh);
    }
    ap.monthsLeft--;
    if (ap.monthsLeft > 0) stillActive.push(ap);
  }
  state.activePolicies = stillActive;
}

export function choicePreview(choice: EventChoice): string[] {
  const out: string[] = [];
  if (choice.effects.vars) {
    for (const [k, v] of Object.entries(choice.effects.vars)) {
      if (Math.abs(v) < 0.5) continue;
      out.push(`${k} ${v > 0 ? '+' : ''}${v.toFixed(1)}`);
    }
  }
  return out.slice(0, 6);
}
