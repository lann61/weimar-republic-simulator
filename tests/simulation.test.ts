import { describe, expect, it } from 'vitest';
import { runSimulation, summarize } from './helpers';
import { majorityThreshold, allocateSeats } from '../src/simulation/elections/seats';
import { cabinetCounts, governmentSeats, headOfState } from '../src/utils/derive';
import { RNG } from '../src/simulation/engine/random';
import { eventMap, events } from '../src/data/events';
import { buildInitialState } from '../src/simulation/engine/state';
import { applyChoice, appointChancellor } from '../src/simulation/events/engine';
import { resolvePending, openNextEvent } from '../src/simulation/engine/step';
import { parties } from '../src/data/parties';
import { people } from '../src/data/people';
import { formGovernment, isPersonEligibleForOffice } from '../src/simulation/elections/coalition';
import { evaluateCondition } from '../src/simulation/challenge/challenge';
import { computeVotes } from '../src/simulation/elections/voting';
import { explainMetric } from '../src/simulation/explainability/causes';
import { migrateState } from '../src/persistence/migrate';
import { adaptEventText, adaptChoiceEffects } from '../src/simulation/events/adapter';

describe('模拟引擎（方案 §12 模拟引擎 / §16 验收）', () => {
  it('历史基线可以跑到 1934-08-02 事件之后且不崩溃', () => {
    const s = runSimulation();
    // WMR-014：必须先处理 1934-08-02 的兴登堡去世与军队宣誓事件，因此结束于 1934-09-01
    expect(s.date).toBe('1934-08-31');
    expect(s.meta.ended).toBe(true);
    expect(s.meta.ending).toBeTruthy();
    expect(s.snapshots.length).toBeGreaterThan(180);
  });

  it('相同种子 + 相同决策必须完全复现（方案 §29-18）', () => {
    const a = summarize(runSimulation({ seed: 42 }));
    const b = summarize(runSimulation({ seed: 42 }));
    expect(a).toEqual(b);
  });

  it('不同种子会产生不同的随机扰动，但历史主干保持一致', () => {
    const a = summarize(runSimulation({ seed: 1 }));
    const b = summarize(runSimulation({ seed: 2 }));
    expect(a.elections).toBe(b.elections);
    expect(a.date).toBe(b.date);
  });

  it('每次选举的席位总数等于国会规模', () => {
    const s = runSimulation();
    for (const e of s.elections) {
      const sum = e.results.reduce((a, r) => a + r.seats, 0);
      expect(sum, `${e.date} 席位合计 ${sum} ≠ ${e.totalSeats}`).toBeLessThanOrEqual(e.totalSeats);
      expect(sum).toBeGreaterThan(e.totalSeats * 0.97);
    }
  });

  it('得票率合计约等于 100%（历史数据四舍五入与未列小党允许 95—103%）', () => {
    const s = runSimulation();
    for (const e of s.elections) {
      const sum = e.results.reduce((a, r) => a + r.share, 0) + (e.otherVoteShare ?? 0);
      expect(sum).toBeGreaterThan(95);
      expect(sum).toBeLessThan(103);
    }
  });

  it('席位分配不会产生负数或超过总席位', () => {
    const rng = new RNG(7);
    const shares = { spd: 30, zentrum: 15, dnvp: 12, kpd: 12, dvp: 9, ddp: 6, bvp: 4, nsdap: 10, wirtschaftspartei: 2 };
    const res = allocateSeats(shares, 491, rng);
    const total = Object.values(res.seats).reduce((a, b) => a + b, 0);
    expect(total).toBe(491);
    for (const v of Object.values(res.seats)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('多数门槛计算正确', () => {
    expect(majorityThreshold(491)).toBe(246);
    expect(majorityThreshold(459)).toBe(230);
    expect(majorityThreshold(0)).toBe(1);
  });

  it('内阁人数统计区分唯一人数、部长数与职务数', () => {
    const s = runSimulation({ endDate: '1931-01-01' });
    const c = cabinetCounts(s.government);
    expect(c.uniquePersons).toBeLessThanOrEqual(c.offices);
    expect(c.ministers).toBeLessThanOrEqual(c.uniquePersons);
    expect(c.uniquePersons).toBeGreaterThan(3);
  });

  it('政府席位与门槛关系自洽', () => {
    const s = runSimulation({ endDate: '1930-01-01' });
    const g = governmentSeats(s);
    expect(g.threshold).toBe(Math.floor(s.parliamentSeatsTotal / 2) + 1);
    expect(g.coalition + g.support + g.opposition).toBeGreaterThanOrEqual(s.parliamentSeatsTotal - 1);
  });

  it('史实锚定：历史模式下的选举结果接近史料（±4 个百分点）', () => {
    const s = runSimulation();
    const e1928 = s.elections.find((e) => e.date.startsWith('1928'));
    expect(e1928).toBeTruthy();
    const spd = e1928!.results.find((r) => r.partyId === 'spd')!;
    expect(Math.abs(spd.share - 29.8)).toBeLessThan(4);
    const e1932 = s.elections.find((e) => e.date.startsWith('1932-07'));
    const nsdap = e1932!.results.find((r) => r.partyId === 'nsdap')!;
    expect(Math.abs(nsdap.share - 37.3)).toBeLessThan(5);
  });

  it('经济在 1929—1932 出现显著衰退', () => {
    const s = runSimulation();
    const s1929 = s.snapshots.find((x) => x.date === '1929-06-01')!;
    const s1932 = s.snapshots.find((x) => x.date === '1932-06-01')!;
    expect((s1932.economy.output ?? 0)).toBeLessThan((s1929.economy.output ?? 0) - 15);
    expect((s1932.economy.unemployment ?? 0)).toBeGreaterThan((s1929.economy.unemployment ?? 0) + 5);
  });

  it('总统内阁会留下第48条使用记录', () => {
    const s = runSimulation({ endDate: '1932-06-01' });
    expect(s.stats.article48Count).toBeGreaterThan(0);
    expect(s.article48.length).toBeGreaterThan(0);
  });

  it('自由模拟模式（1928）可以从不同起点运行', () => {
    const s = runSimulation({ scenarioId: 'sc_1928', endDate: '1932-01-01' });
    expect(s.date).toBe('1932-01-01');
    expect(s.parliamentSeatsTotal).toBeGreaterThan(400);
  });

  it('状态变量始终在合法范围内', () => {
    const s = runSimulation();
    expect(s.economy.unemployment).toBeGreaterThanOrEqual(0);
    expect(s.economy.unemployment).toBeLessThanOrEqual(60);
    for (const v of Object.values(s.institutions)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(s.society)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('史实路径不跳过任何历史事件', () => {
    const s = runSimulation();
    const blocked = Object.keys(s.flags).filter((k) => k.startsWith('blocked_'));
    expect(blocked).toEqual([]);
  });

  it('开局月份（1918-11）的事件必须触发', () => {
    const s = runSimulation({ endDate: '1919-02-01' });
    const fired = new Set(s.firedEvents);
    expect(fired.has('ev_kiel_mutiny')).toBe(true);
    expect(fired.has('ev_november_revolution')).toBe(true);
    expect(fired.has('ev_ebert_groener')).toBe(true);
  });

  it('史实路径不产生偏离（第一项即史实选项）', () => {
    const s = runSimulation();
    expect(s.meta.divergence).toBeLessThan(0.001);
  });

  it('玩家选择会改变历史走向：反事实路径与史实路径显著不同', () => {
    const base = runSimulation();
    const alt = runSimulation({
      choiceOverride: (eventId, def) => {
        const e = eventMap.get(eventId);
        if (!e) return def;
        return e.choices[e.choices.length - 1].id;
      },
    });

    expect(alt.meta.divergence).toBeGreaterThan(0.5);

    const baseElections = base.elections.map((e) => `${e.date}:${[...e.results].sort((a, b) => b.seats - a.seats)[0]?.partyId}`).join('|');
    const altElections = alt.elections.map((e) => `${e.date}:${[...e.results].sort((a, b) => b.seats - a.seats)[0]?.partyId}`).join('|');
    const baseGovs = base.governmentHistory.map((g) => g.chancellorId).join('|');
    const altGovs = alt.governmentHistory.map((g) => g.chancellorId).join('|');

    const electionsDiffer = baseElections !== altElections;
    const governmentsDiffer = baseGovs !== altGovs;
    const endingDiffers = base.meta.ending !== alt.meta.ending;
    const skippedDiffers = Object.keys(base.flags).filter((k) => k.startsWith('blocked_')).length !== Object.keys(alt.flags).filter((k) => k.startsWith('blocked_')).length;

    expect(electionsDiffer || governmentsDiffer || endingDiffers || skippedDiffers).toBe(true);
  });

  it('反事实路径会让部分历史事件因条件不足而不发生', () => {
    const alt = runSimulation({
      choiceOverride: (eventId, def) => {
        const e = eventMap.get(eventId);
        return e ? e.choices[e.choices.length - 1].id : def;
      },
    });
    const blocked = Object.keys(alt.flags).filter((k) => k.startsWith('blocked_'));
    expect(blocked.length).toBeGreaterThan(0);
  });

  it('初始状态不依赖全局可变数据', () => {
    const a = buildInitialState('sc_historical', 1);
    const b = buildInitialState('sc_historical', 2);
    expect(a.economy.unemployment).toBe(b.economy.unemployment);
    expect(a.government.id).toBe(b.government.id);
  });

  it('开局选择“保留君主制”会改变国家元首与政府类型', () => {
    const s = runSimulation({
      endDate: '1918-12-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'constitutional_monarchy' : def),
    });
    expect(s.flags.regime).toBe('constitutional_monarchy');
    const hos = headOfState(s);
    expect(hos.name).toBe('威廉二世');
    expect(hos.title).toBe('德意志皇帝');
    expect(s.government.type).toBe('constitutional_monarchy');
    expect(s.government.name_zh).toContain('帝国');
  });

  it('“保留君主制”后不安装史实共和国内阁，政权保持君主立宪', () => {
    const s = runSimulation({
      endDate: '1919-04-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'constitutional_monarchy' : def),
    });
    // 君主制路径不应按共和国史实日程安装谢德曼内阁（政府更迭由事件/玩家决定）
    expect(s.government.id).not.toBe('gov_scheidemann');
    expect(s.government.chancellorId).not.toBe('person_scheidemann');
    expect(s.flags.regime).toBe('constitutional_monarchy');
    expect(s.government.type).toBe('constitutional_monarchy');
    expect(headOfState(s).name).toBe('威廉二世');
  });

  it('选择“苏维埃共和”会更换国家元首与政府类型', () => {
    const s = runSimulation({
      endDate: '1919-03-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'council_republic' : def),
    });
    expect(s.flags.regime).toBe('council_republic');
    expect(s.government.type).toBe('council_republic');
    expect(headOfState(s).name).toBe('卡尔·李卜克内西');
  });

  it('史实路径保持共和制，国家元首仍为艾伯特', () => {
    const s = runSimulation({ endDate: '1919-03-01' });
    expect(s.flags.regime ?? 'republic').toBe('republic');
    expect(headOfState(s).name).toBe('弗里德里希·艾伯特');
    expect(s.government.type).not.toBe('constitutional_monarchy');
  });

  it('选择“坚决镇压”啤酒馆政变会真正取缔纳粹党', () => {
    const s = runSimulation({
      endDate: '1924-06-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_beer_hall_putsch' ? 'suppress_firmly' : def),
    });
    expect(s.parties['nsdap'].banned).toBe(true);
    expect(s.parties['nsdap'].seats).toBe(0);
  });

  it('WMR-005 历史模式选举票数精确采用史料，不额外乘 100', () => {
    const s = runSimulation({ endDate: '1919-03-01' });
    const e = s.elections.find((x) => x.date.startsWith('1919-01'))!;
    expect(e).toBeTruthy();
    expect(e.isHistorical).toBe(true);
    const spd = e.results.find((r) => r.partyId === 'spd')!;
    expect(spd.votes).toBe(11509048);
    expect(spd.seats).toBe(165);
    expect(s.parties['spd'].votesLastElection).toBe(11509048);
    expect(s.parties['spd'].seats).toBe(165);
    // 票数总和必须与有效票同数量级，不得出现十亿级票数
    const totalVotes = e.results.reduce((a, r) => a + (r.votes ?? 0), 0);
    expect(totalVotes).toBeLessThan(35000000);
    expect(totalVotes).toBeGreaterThan(25000000);
  });

  it('WMR-006 历史选举席位 + other seats 等于总席位', () => {
    const s = runSimulation({ endDate: '1929-01-01' });
    const e = s.elections.find((x) => x.date.startsWith('1928-05'))!;
    expect(e).toBeTruthy();
    const partySeats = e.results.reduce((a, r) => a + r.seats, 0);
    expect(e.otherSeats).toBe(12);
    expect(partySeats + (e.otherSeats ?? 0)).toBe(e.totalSeats);
  });

  it('WMR-022 非法 choiceId 不改变状态并保留 pendingEvent', () => {
    const rng = new RNG(1);
    const state = buildInitialState('sc_historical', 1);
    openNextEvent(state, rng);
    expect(state.pendingEvent).toBeTruthy();
    const before = JSON.stringify(state);
    const msgs = resolvePending(state, '__invalid_choice__', rng);
    expect(msgs.length).toBeGreaterThan(0);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.pendingEvent).toBeTruthy();
  });

  it('WMR-022 同一事件重复提交不重复应用效果', () => {
    const rng = new RNG(1);
    const state = buildInitialState('sc_historical', 1);
    openNextEvent(state, rng);
    const eventId = state.pendingEvent!.eventId;
    const choiceId = state.pendingEvent!.choices[0];
    resolvePending(state, choiceId, rng);
    expect(state.firedEvents.filter((e) => e === eventId).length).toBe(1);
    const decisionsBefore = state.stats.decisionsMade;
    const res = applyChoice(state, eventId, choiceId, rng);
    expect(res.ok).toBe(false);
    expect(state.stats.decisionsMade).toBe(decisionsBefore);
  });

  it('WMR-018 每月快照保存各自外交状态，不是重复当前值', () => {
    const s = runSimulation({ endDate: '1921-01-01' });
    expect(s.snapshots.length).toBeGreaterThan(10);
    for (const snap of s.snapshots) {
      expect(snap.diplomacy).toBeTruthy();
    }
    const values = s.snapshots.map((x) => x.diplomacy!.isolation);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('WMR-019 1918 开局不把未来成立的政党当作当前政党', () => {
    const s = buildInitialState('sc_historical', 1);
    const nsdap = parties.find((p) => p.id === 'nsdap')!;
    expect(nsdap.active_from > s.date).toBe(true);
    const visible = parties.filter(
      (p) => p.active_from <= s.date && (!p.active_to || p.active_to >= s.date || s.parties[p.id]?.seats > 0)
    );
    expect(visible.some((p) => p.id === 'nsdap')).toBe(false);
  });

  it('WMR-007 历史政府安装幂等，无重复任期记录', () => {
    const s = runSimulation();
    const ids = s.governmentHistory.map((g) => g.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    const active = s.governmentHistory.filter((g) => !g.endDate);
    expect(active.length).toBeLessThanOrEqual(1);
  });

  it('WMR-001 1918-11-01 开局为威廉二世与马克斯·冯·巴登', () => {
    const s = buildInitialState('sc_historical', 1);
    expect(s.date).toBe('1918-11-01');
    const hos = headOfState(s);
    expect(hos.name).toBe('威廉二世');
    expect(hos.title).toBe('德意志皇帝');
    expect(s.government.id).toBe('gov_max_von_baden');
    expect(s.government.chancellorId).toBe('person_max_von_baden');
    expect(s.governmentHistory.some((g) => g.id === 'gov_rat_volksbeauftragte')).toBe(false);
  });

  it('WMR-001 选择议会共和后国家元首转为艾伯特并成立人民代表委员会', () => {
    const rng = new RNG(1);
    const state = buildInitialState('sc_historical', 1);
    openNextEvent(state, rng);
    for (let i = 0; i < 10 && state.pendingEvent; i++) {
      const evId = state.pendingEvent.eventId;
      const choice = evId === 'ev_november_revolution' ? 'parliamentary_republic' : state.pendingEvent.choices[0];
      resolvePending(state, choice, rng);
      if (evId === 'ev_november_revolution') break;
    }
    expect(headOfState(state).name).toBe('弗里德里希·艾伯特');
    expect(state.government.id).toBe('gov_rat_volksbeauftragte');
    expect(state.flags.regime).toBe('republic');
    expect(state.flags.headOfStateId).toBeUndefined();
  });

  it('WMR-014 历史路径在 1934-08-02 两项事件完成后才结束', () => {
    const s = runSimulation();
    expect(s.firedEvents).toContain('ev_hindenburg_death');
    expect(s.firedEvents).toContain('ev_army_oath');
    expect(s.date >= '1934-08-02').toBe(true);
    expect(s.meta.ending).toBe('nazi_consolidation');
  });

  it('WMR-020 事件解析消耗的 RNG 可用 rngCalls 精确恢复', () => {
    const rng = new RNG(42);
    const state = buildInitialState('sc_historical', 42);
    openNextEvent(state, rng);
    state.meta.rngCalls = rng.calls;
    const callsAfterOpen = rng.calls;
    const choice = state.pendingEvent!.choices[0];
    resolvePending(state, choice, rng);
    state.meta.rngCalls = rng.calls;
    expect(rng.calls).toBeGreaterThanOrEqual(callsAfterOpen);

    // 用保存的 rngCalls 重建 RNG，后续随机序列必须一致
    const rngRestored = new RNG(42);
    rngRestored.fastForward(state.meta.rngCalls);
    expect(rngRestored.calls).toBe(rng.calls);
    expect(rngRestored.next()).toBe(rng.next());
  });

  it('WMR-009 反体制最大党不会自动获得总理职位', () => {
    const state = buildInitialState('sc_1932', 1);
    state.parliamentSeatsTotal = 600;
    for (const p of Object.values(state.parties)) p.seats = 0;
    state.parties['nsdap'].seats = 220;
    state.parties['spd'].seats = 130;
    state.parties['kpd'].seats = 90;
    state.parties['zentrum'].seats = 70;
    state.parties['dnvp'].seats = 50;
    state.parties['bvp'].seats = 20;
    state.parties['dvp'].seats = 20;
    const rng = new RNG(1);
    const outcome = formGovernment(state, rng);
    expect(outcome.chancellorId).not.toBe('person_hitler');
    if (outcome.type === 'minority') {
      expect(outcome.parties[0]).not.toBe('nsdap');
    }
  });

  it('WMR-010 总理候选人真实存在且在任期内未死亡', () => {
    const state = buildInitialState('sc_1932', 1);
    const rng = new RNG(1);
    const outcome = formGovernment(state, rng);
    const p = people.find((x) => x.id === outcome.chancellorId);
    expect(p).toBeTruthy();
    expect(p!.birth_date <= state.date).toBe(true);
    expect(p!.death_date >= state.date).toBe(true);
  });

  it('9 个场景均可初始化且国家元首/政府有效', () => {
    const ids = [
      'sc_historical',
      'sc_intervention',
      'sc_1923',
      'sc_1928',
      'sc_1930',
      'sc_1932',
      'sc_challenge_unemployment',
      'sc_challenge_ruhr',
      'sc_challenge_1932',
    ];
    for (const id of ids) {
      const s = buildInitialState(id, 1);
      expect(s.date).toBeTruthy();
      expect(s.government.id).toBeTruthy();
      expect(headOfState(s).name).not.toBe('—');
      expect(people.some((p) => p.id === s.government.chancellorId)).toBe(true);
    }
  });

  it('8 个随机种子均可运行，席位算术保持成立', () => {
    for (const seed of [1, 2, 3, 7, 42, 99, 2026, 19181109]) {
      const s = runSimulation({ seed, endDate: '1921-01-01' });
      expect(s.date >= '1921-01-01').toBe(true);
      for (const e of s.elections) {
        const seatSum = e.results.reduce((a, r) => a + r.seats, 0) + (e.otherSeats ?? 0);
        expect(seatSum).toBeLessThanOrEqual(e.totalSeats);
        expect(seatSum).toBeGreaterThan(e.totalSeats * 0.9);
      }
    }
  });

  it('WMR-025 历史模式选举使用真实日期与史实数据', () => {
    const s = runSimulation();
    const e07 = s.elections.find((e) => e.date === '1932-07-31');
    const e11 = s.elections.find((e) => e.date === '1932-11-06');
    const e33 = s.elections.find((e) => e.date === '1933-03-05');
    expect(e07).toBeTruthy();
    expect(e11).toBeTruthy();
    expect(e33).toBeTruthy();
    expect(e07!.totalSeats).toBe(608);
    expect(e11!.totalSeats).toBe(584);
    expect(e33!.totalSeats).toBe(647);
    expect(e33!.results.find((r) => r.partyId === 'nsdap')!.share).toBe(43.9);
    expect(e33!.results.find((r) => r.partyId === 'nsdap')!.seats).toBe(288);
  });

  it('WMR-002 1923 场景载入历史档案，不重放开局前事件', () => {
    const s = buildInitialState('sc_1923', 1);
    expect(s.flags.scenarioArchive).toBe('1923-01-01');
    expect(s.firedEvents).toContain('ev_november_revolution');
    expect(s.firedEvents).toContain('ev_versailles_signed');
    expect(s.firedEvents).not.toContain('ev_beer_hall_putsch');
    expect(s.elections.length).toBeGreaterThanOrEqual(2);
    expect(s.elections.every((e) => e.date < '1923-01-01')).toBe(true);
    expect(s.governmentHistory.length).toBeGreaterThan(2);
    const rng = new RNG(1);
    openNextEvent(s, rng);
    if (s.pendingEvent) {
      const ev = eventMap.get(s.pendingEvent.eventId)!;
      expect(ev.date >= '1923-01-01').toBe(true);
    }
  });

  it('WMR-023 appointChancellor 关闭旧政府并记录新政府', () => {
    const state = buildInitialState('sc_historical', 1);
    const before = state.governmentHistory.length;
    const gov = appointChancellor(state, 'person_scheidemann', undefined, '测试');
    expect(gov.chancellorId).toBe('person_scheidemann');
    expect(state.governmentHistory.length).toBe(before + 1);
    expect(state.governmentHistory.filter((g) => !g.endDate).length).toBe(1);
    expect(state.stats.governmentsFormed).toBe(before + 1);
    // 同一总理重复任命不得重复新建
    const again = appointChancellor(state, 'person_scheidemann');
    expect(again.id).toBe(gov.id);
    expect(state.governmentHistory.length).toBe(before + 1);
  });

  it('WMR-015 allows_counterfactual 与选项效果一致', () => {
    for (const e of events) {
      if (e.allows_counterfactual !== false) continue;
      const histId = e.historical_choice_id ?? e.choices[0].id;
      for (const c of e.choices) {
        if (c.id === histId) continue;
        const eff = c.effects;
        const changes =
          (eff.vars && Object.keys(eff.vars).length > 0) ||
          (eff.set && Object.keys(eff.set).length > 0) ||
          (eff.flags && Object.keys(eff.flags).length > 0) ||
          !!eff.structure ||
          !!eff.policy_id ||
          (eff.delayed && eff.delayed.length > 0) ||
          !!eff.action;
        expect(changes, `${e.id} / ${c.id} 改变了状态但 allows_counterfactual=false`).toBe(false);
      }
    }
  });

  it('WMR-012 艾伯特去世后总统空缺，1925 选举后为兴登堡', () => {
    const s1 = runSimulation({ endDate: '1925-03-01' });
    expect(s1.flags.presidentVacant).toBe(true);
    expect(headOfState(s1).name).toBe('空缺');
    const s2 = runSimulation({ endDate: '1925-06-01' });
    expect(s2.presidentId).toBe('person_hindenburg');
    expect(s2.flags.presidentVacant).toBeFalsy();
    expect(headOfState(s2).name).toBe('保罗·冯·兴登堡');
  });

  it('君主制路径：不触发总统选举，但国会选举后总理按结果更替', () => {
    const s = runSimulation({
      endDate: '1920-06-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'constitutional_monarchy' : def),
    });
    expect(s.flags.regime).toBe('constitutional_monarchy');
    expect(headOfState(s).name).toBe('威廉二世');
    expect(s.firedEvents).not.toContain('ev_ebert_death');
    expect(s.firedEvents).not.toContain('ev_presidential_1925');
    expect(s.firedEvents).not.toContain('ev_hindenburg_elected');
    // 非共和制下不应出现共和国议会/制宪叙述事件（选举本身由制宪选举机制产生）
    expect(s.firedEvents).not.toContain('ev_election_1919');
    expect(s.firedEvents).not.toContain('ev_weimar_assembly');
    expect(s.firedEvents).not.toContain('ev_weimar_constitution');
    // 制宪选举已举行：国会已产生，政府不是看守，总理可随选举结果更替
    expect(s.elections.length).toBeGreaterThan(0);
    expect(s.parliamentSeatsTotal).toBeGreaterThan(0);
    expect(s.government.type).not.toBe('caretaker');
  });

  it('偏离史实后以当前政府危机版本延续事件链', () => {
    const s = runSimulation({
      endDate: '1924-01-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'constitutional_monarchy' : def),
    });
    expect(s.firedEvents).toContain('ev_cuno_fall');
    expect(s.decisions.find(d => d.eventId === 'ev_cuno_fall')?.title).toBe('现政府的信任与组阁危机');
    expect(s.governmentHistory.some(g => g.id === 'gov_stresemann1')).toBe(false);
  });

  it('史实路径：库诺政府垮台后施特雷泽曼组阁', () => {
    const s = runSimulation({ endDate: '1923-09-01' });
    expect(s.firedEvents).toContain('ev_cuno_fall');
    expect(s.governmentHistory.some((g) => g.id === 'gov_stresemann1')).toBe(true);
  });

  it('WMR-029 帝制路径的事件叙述按当前政权改写', () => {
    const state = buildInitialState('sc_historical', 1);
    state.flags.regime = 'constitutional_monarchy';
    state.flags.headOfStateId = 'person_wilhelm_ii';
    state.government.name_zh = '威廉二世任命的帝国议会政府';
    state.government.chancellorId = 'person_max_von_baden';
    const ev = eventMap.get('ev_cuno_fall')!;
    const adapted = adaptEventText(state, ev);
    expect(adapted.background).toContain('帝国议会');
    expect(adapted.background).toContain('皇帝');
    expect(adapted.background).not.toContain('库诺政府');
    expect(adapted.background).not.toContain('总统');
  });

  it('WMR-029 偏离史实后不安装史实内阁', () => {
    const state = buildInitialState('sc_historical', 1);
    state.meta.divergence = 0.5;
    const effects = adaptChoiceEffects(state, { structure: { installGovernmentId: 'gov_stresemann1' } });
    expect(effects.structure?.installGovernmentId).toBeUndefined();
  });

  it('WMR-029 全部 124 个事件在帝制状态下不残留共和国措辞', () => {
    const state = buildInitialState('sc_historical', 1);
    state.flags.regime = 'constitutional_monarchy';
    state.flags.headOfStateId = 'person_wilhelm_ii';
    state.government.name_zh = '威廉二世任命的帝国议会政府';
    state.government.chancellorId = 'person_max_von_baden';
    const offenders: string[] = [];
    for (const ev of events) {
      const adapted = adaptEventText(state, ev);
      const text = `${adapted.title} ${adapted.background} ${adapted.choices
        .map((c) => `${c.label}${c.short_term}${c.long_term}`)
        .join(' ')}`;
      if (text.includes('总统')) offenders.push(`${ev.id}: 总统`);
      if (text.includes('国会')) offenders.push(`${ev.id}: 国会`);
    }
    expect(offenders).toEqual([]);
  });

  it('WMR-029 偏离后的共和国状态不残留其他历史总理政府', () => {
    const state = buildInitialState('sc_historical', 1);
    state.flags.regime = 'republic';
    state.government.chancellorId = 'person_mueller_hermann';
    state.government.name_zh = '米勒内阁';
    const offenders: string[] = [];
    for (const ev of events) {
      const adapted = adaptEventText(state, ev);
      const text = `${adapted.title} ${adapted.background} ${adapted.choices
        .map((c) => `${c.label}${c.short_term}${c.long_term}`)
        .join(' ')}`;
      if (text.includes('库诺政府') || text.includes('施特雷泽曼内阁') || text.includes('布吕宁政府')) {
        offenders.push(ev.id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('WMR-030 偏离史实后仍举行制宪选举并产生国会与政府', () => {
    const s = runSimulation({
      endDate: '1919-06-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_november_revolution' ? 'constitutional_monarchy' : def),
    });
    expect(s.elections.length).toBeGreaterThan(0);
    expect(s.parliamentSeatsTotal).toBeGreaterThan(0);
    expect(Object.values(s.parties).some((p) => p.seats > 0)).toBe(true);
    expect(s.government.type).not.toBe('caretaker');
  });

  it('WMR-013 合并总统总理职权后 presidentId 同步为希特勒', () => {
    const s = runSimulation();
    expect(s.firedEvents).toContain('ev_hindenburg_death');
    expect(s.presidentId).toBe('person_hitler');
    expect(headOfState(s).name).toBe('阿道夫·希特勒');
  });

  it('WMR-016 同一月份只举行一次选举，并记录触发原因', () => {
    const s = runSimulation();
    const months = s.elections.map((e) => e.date.slice(0, 7));
    expect(new Set(months).size).toBe(months.length);
    for (const e of s.elections) {
      expect(e.triggerReason).toBeTruthy();
    }
  });

  it('WMR-016 解散国会生成选举日程条目', () => {
    const rng = new RNG(1);
    const state = buildInitialState('sc_historical', 1);
    const ev = events.find((e) => e.choices.some((c) => c.effects.action?.type === 'dissolve_reichstag'))!;
    const choice = ev.choices.find((c) => c.effects.action?.type === 'dissolve_reichstag')!;
    applyChoice(state, ev.id, choice.id, rng);
    expect(state.electionSchedule?.length).toBeGreaterThan(0);
    expect(state.electionSchedule![0].trigger).toBe('dissolution');
  });

  it('WMR-017 挑战情景初始化并月度更新进度', () => {
    const s = runSimulation({ scenarioId: 'sc_challenge_unemployment', endDate: '1930-06-01' });
    expect(s.challenge).toBeTruthy();
    expect(s.challenge!.objectives.length).toBeGreaterThan(0);
    expect(s.challenge!.progress.length).toBe(s.challenge!.objectives.length);
    expect(s.challenge!.progress.some((p) => p.current !== 0)).toBe(true);
  });

  it('WMR-017 evaluateCondition 正确比较', () => {
    const s = buildInitialState('sc_challenge_unemployment', 1);
    expect(
      evaluateCondition(s, { id: 'x', label: 'x', path: 'economy.unemployment', op: '<=', value: 100 }).met
    ).toBe(true);
    expect(
      evaluateCondition(s, { id: 'y', label: 'y', path: 'economy.unemployment', op: '<=', value: 0 }).met
    ).toBe(false);
  });

  it('WMR-003 1928 场景在当月举行选举', () => {
    const s = runSimulation({ scenarioId: 'sc_1928', endDate: '1928-07-01' });
    expect(s.elections.some((e) => e.date.startsWith('1928-05'))).toBe(true);
  });

  it('WMR-004 事件按真实日期顺序结算', () => {
    const s = runSimulation({ endDate: '1920-01-01' });
    const dates = s.decisions.map((d) => eventMap.get(d.eventId)?.date ?? '').filter(Boolean);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1], `${dates[i - 1]} -> ${dates[i]}`).toBe(true);
    }
  });

  it('WMR-004 同月事件不会因决策上限被静默跳过', () => {
    const s = runSimulation({ endDate: '1919-02-01' });
    expect(s.firedEvents).toContain('ev_kiel_mutiny');
    expect(s.firedEvents).toContain('ev_november_revolution');
    expect(s.firedEvents).toContain('ev_ebert_groener');
  });

  it('WMR-008 政府成立日期使用真实日期', () => {
    const s = runSimulation({ endDate: '1930-04-15' });
    const bruening = s.governmentHistory.find((g) => g.id === 'gov_bruening1');
    expect(bruening).toBeTruthy();
    expect(bruening!.startDate).toBe('1930-03-30');
  });

  it('WMR-024 事件链前置先于后续', () => {
    const s = runSimulation({ endDate: '1924-06-01' });
    const idx = (id: string) => s.firedEvents.indexOf(id);
    expect(idx('ev_bavaria_emergency')).toBeGreaterThanOrEqual(0);
    expect(idx('ev_beer_hall_putsch')).toBeGreaterThan(idx('ev_bavaria_emergency'));
    expect(idx('ev_hitler_trial')).toBeGreaterThan(idx('ev_beer_hall_putsch'));
  });

  it('WMR-011 党籍起始日期不再默认等于出生日期', () => {
    const ebert = people.find((p) => p.id === 'person_ebert')!;
    const m = ebert.party_memberships[0];
    expect(m).toBeTruthy();
    expect(m.from).not.toBe(ebert.birth_date);
    expect(m.from === null || m.from >= ebert.birth_date).toBe(true);
  });

  it('WMR-026 失业率上升提高纳粹党得票（敏感性）', () => {
    const base = buildInitialState('sc_1930', 1);
    const high = JSON.parse(JSON.stringify(base));
    high.economy.unemployment = 30;
    const a = computeVotes(base, new RNG(1), { campaign: true, fairness: 0.9 });
    const b = computeVotes(high, new RNG(1), { campaign: true, fairness: 0.9 });
    expect(b.shares['nsdap']).toBeGreaterThan(a.shares['nsdap']);
  });

  it('WMR-026 关键指标可解释', () => {
    const s = buildInitialState('sc_1930', 1);
    for (const path of ['economy.unemployment', 'economy.inflation', 'society.violence', 'institutions.parliamentAuthority']) {
      const causes = explainMetric(s, path);
      expect(causes.length).toBeGreaterThan(0);
      expect(causes.every((c) => c.label && c.detail)).toBe(true);
    }
  });

  it('WMR-026 1932 挑战存在避免纳粹夺权的路径', () => {
    const s = runSimulation({
      scenarioId: 'sc_challenge_1932',
      endDate: '1933-02-01',
      choiceOverride: (eventId, def) => (eventId === 'ev_elite_bargain' ? 'block_appointment' : def),
    });
    expect(s.firedEvents).not.toContain('ev_hitler_appointed');
    expect(s.meta.ending).not.toBe('nazi_seizure');
    expect(s.meta.ending).not.toBe('nazi_consolidation');
  });

  it('WMR-010 资格函数拒绝死亡人物与不存在人物', () => {
    expect(isPersonEligibleForOffice('person_ebert', '1925-03-01', 'chancellor')).toBe(false);
    expect(isPersonEligibleForOffice('person_hitler', '1933-02-01', 'chancellor')).toBe(true);
    expect(isPersonEligibleForOffice('nonexistent_person', '1933-02-01', 'chancellor')).toBe(false);
  });

  it('SAVE-002 1.1.0 存档迁移补齐 cursorDate/electionSchedule/dataVersion', () => {
    const old = buildInitialState('sc_historical', 1);
    delete (old as { cursorDate?: string }).cursorDate;
    delete (old as { electionSchedule?: unknown[] }).electionSchedule;
    old.meta.dataVersion = '1.1.0';
    const migrated = migrateState(old);
    expect(migrated.cursorDate).toBe(old.date);
    expect(migrated.electionSchedule).toEqual([]);
    expect(migrated.meta.dataVersion).toBe('2.2.0');
  });

  it('SAVE-002 挑战存档迁移重建 challenge', () => {
    const old = buildInitialState('sc_challenge_unemployment', 1);
    delete (old as { challenge?: unknown }).challenge;
    old.meta.dataVersion = '1.1.0';
    const migrated = migrateState(old);
    expect(migrated.challenge).toBeTruthy();
    expect(migrated.challenge!.scenarioId).toBe('sc_challenge_unemployment');
    expect(migrated.challenge!.objectives.length).toBeGreaterThan(0);
  });
});
