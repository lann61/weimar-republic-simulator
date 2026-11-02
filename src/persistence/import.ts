import type { GameState } from '../simulation/types';
import { buildInitialState } from '../simulation/engine/state';
import { eventMap } from '../data/events';
import { scenarioMap } from '../data/scenarios';
import { migrateState } from './migrate';

/** 先验证再迁移，解析失败不会替换正在进行的游戏。 */
export function parseSave(text: string): GameState {
  if (text.length > 10_000_000) throw new Error('存档超过 10 MB');
  const envelope = JSON.parse(text);
  if (envelope?.format !== 'weimar-save-v1') throw new Error('不支持的存档格式');
  const s = envelope.state as GameState;
  if (!s?.meta || !scenarioMap.has(s.meta.scenarioId)) throw new Error('存档场景无效');
  const validDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
  if (!validDate(s.date) || s.date < '1918-11-01' || s.date > '1934-09-30' || !validDate(s.meta.startDate)) throw new Error('存档日期无效');
  if (!Number.isSafeInteger(s.meta.seed) || !Number.isSafeInteger(s.meta.rngCalls) || s.meta.rngCalls < 0 || s.meta.rngCalls > 2_000_000) throw new Error('随机数状态无效');
  if (!['historical','intervention','free','challenge'].includes(s.meta.mode) || typeof s.meta.ended !== 'boolean') throw new Error('游戏模式无效');
  const base = buildInitialState(s.meta.scenarioId, s.meta.seed);
  for (const section of ['economy','society','institutions','diplomacy','stats'] as const) {
    for (const key of Object.keys(base[section])) if (!Number.isFinite((s[section] as unknown as Record<string,number>)?.[key])) throw new Error(`存档缺少有效指标：${section}.${key}`);
  }
  for (const key of ['elections','governmentHistory','article48','activePolicies','delayedEffects','firedEvents','decisions','log','snapshots','news'] as const) if (!Array.isArray(s[key])) throw new Error(`存档缺少列表：${key}`);
  for (const id of Object.keys(base.parties)) {
    const party = s.parties?.[id];
    if (!party || !Number.isFinite(party.seats) || !Number.isFinite(party.support) || typeof party.banned !== 'boolean') throw new Error('政党状态无效');
  }
  if (!s.government || !Array.isArray(s.government.parties) || !Array.isArray(s.government.supportParties) || !Array.isArray(s.government.members) || !Number.isFinite(s.parliamentSeatsTotal) || !s.voterGroups) throw new Error('政府或议会状态无效');
  for (const [id,g] of Object.entries(base.voterGroups)) {
    const actual = s.voterGroups[id];
    if (!actual || !actual.affinity || !actual.tilt) throw new Error('选民群体状态无效');
    for (const key of ['satisfaction','trust','republicSupport','economicOutlook','turnout','alienation'] as const) if (!Number.isFinite(actual[key])) throw new Error('选民群体指标无效');
    for (const party of Object.keys(g.affinity)) if (!Number.isFinite(actual.affinity[party]) || !Number.isFinite(actual.tilt[party])) throw new Error('党派亲和度无效');
  }
  const varsValid = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([path,value]) => /^(economy|society|institutions|diplomacy)\.[A-Za-z]+$/.test(path) && typeof value === 'number' && Number.isFinite(value));
  for (const d of s.delayedEffects) if (!d || !validDate(d.triggerDate) || !varsValid(d.vars)) throw new Error('延迟效果无效');
  for (const m of s.decisionMemory ?? []) if (!m || !validDate(m.date) || !validDate(m.expires) || !varsValid(m.monthly)) throw new Error('决策记忆无效');
  if (s.worldEvents) {
    const w=s.worldEvents;
    const effectsValid=(v:unknown)=>varsValid(v)&&Object.keys(v as object).every(path=>{
      const [section,key]=path.split('.');
      return Object.prototype.hasOwnProperty.call(base[section as 'economy'],key);
    });
    if (!validDate(w.nextDate)||!Number.isSafeInteger(w.rngCalls)||w.rngCalls<0||w.rngCalls>100000||!Array.isArray(w.records)||w.records.length>500||
      (w.lastProcessedMonth!==undefined&&!/^\d{4}-\d{2}$/.test(w.lastProcessedMonth))) throw new Error('局势事件日程无效');
    for (const r of w.records) if (!r||!validDate(r.date)||!['international','economic','political','popular','social'].includes(r.category)||
      !['id','templateId','title','description','transmission','context'].every(key=>typeof r[key as 'title']==='string')||typeof r.favorable!=='boolean'||
      !Number.isFinite(r.intensity)||r.intensity<=0||r.intensity>3||!Number.isInteger(r.duration)||r.duration<1||r.duration>12||
      !Number.isInteger(r.remaining)||r.remaining<0||r.remaining>r.duration||!effectsValid(r.monthly)||!effectsValid(r.cumulative)) throw new Error('局势事件记录无效');
  }
  for (const d of s.decisions) if (!d || !eventMap.has(d.eventId) || !eventMap.get(d.eventId)!.choices.some(c => c.id === d.choiceId) || !validDate(d.date)) throw new Error('决策记录无效');
  for (const p of s.activePolicies) if (!p || typeof p.policyId !== 'string' || !Number.isFinite(p.monthsLeft) || !validDate(p.startDate)) throw new Error('政策记录无效');
  if (s.electionSchedule && (!Array.isArray(s.electionSchedule) || s.electionSchedule.some(e => !e || !validDate(e.date)))) throw new Error('选举日程无效');
  if (s.cursorDate && !validDate(s.cursorDate)) throw new Error('事件日期无效');
  if (s.pendingEvent && (!eventMap.has(s.pendingEvent.eventId) || !Array.isArray(s.pendingEvent.choices))) throw new Error('待处理事件无效');
  // 禁止原型键；并检查深层结构中的无效数值与过深嵌套。
  const inspect = (obj: unknown, depth = 0): void => {
    if (depth > 25) throw new Error('存档嵌套过深');
    if (typeof obj === 'number' && !Number.isFinite(obj)) throw new Error('存档包含无效数值');
    if (obj && typeof obj === 'object') for (const [k,v] of Object.entries(obj)) {
      if (['__proto__','constructor','prototype'].includes(k)) throw new Error('存档包含不允许的字段');
      inspect(v, depth + 1);
    }
  };
  inspect(s);
  return migrateState(s);
}
