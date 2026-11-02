import { describe, expect, it } from 'vitest';
import { events, eventMap } from '../src/data/events';
import { buildInitialState } from '../src/simulation/engine/state';
import { advanceMonth, openNextEvent, resolvePending, skipPending } from '../src/simulation/engine/step';
import { applyChoice, dueEvents, settleDelayed } from '../src/simulation/events/engine';
import { RNG } from '../src/simulation/engine/random';
import { enactPolicy } from '../src/simulation/politics/rules';
import { determineEnding } from '../src/simulation/engine/ending';
import { stepChallenge } from '../src/simulation/challenge/challenge';
import { runSimulation } from './helpers';
import { parseSave } from '../src/persistence/import';
import { exportSave } from '../src/persistence/db';
import { useGame } from '../src/store/useGame';
import { deltaTone } from '../src/utils/labels';

const apply = (s: ReturnType<typeof buildInitialState>, id: string, choice: string) => {
  const e = eventMap.get(id)!; s.date = e.date.slice(0,7) + '-01'; s.cursorDate = e.date;
  return applyChoice(s,id,choice,new RNG(1));
};

describe('2.2 连贯分支与跨系统回归', () => {
  it('所有事件前置日期不晚于后续，全部选择有结果标记与延迟落实', () => {
    for (const e of events) {
      for (const id of e.trigger.requires_events ?? []) expect(eventMap.get(id)!.date <= e.date, e.id).toBe(true);
      for (const c of e.choices) {
        expect(c.effects.flags?.[`choice_${e.id}_${c.id}`]).toBe(1);
        expect(c.effects.delayed?.length).toBeGreaterThan(0);
      }
    }
  });
  it('史实全程所有事件均由玩家选择；授权法与各邦接管不遗漏，游标与日志不倒退', () => {
    const s = buildInitialState('sc_historical'), r = new RNG(s.meta.seed); openNextEvent(s,r);
    let cursor = s.cursorDate!;
    for (let i=0; i<1800 && !s.meta.ended; i++) {
      if (s.pendingEvent) resolvePending(s, eventMap.get(s.pendingEvent.eventId)!.choices[0].id, r);
      else advanceMonth(s,r);
      expect(s.cursorDate! >= cursor).toBe(true); cursor = s.cursorDate!;
    }
    expect(s.meta.ended).toBe(true); expect(s.date).toBe('1934-08-31');
    expect(s.decisions.some(d => d.eventId === 'ev_enabling_act_debate')).toBe(true);
    expect(s.decisions.some(d => d.eventId === 'ev_laender_gleichschaltung')).toBe(true);
    expect(s.decisions.every(d => !d.automatic)).toBe(true);
    expect(s.decisions.filter(d => d.date.startsWith('1933-03')).length).toBeGreaterThan(3);
    expect(s.decisions.every((d,i) => i === 0 || d.date >= s.decisions[i-1].date)).toBe(true);
  });
  it('一党制与议席剥夺真实改变合法性、席位、政府支持并持续限制权利', () => {
    const s = runSimulation();
    expect(s.flags.onePartyState).toBe(1);
    for (const [id,p] of Object.entries(s.parties)) if (id !== 'nsdap') { expect(p.banned).toBe(true); expect(p.seats).toBe(0); expect(p.inGovernment).toBe(false); }
    expect(s.government.parties).toEqual(['nsdap']);
    expect(s.society.mediaFreedom).toBeLessThanOrEqual(8);
    expect(s.institutions.judicialIndependence).toBeLessThanOrEqual(15);
    expect(s.meta.ending).toBe('nazi_consolidation');
  });
  it('反对授权法会阻断制度拆除；不能只凭事件发生就判定通过', () => {
    const s = runSimulation({ choiceOverride: (id,def) => id === 'ev_enabling_act_debate' ? 'reject' : def });
    expect(s.flags.enablingActPassed).toBe(0);
    expect(s.firedEvents).not.toContain('ev_parties_banned');
    expect(s.firedEvents).not.toContain('ev_civil_service_purge');
    expect(s.meta.ending).not.toBe('nazi_consolidation');
  });
  it('保险融资妥协阻断预定倒阁，史实日程不会覆盖玩家保住的政府', () => {
    const s=runSimulation({ endDate:'1930-05-01', choiceOverride:(id,def) => id === 'ev_unemployment_fund_gap' ? 'compromise_contribution' : def });
    expect(s.flags.parliamentaryBudgetDeal).toBe(1);
    expect(s.firedEvents).not.toContain('ev_mueller_fall');
    expect(s.governmentHistory.some(g => g.id === 'gov_bruening1')).toBe(false);
  });
  it('推迟选举后，本局选举和后续事件都采用新的月份', () => {
    const s=runSimulation({ endDate:'1933-06-01', choiceOverride:(id,def) => id === 'ev_reichstag_dissolved_1933' ? 'delay_election' : def });
    expect(s.elections.some(e => e.date.startsWith('1933-03'))).toBe(false);
    expect(s.elections.some(e => e.date.startsWith('1933-05'))).toBe(true);
    expect(s.decisions.find(d => d.eventId === 'ev_election_1933')?.date.startsWith('1933-05')).toBe(true);
  });
  it('随机评估失败不记为发生，并继续处理其他可用事件', () => {
    const s = buildInitialState('sc_1932',1), r = new RNG(1);
    s.date='1932-08-01'; s.cursorDate=s.date;
    s.society.violence=100;
    r.chance = () => false;
    openNextEvent(s,r);
    expect(s.firedEvents).not.toContain('ev_rand_political_murder');
    expect(s.evaluatedEvents?.ev_rand_political_murder).toBeDefined();
  });
  it('只有主动委托才记录系统处理，玩家决策次数不增加', () => {
    const s=buildInitialState(), r=new RNG(1); openNextEvent(s,r); skipPending(s,r);
    expect(s.decisions[0].automatic).toBe(true); expect(s.stats.decisionsMade).toBe(0);
  });
  it('第48条政策统一记账，重复实施不会重复计数，相反政策互相替换', () => {
    const s=buildInitialState('sc_1930');
    enactPolicy(s,'pol_emergency_rule'); enactPolicy(s,'pol_emergency_rule');
    expect(s.stats.article48Count).toBe(1); expect(s.article48).toHaveLength(1);
    enactPolicy(s,'pol_welfare_expand'); enactPolicy(s,'pol_welfare_cut');
    expect(s.activePolicies.some(p => p.policyId === 'pol_welfare_expand')).toBe(false);
    expect(s.activePolicies.some(p => p.policyId === 'pol_welfare_cut')).toBe(true);
  });
  it('到期过渡安排解锁后续事件，延迟落实带有前因记录', () => {
    const s=buildInitialState(); apply(s,'ev_council_congress','dual_power');
    const d=s.delayedEffects.find(d => d.flags?.transitionReviewDue)!;
    s.date=d.triggerDate; s.cursorDate=d.triggerDate; settleDelayed(s);
    expect(dueEvents(s).some(e => e.id === 'ev_transition_review')).toBe(true);
    expect(s.decisionMemory).toHaveLength(1);
    expect(s.log.some(l => l.title === '延迟影响显现' && l.detail.includes('过渡'))).toBe(true);
  });
  it('立即选举与推迟选举真正修改日程', () => {
    const s=buildInitialState(); apply(s,'ev_hitler_appointed','immediate_new_election');
    expect(s.electionSchedule?.some(e => e.date === '1933-03-05')).toBe(true);
    apply(s,'ev_reichstag_dissolved_1933','delay_election');
    expect(s.flags.electionPostponedUntil).toBe('1933-05-01');
  });
  it('政体决定结局类别，皇帝与代表会不使用总统制结局兜底', () => {
    for (const regime of ['constitutional_monarchy','council_republic'] as const) {
      const s=buildInitialState(); s.flags.regime=regime; s.institutions.democraticResilience=80;
      expect(determineEnding(s)).toBe(regime === 'council_republic' ? 'council_governance' : regime);
    }
  });
  it('结束后政策、决策、推进均保持状态不变', () => {
    const s=runSimulation(), before=JSON.stringify(s), r=new RNG(1);
    enactPolicy(s,'pol_expansion'); applyChoice(s,'ev_transition_review','negotiate',r); advanceMonth(s,r);
    expect(JSON.stringify(s) === before).toBe(true);
  });
  it('挑战按每个截止日期结算，截止日决策仍可计入', () => {
    const s=buildInitialState('sc_challenge_ruhr'); s.cursorDate='1924-12-01'; s.economy.inflation=40;
    stepChallenge(s,s.cursorDate,false); expect(s.challenge?.status).toBe('active');
    s.economy.inflation=20; s.institutions.federalCohesion=70;
    stepChallenge(s,s.cursorDate,true); expect(s.challenge?.status).toBe('passed');
  });
  it('存档导入往返保持随机状态；错误导入不破坏当前游戏', () => {
    const s=runSimulation({ endDate:'1920-01-01' });
    const imported=parseSave(exportSave(s));
    expect(imported.elections).toEqual(s.elections); expect(imported.meta.seed).toBe(s.meta.seed);
    expect(imported.decisions).toEqual(s.decisions); expect(imported.decisionMemory).toEqual(s.decisionMemory);
    useGame.getState().start('sc_intervention'); const before=JSON.stringify(useGame.getState().state);
    useGame.getState().importGame('{"format":"bad"}'); expect(JSON.stringify(useGame.getState().state)).toBe(before);
    expect(() => parseSave('{"format":"weimar-save-v1","state":{}}')).toThrow();
  });
  it('负面指标增加不显示为正向收益', () => {
    expect(deltaTone('society.violence',3)).toBe('var(--bad)');
    expect(deltaTone('economy.unemployment',-2)).toBe('var(--good)');
  });
});
