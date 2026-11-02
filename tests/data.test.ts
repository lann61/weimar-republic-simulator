import { describe, expect, it } from 'vitest';
import { people, personMap } from '../src/data/people';
import { parties, partyMap } from '../src/data/parties';
import { voterGroups } from '../src/data/voterGroups';
import { elections } from '../src/data/elections';
import { governments } from '../src/data/governments';
import { events } from '../src/data/events';
import { constituencies } from '../src/data/constituencies';
import { buildInitialState } from '../src/simulation/engine/state';
import { VAR_LABELS } from '../src/utils/labels';
import { sources, sourceMap } from '../src/data/sources';

describe('数据完整性（方案 §16 验收 / §27 数据核验）', () => {
  it('人物数量不少于 150 名真实历史人物', () => {
    expect(people.length).toBeGreaterThanOrEqual(150);
    expect(people.every((p) => p.is_historical_person)).toBe(true);
  });

  it('人物 ID 唯一，且中文名不重复建档', () => {
    const ids = new Set(people.map((p) => p.id));
    expect(ids.size).toBe(people.length);
    const names = new Set(people.map((p) => p.name_zh));
    const dup = people.filter((p) => {
      const count = people.filter((x) => x.name_zh === p.name_zh).length;
      return count > 1;
    });
    expect(dup.map((d) => d.name_zh)).toEqual([]);
    expect(names.size).toBeGreaterThan(100);
  });

  it('每个人物都有来源', () => {
    for (const p of people) {
      expect(p.source_ids.length, `${p.name_zh} 缺少来源`).toBeGreaterThan(0);
    }
  });

  it('所有内阁成员引用的都是真实存在的人物', () => {
    const missing: string[] = [];
    for (const g of governments) {
      for (const m of g.members) {
        if (!personMap.has(m.person_id)) missing.push(`${g.id} → ${m.person_id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('所有总理与副总理都存在', () => {
    const missing: string[] = [];
    for (const g of governments) {
      if (!personMap.has(g.chancellor_id)) missing.push(`${g.id} chancellor ${g.chancellor_id}`);
      if (g.vice_chancellor_id && !personMap.has(g.vice_chancellor_id)) missing.push(`${g.id} vice ${g.vice_chancellor_id}`);
    }
    expect(missing).toEqual([]);
  });

  it('所有事件参与者与相关人物存在', () => {
    const missing: string[] = [];
    for (const e of events) {
      for (const pid of e.participants) if (!personMap.has(pid)) missing.push(`${e.id} → ${pid}`);
    }
    expect(missing).toEqual([]);
  });

  it('政党 ID 在选举结果中均有效', () => {
    const missing: string[] = [];
    for (const e of elections) {
      for (const r of e.results) if (!partyMap.has(r.party_id)) missing.push(`${e.id} → ${r.party_id}`);
    }
    expect(missing).toEqual([]);
  });

  it('选举席位合计等于总席位', () => {
    for (const e of elections.filter((x) => x.type !== 'presidential' && x.type !== 'referendum')) {
      const sum = e.results.reduce((a, r) => a + r.seats, 0) + (e.other_seats ?? 0);
      expect(sum, `${e.id} 席位合计 ${sum} ≠ ${e.total_seats}`).toBe(e.total_seats);
    }
  });

  it('选民群体权重合计为 1', () => {
    const total = voterGroups.reduce((a, g) => a + g.weight, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-6);
  });

  it('事件日期唯一且位于 1918—1934 之间', () => {
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size).toBe(events.length);
    for (const e of events) {
      expect(e.date >= '1918-11-01' && e.date <= '1934-08-02', `${e.id} 日期越界`).toBe(true);
      expect(e.choices.length).toBeGreaterThan(0);
    }
  });

  it('事件数量不少于 100', () => {
    expect(events.length).toBeGreaterThanOrEqual(100);
  });

  it('每个事件至少提供 3 个可选方案', () => {
    const thin = events.filter((e) => e.choices.length < 3);
    expect(thin.map((e) => `${e.id}:${e.choices.length}`)).toEqual([]);
  });

  it('史实选项固定排在第一位，保证“选第一项 = 走史实路径”', () => {
    const wrong = events.filter((e) => e.historical_choice_id && e.choices[0].id !== e.historical_choice_id);
    expect(wrong.map((e) => e.id)).toEqual([]);
  });

  it('同一事件内选项 ID 不重复', () => {
    for (const e of events) {
      const ids = e.choices.map((c) => c.id);
      expect(new Set(ids).size, `${e.id} 选项 ID 重复`).toBe(ids.length);
    }
  });

  it('事件效果只写入真实存在的状态字段', () => {
    const probe = buildInitialState('sc_historical', 1) as unknown as Record<string, Record<string, number>>;
    const valid = new Set<string>();
    for (const sec of ['economy', 'society', 'institutions', 'diplomacy']) {
      for (const k of Object.keys(probe[sec])) valid.add(`${sec}.${k}`);
    }
    valid.add('parties.nsdap.seats');

    const bad: string[] = [];
    for (const e of events) {
      for (const c of e.choices) {
        for (const k of Object.keys(c.effects.vars ?? {})) if (!valid.has(k)) bad.push(`${e.id}/${c.id} → ${k}`);
        for (const k of Object.keys(c.effects.set ?? {})) if (!valid.has(k)) bad.push(`${e.id}/${c.id} → ${k}`);
        for (const d of c.effects.delayed ?? []) {
          for (const k of Object.keys(d.vars ?? {})) if (!valid.has(k)) bad.push(`${e.id}/${c.id} → ${k}`);
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('事件效果路径都有中文标签（界面不出现内部变量名）', () => {
    const missing = new Set<string>();
    for (const e of events) {
      for (const c of e.choices) {
        for (const k of Object.keys(c.effects.vars ?? {})) if (!VAR_LABELS[k]) missing.add(k);
        for (const k of Object.keys(c.effects.set ?? {})) if (!VAR_LABELS[k]) missing.add(k);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('事件可以因前置条件不足而不发生（历史可被改变）', () => {
    const withConditions = events.filter((e) => e.trigger.conditions && e.trigger.conditions.length > 0);
    expect(withConditions.length).toBeGreaterThanOrEqual(30);
    const withChain = events.filter((e) => e.trigger.requires_events && e.trigger.requires_events.length > 0);
    expect(withChain.length).toBeGreaterThanOrEqual(20);
  });

  it('所有 source_ids 都能在来源清单中找到', () => {
    const all: string[] = [];
    for (const p of people) all.push(...p.source_ids);
    for (const e of events) all.push(...e.source_ids);
    for (const g of governments) all.push(...g.source_ids);
    for (const e of elections) all.push(...e.source_ids);
    const unknown = [...new Set(all.filter((id) => !sourceMap.has(id)))];
    expect(unknown).toEqual([]);
    expect(sources.length).toBeGreaterThan(10);
  });

  it('选区席位权重为正且地图坐标在 0—100 范围', () => {
    for (const c of constituencies) {
      expect(c.seats).toBeGreaterThan(0);
      expect(c.map.x).toBeGreaterThanOrEqual(0);
      expect(c.map.x + c.map.w).toBeLessThanOrEqual(100);
      expect(c.map.y + c.map.h).toBeLessThanOrEqual(100);
    }
  });

  it('政党意识形态取值在 -1..1', () => {
    for (const p of parties) {
      expect(Math.abs(p.ideology.economic_left_right)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.ideology.social_authority_liberty)).toBeLessThanOrEqual(1);
      expect(p.ideology.democratic_commitment).toBeGreaterThanOrEqual(0);
      expect(p.ideology.democratic_commitment).toBeLessThanOrEqual(1);
    }
  });

  it('1919 年选举保留席位口径差异说明', () => {
    const e1919 = elections.find((e) => e.id === 'election_1919_01')!;
    expect(e1919.notes).toContain('423');
    expect(e1919.notes).toContain('163');
  });
});
