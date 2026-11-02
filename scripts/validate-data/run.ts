/**
 * V2.1 历史数据校验器（WMR-021）
 * 用法：npm run validate:data
 * 输出：结构化错误/警告；存在阻断性错误时退出码 1，仅有警告时退出码 0。
 */
import { parties } from '../../src/data/parties';
import { people } from '../../src/data/people';
import { governments } from '../../src/data/governments';
import { elections } from '../../src/data/elections';
import { events } from '../../src/data/events';
import { scenarios } from '../../src/data/scenarios';
import { sources } from '../../src/data/sources';

// 本项目未安装 @types/node；这里只声明校验器用到的 process.exit
declare const process: { exit(code?: number): never };

type Level = 'error' | 'warning';
interface Issue {
  level: Level;
  record: string;
  field: string;
  message: string;
}

const issues: Issue[] = [];
const err = (record: string, field: string, message: string) => issues.push({ level: 'error', record, field, message });
const warn = (record: string, field: string, message: string) => issues.push({ level: 'warning', record, field, message });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_ONLY = /^\d{4}$/;
const isDate = (d: string | null | undefined): boolean => {
  if (!d) return false;
  // 允许仅年份（史料无法确证到日），这是项目既定的数据质量约定
  if (YEAR_ONLY.test(d)) return true;
  return ISO.test(d) && !Number.isNaN(new Date(d).getTime());
};
const inRange = (d: string, from: string | null, to: string | null): boolean =>
  (!from || d >= from) && (!to || d <= to);

const partyIds = new Set(parties.map((p) => p.id));
const personIds = new Set(people.map((p) => p.id));
const sourceIds = new Set(sources.map((s) => s.id));
const eventIds = new Set(events.map((e) => e.id));

// ── 政党 ────────────────────────────────────────────────
const seenParties = new Set<string>();
for (const p of parties) {
  if (seenParties.has(p.id)) err(p.id, 'id', '政党 ID 重复');
  seenParties.add(p.id);
  if (!isDate(p.active_from)) err(p.id, 'active_from', `非法日期 ${p.active_from}`);
  if (p.active_to && !isDate(p.active_to)) err(p.id, 'active_to', `非法日期 ${p.active_to}`);
  if (p.active_to && p.active_to < p.active_from) err(p.id, 'active_to', '结束日期早于成立日期');
  for (const q of [...p.coalition_preferences, ...p.red_lines]) {
    if (!partyIds.has(q)) err(p.id, 'coalition_preferences/red_lines', `引用不存在的政党 ${q}`);
  }
  if (p.source_ids.length === 0) warn(p.id, 'source_ids', '缺少来源');
}

// ── 人物 ────────────────────────────────────────────────
const seenPeople = new Set<string>();
let unknownMembershipDates = 0;
for (const p of people) {
  if (seenPeople.has(p.id)) err(p.id, 'id', '人物 ID 重复');
  seenPeople.add(p.id);
  if (!isDate(p.birth_date)) err(p.id, 'birth_date', `非法出生日期 ${p.birth_date}`);
  if (!isDate(p.death_date)) err(p.id, 'death_date', `非法死亡日期 ${p.death_date}`);
  if (p.birth_date > p.death_date) err(p.id, 'birth_date', '出生日期晚于死亡日期');
  if (p.source_ids.length === 0) err(p.id, 'source_ids', '人物记录缺少来源');
  for (const m of p.party_memberships) {
    if (m.party_id && !partyIds.has(m.party_id)) err(p.id, 'party_memberships.party_id', `引用不存在的政党 ${m.party_id}`);
    // WMR-011：from 为 null 表示“日期未核实”，不是错误
    if (!m.from) {
      unknownMembershipDates++;
    } else {
      if (!isDate(m.from)) err(p.id, 'party_memberships.from', `非法日期 ${m.from}`);
      if (m.to && m.from > m.to) err(p.id, 'party_memberships', '党籍开始晚于结束');
      if (m.from < p.birth_date) err(p.id, 'party_memberships.from', '党籍早于出生日期');
    }
    if (m.to && !isDate(m.to)) err(p.id, 'party_memberships.to', `非法日期 ${m.to}`);
    if (m.to && m.to > p.death_date) err(p.id, 'party_memberships.to', '党籍晚于死亡日期');
  }
}

// ── 政府 ────────────────────────────────────────────────
const seenGovs = new Set<string>();
for (const g of governments) {
  if (seenGovs.has(g.id)) err(g.id, 'id', '政府 ID 重复');
  seenGovs.add(g.id);
  if (!isDate(g.from)) err(g.id, 'from', `非法日期 ${g.from}`);
  if (g.to && !isDate(g.to)) err(g.id, 'to', `非法日期 ${g.to}`);
  if (g.to && g.to < g.from) err(g.id, 'to', '结束日期早于成立日期');
  if (!personIds.has(g.chancellor_id)) err(g.id, 'chancellor_id', `引用不存在的人物 ${g.chancellor_id}`);
  for (const pid of g.parties) if (!partyIds.has(pid)) err(g.id, 'parties', `引用不存在的政党 ${pid}`);
  for (const m of g.members) {
    if (!personIds.has(m.person_id)) err(g.id, 'members.person_id', `引用不存在的人物 ${m.person_id}`);
    if (m.party_id && !partyIds.has(m.party_id)) err(g.id, 'members.party_id', `引用不存在的政党 ${m.party_id}`);
    if (!isDate(m.from)) err(g.id, 'members.from', `非法日期 ${m.from}`);
    if (m.to && !isDate(m.to)) err(g.id, 'members.to', `非法日期 ${m.to}`);
  }
  if (g.source_ids.length === 0) warn(g.id, 'source_ids', '缺少来源');
}

// 政府任期重叠：同一总理在同一时间出现两届政府
const govsByChancellor = new Map<string, typeof governments>();
for (const g of governments) {
  const list = govsByChancellor.get(g.chancellor_id) ?? [];
  list.push(g);
  govsByChancellor.set(g.chancellor_id, list);
}
for (const [cid, list] of govsByChancellor) {
  const sorted = [...list].sort((a, b) => (a.from < b.from ? -1 : 1));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    if (prev.to && sorted[i].from < prev.to) {
      err(cid, 'government.term', `政府任期重叠：${prev.id} 与 ${sorted[i].id}`);
    }
  }
}

// ── 选举 ────────────────────────────────────────────────
const seenElections = new Set<string>();
for (const e of elections) {
  if (seenElections.has(e.id)) err(e.id, 'id', '选举 ID 重复');
  seenElections.add(e.id);
  if (!isDate(e.date)) err(e.id, 'date', `非法日期 ${e.date}`);
  if (e.type === 'presidential' || e.type === 'referendum') continue;
  const seatSum = e.results.reduce((a, r) => a + r.seats, 0) + (e.other_seats ?? 0);
  if (seatSum !== e.total_seats) {
    err(e.id, 'total_seats', `席位合计 ${seatSum} ≠ 总席位 ${e.total_seats}（含 other_seats ${e.other_seats ?? 0}）`);
  }
  const shareSum = e.results.reduce((a, r) => a + r.vote_share, 0) + (e.other_vote_share ?? 0);
  if (shareSum < 95 || shareSum > 103) warn(e.id, 'vote_share', `得票率合计 ${shareSum.toFixed(1)}% 偏离 100%`);
  for (const r of e.results) {
    if (!partyIds.has(r.party_id)) err(e.id, 'results.party_id', `引用不存在的政党 ${r.party_id}`);
    if (e.valid_votes && r.votes != null && r.votes > e.valid_votes) {
      err(e.id, 'results.votes', `${r.party_id} 票数 ${r.votes} 超过有效票 ${e.valid_votes}`);
    }
  }
  if (e.source_ids.length === 0) warn(e.id, 'source_ids', '缺少来源');
}

// ── 事件 ────────────────────────────────────────────────
const seenEvents = new Set<string>();
for (const ev of events) {
  if (seenEvents.has(ev.id)) err(ev.id, 'id', '事件 ID 重复');
  seenEvents.add(ev.id);
  if (!isDate(ev.date)) err(ev.id, 'date', `非法日期 ${ev.date}`);
  for (const pid of ev.participants) {
    if (!personIds.has(pid)) err(ev.id, 'participants', `引用不存在的人物 ${pid}`);
  }
  for (const sid of ev.source_ids) {
    if (!sourceIds.has(sid)) err(ev.id, 'source_ids', `引用不存在的来源 ${sid}`);
  }
  if (ev.trigger.requires_events) {
    for (const rid of ev.trigger.requires_events) {
      if (!eventIds.has(rid)) err(ev.id, 'requires_events', `引用不存在的事件 ${rid}`);
      else if (events.find(e => e.id === rid)!.date > ev.date) err(ev.id, 'requires_events', `前置事件 ${rid} 的日期晚于本事件`);
    }
  }
  const choiceIds = new Set<string>();
  for (const ch of ev.choices) {
    if (choiceIds.has(ch.id)) err(ev.id, 'choices', `选项 ID 重复 ${ch.id}`);
    choiceIds.add(ch.id);
  }
  if (ev.historical_choice_id && !choiceIds.has(ev.historical_choice_id)) {
    err(ev.id, 'historical_choice_id', `史实选项 ${ev.historical_choice_id} 不在 choices 中`);
  }
  if (ev.choices.length < 1) err(ev.id, 'choices', '事件没有任何选项');
}

// ── 场景 ────────────────────────────────────────────────
for (const s of scenarios) {
  if (!isDate(s.start_date)) err(s.id, 'start_date', `非法日期 ${s.start_date}`);
  for (const sid of s.source_ids) {
    if (!sourceIds.has(sid)) err(s.id, 'source_ids', `引用不存在的来源 ${sid}`);
  }
}

// ── 汇总 ────────────────────────────────────────────────
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

console.log('════════ V2.1 历史数据校验 ════════');
console.log(`政党 ${parties.length} · 人物 ${people.length} · 政府 ${governments.length} · 选举 ${elections.length} · 事件 ${events.length} · 场景 ${scenarios.length}`);
console.log(`错误 ${errors.length} · 警告 ${warnings.length}`);
console.log(`党籍起始日期未核实（null，不伪造）：${unknownMembershipDates} 条`);
for (const i of issues.slice(0, 200)) {
  console.log(`[${i.level.toUpperCase()}] ${i.record} :: ${i.field} :: ${i.message}`);
}
if (issues.length > 200) console.log(`…… 其余 ${issues.length - 200} 条省略`);
console.log(errors.length === 0 ? '结果：PASS（无阻断性错误）' : '结果：FAIL（存在阻断性错误）');

process.exit(errors.length === 0 ? 0 : 1);
