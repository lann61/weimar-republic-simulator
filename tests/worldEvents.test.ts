import { describe,it,expect } from 'vitest';
import { buildInitialState, getPath, defaultBoundsFor } from '../src/simulation/engine/state';
import { ensureWorldEvents,stepWorldEvents } from '../src/simulation/events/world';
import { WORLD_EVENTS } from '../src/simulation/events/worldCatalog';
import { advanceMonth,resolvePending } from '../src/simulation/engine/step';
import { addMonths,monthIndex } from '../src/simulation/engine/date';
import { RNG } from '../src/simulation/engine/random';
import { eventMap } from '../src/data/events';
import { parseSave } from '../src/persistence/import';
import { exportSave } from '../src/persistence/db';
import { buildReport } from '../src/simulation/engine/ending';
import type { GameState } from '../src/simulation/types';

const copy=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
function settle(s:GameState,rng:RNG) {
  for(let guard=0;s.pendingEvent&&guard<300;guard++) {
    const event=eventMap.get(s.pendingEvent.eventId)!;
    resolvePending(s,event.historical_choice_id??event.choices[0].id,rng);
  }
  expect(s.pendingEvent).toBeNull();s.meta.rngCalls=rng.calls;
}
function runMonths(s:GameState,rng:RNG,months:number) {
  settle(s,rng);
  for(let i=0;i<months;i++){advanceMonth(s,rng);settle(s,rng);}
}

describe('独立局势事件与结局分析',()=>{
  it('所有模式每隔2—3个月出现，事件种类覆盖五类且不重复消耗同月余波',()=>{
    const categories=new Set<string>(),templates=new Set<string>();
    for(const scenario of ['sc_historical','sc_intervention','sc_1932','sc_challenge_unemployment']) {
      const s=buildInitialState(scenario,123);ensureWorldEvents(s);
      const start=s.date;
      for(let month=1;month<=60;month++) {
        s.date=addMonths(start,month);stepWorldEvents(s);
        const after=copy(s.worldEvents);stepWorldEvents(s);expect(s.worldEvents).toEqual(after);
      }
      const records=s.worldEvents!.records;
      expect(monthIndex(records[0].date)-monthIndex(start)).toBeGreaterThanOrEqual(2);
      expect(monthIndex(records[0].date)-monthIndex(start)).toBeLessThanOrEqual(3);
      records.forEach((r,index)=>{
        categories.add(r.category);templates.add(r.templateId);
        if(index)expect([2,3]).toContain(monthIndex(r.date)-monthIndex(records[index-1].date));
        expect(records.slice(Math.max(0,index-3),index).some(p=>p.templateId===r.templateId)).toBe(false);
      });
      expect(s.decisions).toHaveLength(0);expect(s.pendingEvent).toBeNull();
      expect(s.stats.decisionsMade).toBe(0);
    }
    expect(categories.size).toBe(5);expect(templates.size).toBeGreaterThan(12);
  });
  it('即时冲击与余波确实修改四大系统，有持续时间和上下限',()=>{
    const s=buildInitialState('sc_intervention',33);ensureWorldEvents(s);s.worldEvents!.nextDate=s.date;
    const before=copy(s),record=stepWorldEvents(s)!;
    for(const section of ['economy','society','institutions','diplomacy'] as const)expect(s[section]).not.toEqual(before[section]);
    const immediate=copy(record.cumulative),atOnset=copy(s);
    s.date=addMonths(s.date,1);s.worldEvents!.nextDate='1934-08-01';stepWorldEvents(s);
    expect(record.remaining).toBe(record.duration-1);
    for(const [path,delta]of Object.entries(record.monthly)) {
      const [lo,hi]=defaultBoundsFor(path);
      const expected=Math.max(lo,Math.min(hi,getPath(atOnset,path)+delta))-getPath(atOnset,path);
      expect(getPath(s,path)-getPath(atOnset,path)).toBeCloseTo(expected);
      expect(record.cumulative[path]-immediate[path]).toBeCloseTo(expected);
    }
    for(let i=1;i<record.duration;i++){s.date=addMonths(s.date,1);stepWorldEvents(s);}
    expect(record.remaining).toBe(0);
    const expired=copy(s);s.date=addMonths(s.date,1);stepWorldEvents(s);
    expect(s.economy).toEqual(expired.economy);expect(record.cumulative).toEqual(expired.worldEvents!.records[0].cumulative);
    for(const t of WORLD_EVENTS)for(const [path,delta]of Object.entries(t.vars)){expect(Number.isFinite(delta)).toBe(true);expect(path.split('.')[1] in before[path.split('.')[0] as 'economy']).toBe(true);}
  });
  it('不同种子有不同事件，同种子确定；选民与政党受到间接传导',()=>{
    const a=buildInitialState('sc_intervention',42),b=copy(a),rngA=new RNG(42),rngB=new RNG(42);
    ensureWorldEvents(a);ensureWorldEvents(b);
    a.worldEvents!.nextDate=addMonths(a.date,1);b.worldEvents!.nextDate='1934-08-01';
    advanceMonth(a,rngA);advanceMonth(b,rngB);
    expect(a.voterGroups).not.toEqual(b.voterGroups);expect(a.parties).not.toEqual(b.parties);
    expect(a.news[a.news.length-1].tags).toContain('自动局势事件');
    const sequences=[42,42,43].map(seed=>{
      const s=buildInitialState('sc_intervention',seed);ensureWorldEvents(s);const start=s.date;
      for(let m=1;m<40;m++){s.date=addMonths(start,m);stepWorldEvents(s);}
      return s.worldEvents;
    });
    expect(sequences[0]).toEqual(sequences[1]);expect(sequences[0]).not.toEqual(sequences[2]);
  });
  it('存档读回后日程、余波及随机序列与连续推演完全一致；旧档不回填过去事件',()=>{
    const a=buildInitialState('sc_historical',88),rng=new RNG(88);runMonths(a,rng,12);
    const b=parseSave(exportSave(a)),resumedRng=new RNG(b.meta.seed);resumedRng.fastForward(b.meta.rngCalls);
    runMonths(a,rng,12);runMonths(b,resumedRng,12);
    expect(b.worldEvents).toEqual(a.worldEvents);expect(b.economy).toEqual(a.economy);
    expect(b.society).toEqual(a.society);expect(b.elections).toEqual(a.elections);
    const legacy=copy(a);delete legacy.worldEvents;
    const loaded=parseSave(exportSave(legacy));expect(loaded.worldEvents!.records).toHaveLength(0);
    expect([2,3]).toContain(monthIndex(loaded.worldEvents!.nextDate)-monthIndex(loaded.date));
    const bad=copy(a);bad.worldEvents!.records[0].remaining=99;
    expect(()=>parseSave(exportSave(bad))).toThrow('局势事件记录无效');
  });
  it('结局后不生成或结算事件，报告能反映真实趋势、不同政治结构与缺失的旧数据',()=>{
    const s=buildInitialState('sc_intervention',7);runMonths(s,new RNG(7),10);
    s.meta.ended=true;const frozen=copy(s);stepWorldEvents(s);expect(s).toEqual(frozen);
    const report=buildReport(s);expect(report.analysis.worldSummary.total).toBe(s.worldEvents!.records.length);
    const unemployment=report.analysis.metrics.find(m=>m.path==='economy.unemployment')!;
    expect(unemployment.change).toBeCloseTo(s.economy.unemployment-s.snapshots[0].economy.unemployment!);
    expect(report.analysis.narratives).toHaveLength(5);expect(report.analysis.governments.length).toBeGreaterThan(0);
    s.flags.enablingActPassed=1;s.flags.onePartyState=1;s.society.mediaFreedom=8;
    expect(buildReport(s).analysis.narratives.map(n=>n.text).join('')).toMatch(/一党体制/);
    s.snapshots[0].diplomacy=undefined;
    expect(buildReport(s).analysis.metrics.find(m=>m.path==='diplomacy.isolation')!.start).toBeUndefined();
  });
});
