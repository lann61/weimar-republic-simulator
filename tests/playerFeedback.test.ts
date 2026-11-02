import { expect,it } from 'vitest';
import { buildInitialState } from '../src/simulation/engine/state';
import { RNG } from '../src/simulation/engine/random';
import { eventMap } from '../src/data/events';
import { adaptEventText } from '../src/simulation/events/adapter';
import { runElection,checkGovernmentSurvival } from '../src/simulation/elections/run';
import { advanceMonth,openNextEvent,resolvePending } from '../src/simulation/engine/step';

it('韦尔斯执政的高锚定干预局：卡片标题、背景、全部选项与参与者都使用本局政府',()=>{
  const s=buildInitialState('sc_intervention');
  s.government.chancellorId='person_wels';s.government.name_zh='韦尔斯联合内阁';s.government.isHistorical=false;
  for(const id of ['ev_bruening_cabinet','ev_austerity_debate','ev_papen_cabinet']) {
    const e=adaptEventText(s,eventMap.get(id)!);
    expect(JSON.stringify(e)).not.toMatch(/布吕宁|巴本|帕本/);
    expect(e.background).toContain('奥托·韦尔斯');expect(e.participants).toContain('person_wels');
  }
});

it('干预模式选举按实际席位组阁，高锚定也不能保留指定历史政府',()=>{
  const s=buildInitialState('sc_1930');s.meta.mode='intervention';s.meta.divergence=0;
  s.government.chancellorId='person_wels';
  for(const g of Object.values(s.voterGroups)) for(const id of Object.keys(g.affinity)) g.affinity[id]=id==='zentrum'?100:0.01;
  const before=s.government.id;
  const record=runElection(s,new RNG(42),{date:'1930-09-14',historicalId:'election_1930_09',type:'reichstag',label:'测试选举',trigger:'schedule'});
  expect(s.government.id).not.toBe(before);expect(s.government.id).not.toBe('gov_bruening1');
  expect(s.government.parties).toContain('zentrum');expect(record.governmentFormed).toBe(s.government.name_zh);
  expect(s.government.startDate).toBe('1930-09-14');
});

it('拥有议会支持的稳定政府不会因为任期长而被随机倒阁',()=>{
  const s=buildInitialState('sc_1930');s.government.startDate='1925-01-01';
  s.parliamentSeatsTotal=100;s.government.parties=['spd'];s.government.supportParties=[];
  s.parties.spd.seats=80;s.institutions.governmentLegitimacy=70;s.institutions.partyCompromise=70;
  const r=new RNG(1);r.chance=()=>true;
  expect(checkGovernmentSurvival(s,r).fall).toBe(false);
});

it('失去多数时先展示信任危机，未作决定之前不偷偷更换总理',()=>{
  const s=buildInitialState('sc_1932');s.government.startDate='1930-01-01';
  const id=s.government.chancellorId,r=new RNG(1);advanceMonth(s,r);
  expect(s.government.chancellorId).toBe(id);
  expect(s.flags.cabinetReviewDue).toBe(1);
});

function locarnoFork(choice:string) {
  const s=buildInitialState('sc_intervention',42),r=new RNG(42);openNextEvent(s,r);
  for(let i=0;i<1000;i++){
    if(s.pendingEvent?.eventId==='ev_locarno')break;
    if(s.pendingEvent)resolvePending(s,eventMap.get(s.pendingEvent.eventId)!.choices[0].id,r);else advanceMonth(s,r);
  }
  expect(s.pendingEvent?.eventId).toBe('ev_locarno');resolvePending(s,choice,r);
  for(let n=0;n<12;n++){
    while(s.pendingEvent)resolvePending(s,eventMap.get(s.pendingEvent.eventId)!.choices[0].id,r);
    advanceMonth(s,r);
  }
  return s;
}
it('同种子同一节点只改变外交选择：十二个月后经济、外交与社会仍有可测的差异',()=>{
  const cooperate=locarnoFork('sign_locarno'),confront=locarnoFork('refuse_locarno');
  expect(cooperate.date).toBe(confront.date);
  expect(cooperate.diplomacy.relationFrance-confront.diplomacy.relationFrance).toBeGreaterThan(8);
  expect(cooperate.economy.output-confront.economy.output).toBeGreaterThan(1);
  expect(confront.economy.unemployment-cooperate.economy.unemployment).toBeGreaterThan(.4);
  expect(cooperate.diplomacy.capitalConfidence-confront.diplomacy.capitalConfidence).toBeGreaterThan(2);
  expect(Math.abs(cooperate.society.violence-confront.society.violence)).toBeGreaterThan(.1);
});
