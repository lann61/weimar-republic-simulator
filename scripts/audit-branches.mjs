/** npm run audit:branches — 可达状态分叉后继续到结局，输出覆盖与不变量检查。 */
import fs from 'node:fs';
import { events, eventMap } from '../src/data/events/index.ts';
import { scenarios } from '../src/data/scenarios.ts';
import { buildInitialState } from '../src/simulation/engine/state.ts';
import { advanceMonth, openNextEvent, resolvePending } from '../src/simulation/engine/step.ts';
import { RNG } from '../src/simulation/engine/random.ts';

const offered = new Set();
const states = new Map(), covered = new Set(), failures = [], runs = [];
function play(s,r,pick,collect) {
  let date=s.cursorDate ?? s.date;
  for(let n=0;n<1800&&!s.meta.ended;n++) {
    if(s.pendingEvent) {
      const e=eventMap.get(s.pendingEvent.eventId); offered.add(e.id);
      if(collect&&!states.has(e.id)) states.set(e.id,{json:JSON.stringify(s),calls:r.calls});
      const choice=e.choices[pick(e)]; covered.add(e.id+'/'+choice.id);
      resolvePending(s,choice.id,r);
    } else advanceMonth(s,r);
    const next=s.cursorDate??s.date;
    if(next<date) failures.push('日期倒退：'+date+' → '+next);
    date=next;
    for(const p of Object.values(s.parties)) if(p.banned&&p.seats!==0) failures.push('被禁政党仍有议席：'+p.id);
    if(s.flags.onePartyState&&s.society.mediaFreedom>8) failures.push('一党制新闻自由越过约束');
  }
  if(!s.meta.ended) failures.push('模拟未结束：'+s.meta.scenarioId);
  for(const section of ['economy','society','institutions','diplomacy']) if(Object.values(s[section]).some(v=>!Number.isFinite(v))) failures.push('无效指标：'+section);
  return s;
}
for(const sc of scenarios) for(let strategy=0;strategy<3;strategy++) for(const seed of [1,42,19181109]) {
  const s=buildInitialState(sc.id,seed),r=new RNG(seed);openNextEvent(s,r);
  play(s,r,()=>strategy,true);
  runs.push({scenario:sc.id,strategy,seed,date:s.date,ending:s.meta.ending,decisions:s.decisions.length,unemployment:+s.economy.unemployment.toFixed(2),output:+s.economy.output.toFixed(2),challenge:s.challenge?.status});
}
let forks=0; const branchResults=[];
for(const [id,rec] of states) {
  const results=[];
  for(const c of eventMap.get(id).choices) {
    const s=JSON.parse(rec.json),r=new RNG(s.meta.seed);r.fastForward(rec.calls);
    covered.add(id+'/'+c.id);resolvePending(s,c.id,r);play(s,r,()=>0,false);forks++;
    results.push({choice:c.id,ending:s.meta.ending,regime:s.flags.regime,events:s.decisions.map(d=>d.eventId),unemployment:+s.economy.unemployment.toFixed(6),elections:s.elections.map(e=>e.results.map(r=>r.partyId+':'+r.seats).join(','))});
  }
  branchResults.push({id,endingChanges:new Set(results.map(r=>r.ending)).size>1,eventChanges:new Set(results.map(r=>r.events.join('|'))).size>1,electionChanges:new Set(results.map(r=>r.elections.join('|'))).size>1,results});
}
const summary={version:'2.2.1',scenarios:scenarios.length,runs:runs.length,forks,eventCount:events.length,choiceCount:events.reduce((n,e)=>n+e.choices.length,0),offeredEvents:offered.size,coveredChoices:covered.size,notOffered:events.filter(e=>!offered.has(e.id)).map(e=>e.id),changingEndings:branchResults.filter(r=>r.endingChanges).length,changingEvents:branchResults.filter(r=>r.eventChanges).length,changingElections:branchResults.filter(r=>r.electionChanges).length,failures:[...new Set(failures)]};
fs.writeFileSync(new URL('../docs/V2.2_BRANCH_AUDIT.json',import.meta.url),JSON.stringify({summary,runs,branchResults},null,2));
console.log(JSON.stringify(summary,null,2));
if(failures.length) process.exitCode=1;
