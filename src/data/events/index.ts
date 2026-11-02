import type { HistoricalEvent } from '../types';
import { eventsRevolution } from './revolution';
import { eventsEarly } from './early';
import { events1923 } from './crisis1923';
import { eventsStable } from './stable';
import { eventsCrisis } from './crisis1930';
import { eventsPresidential } from './presidential';
import { eventsEnd } from './end';
import { eventsRandom } from './random';
import { extraChoicesEarly } from './extraChoicesEarly';
import { extraChoicesMiddle } from './extraChoicesMiddle';
import { extraChoicesLate } from './extraChoicesLate';
import { extraChoicesEnd } from './extraChoicesEnd';
import { applyConditions } from './conditions';
import { withConsequences, consequenceEvents } from './consequences';

/** 补充选项：保证每个事件至少有三个可选方案 */
export const extraChoices = {
  ...extraChoicesEarly,
  ...extraChoicesMiddle,
  ...extraChoicesLate,
  ...extraChoicesEnd,
};

const rawEvents: HistoricalEvent[] = [
  ...eventsRevolution,
  ...eventsEarly,
  ...events1923,
  ...eventsStable,
  ...eventsCrisis,
  ...eventsPresidential,
  ...eventsEnd,
  ...eventsRandom,
  ...consequenceEvents,
];

function withExtraChoices(e: HistoricalEvent): HistoricalEvent {
  const extra = extraChoices[e.id] ?? [];
  const existing = new Set(e.choices.map((c) => c.id));
  const additions = extra.filter((c) => !existing.has(c.id));
  const merged = [...e.choices, ...additions];
  // 史实选项始终排在第一位，保证“选第一项 = 走史实路径”这一直觉成立
  if (e.historical_choice_id) {
    const i = merged.findIndex((c) => c.id === e.historical_choice_id);
    if (i > 0) merged.unshift(merged.splice(i, 1)[0]);
  }
  return { ...e, choices: merged };
}

/**
 * WMR-015：事件元数据一致性。
 * 只要事件提供了会改变状态的非史实选项，就必须标记为允许反事实；
 * 否则界面会宣称“选项仅影响叙述”，而实际状态被改变。
 */
function reconcileCounterfactual(e: HistoricalEvent): HistoricalEvent {
  if (e.allows_counterfactual !== false) return e;
  const histId = e.historical_choice_id ?? e.choices[0]?.id;
  const hasChanging = e.choices.some((c) => {
    if (c.id === histId) return false;
    const eff = c.effects;
    return (
      (eff.vars && Object.keys(eff.vars).length > 0) ||
      (eff.set && Object.keys(eff.set).length > 0) ||
      (eff.flags && Object.keys(eff.flags).length > 0) ||
      !!eff.structure ||
      !!eff.policy_id ||
      (eff.delayed && eff.delayed.length > 0) ||
      !!eff.action
    );
  });
  return hasChanging ? { ...e, allows_counterfactual: true } : e;
}

export const events: HistoricalEvent[] = applyConditions(
  rawEvents.map(withExtraChoices).map(withConsequences).map(reconcileCounterfactual)
).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export const eventMap = new Map(events.map((e) => [e.id, e]));

export const eventsByDate = new Map<string, HistoricalEvent[]>();
for (const e of events) {
  const list = eventsByDate.get(e.date) ?? [];
  list.push(e);
  eventsByDate.set(e.date, list);
}

export const eventCount = events.length;

const thin = events.filter((e) => e.choices.length < 3);
if (thin.length > 0) {
  console.warn('[data] 以下事件选项少于 3 个：', thin.map((e) => e.id).join(', '));
}
