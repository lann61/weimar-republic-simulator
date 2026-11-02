import type { GameState, WorldEventRecord, WorldEventCategory } from '../types';
import { RNG, clamp } from '../engine/random';
import { addMonths } from '../engine/date';
import { getPath } from '../engine/state';
import { changeVars } from '../politics/rules';
import { WORLD_EVENTS, WORLD_CATEGORIES } from './worldCatalog';

const stream = (s:GameState) => {const rng=new RNG(s.meta.seed ^ 0x574f524c);rng.fastForward(s.worldEvents?.rngCalls??0);return rng;};
export function ensureWorldEvents(s:GameState) {
  if(s.worldEvents)return;
  const rng=stream(s);
  s.worldEvents={nextDate:addMonths(s.date,2+Math.floor(rng.next()*2)).slice(0,7)+'-01',rngCalls:rng.calls,records:[]};
}
function vulnerability(s:GameState,category:WorldEventCategory) {
  const risk={
    international:(s.diplomacy.isolation+(100-s.diplomacy.capitalConfidence))/200,
    economic:(s.economy.unemployment/60+(100-s.economy.bankLiquidity)/100)/2,
    political:((100-s.institutions.partyCompromise)+(100-s.institutions.governmentLegitimacy))/200,
    popular:(s.society.polarization+s.society.violence)/200,
    social:(s.society.poverty+(100-s.society.socialTrust))/200,
  };
  return clamp(risk[category],0,1);
}
function apply(s:GameState,record:WorldEventRecord,vars:Record<string,number>,tail:boolean) {
  const before=Object.fromEntries(Object.keys(vars).map(path=>[path,getPath(s,path)]));
  changeVars(s,vars,`局势事件${tail?'持续影响':''}：${record.title}`);
  for(const path of Object.keys(vars))record.cumulative[path]=(record.cumulative[path]??0)+getPath(s,path)-before[path];
}
/** 每月仅调用一次：先结算过去事件的余波，再按持久化的 2—3 月日程生成新事件。 */
export function stepWorldEvents(s:GameState):WorldEventRecord|undefined {
  if(s.meta.ended)return;
  ensureWorldEvents(s);
  const world=s.worldEvents!;
  if(world.lastProcessedMonth===s.date.slice(0,7))return;
  world.lastProcessedMonth=s.date.slice(0,7);
  for(const record of world.records)if(record.remaining>0&&record.date.slice(0,7)<s.date.slice(0,7)) {
    apply(s,record,record.monthly,true);record.remaining--;
  }
  if(s.date.slice(0,7)<world.nextDate.slice(0,7))return;
  const rng=stream(s),recent=world.records.slice(-3);
  const candidates=WORLD_EVENTS.filter(t=>!recent.some(r=>r.templateId===t.id));
  const weights=candidates.map(t=>(t.favorable?1.3-vulnerability(s,t.category):.75+vulnerability(s,t.category))*(recent[recent.length-1]?.category===t.category ? .4 : 1));
  let draw=rng.next()*weights.reduce((a,b)=>a+b,0),index=0;
  for(;index<weights.length-1;index++){draw-=weights[index];if(draw<0)break;}
  const template=candidates[index],risk=vulnerability(s,template.category);
  const intensity=rng.range(.7,1.15)*(template.favorable?1: .85+risk*.6);
  const duration=3+Math.floor(rng.next()*4);
  const initial=Object.fromEntries(Object.entries(template.vars).map(([path,v])=>[path,Number((v*intensity).toFixed(3))]));
  const record:WorldEventRecord={id:`world_${s.date}_${world.records.length}`,templateId:template.id,date:s.date,
    category:template.category,favorable:template.favorable,title:template.title,description:template.description,
    transmission:template.transmission,context:`事件发生时：失业率 ${s.economy.unemployment.toFixed(1)}%，银行流动性 ${s.economy.bankLiquidity.toFixed(0)}，社会极化 ${s.society.polarization.toFixed(0)}，政府合法性 ${s.institutions.governmentLegitimacy.toFixed(0)}，国际资本信心 ${s.diplomacy.capitalConfidence.toFixed(0)}。`,
    intensity,duration,remaining:duration,monthly:Object.fromEntries(Object.entries(initial).map(([path,v])=>[path,Number((v*.18).toFixed(3))])),cumulative:{}};
  apply(s,record,initial,false);world.records.push(record);
  world.nextDate=addMonths(s.date,2+Math.floor(rng.next()*2)).slice(0,7)+'-01';world.rngCalls=rng.calls;
  s.log.push({id:record.id,date:record.date,type:'news',title:`局势突发：${record.title}`,
    detail:`${record.description} ${record.transmission} 后续影响持续 ${duration} 个月，可与其他事件叠加。无需选择，已自动生效。`,importance:'major',causes:[record.context]});
  return record;
}
export {WORLD_CATEGORIES};
