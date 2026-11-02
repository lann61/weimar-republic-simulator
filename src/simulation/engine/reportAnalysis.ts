import type { GameState, Snapshot } from '../types';
import { getPath } from './state';
import { labelFor } from '../../utils/labels';
import { personMap } from '../../data/people';
import { partyMap } from '../../data/parties';
import { WORLD_CATEGORIES } from '../events/worldCatalog';

export function buildReportAnalysis(s:GameState) {
  const now=s.cursorDate??s.date,first=s.snapshots[0];
  const metrics=[
    'institutions.parliamentAuthority','institutions.democraticResilience','institutions.emergencyDependence',
    'institutions.judicialIndependence','institutions.partyCompromise','institutions.governmentLegitimacy',
    'economy.unemployment','economy.inflation','economy.output','economy.realWages','economy.debt',
    'society.poverty','society.satisfaction','society.socialTrust','society.polarization','society.violence',
    'society.mediaFreedom','society.womenParticipation','society.republicSupport',
    'diplomacy.capitalConfidence','diplomacy.isolation','diplomacy.prestige',
  ].map(path=>{
    const [section,key]=path.split('.');
    const read=(snapshot:Snapshot)=>((snapshot[section as 'economy'] as Record<string,number>|undefined)?.[key]);
    const start=first?read(first):undefined,current=getPath(s,path);
    const samples=s.snapshots.map(snapshot=>({date:snapshot.date,value:read(snapshot)})).filter((p):p is {date:string;value:number}=>Number.isFinite(p.value));
    samples.push({date:now,value:current});
    const high=samples.reduce((a,b)=>b.value>a.value?b:a),low=samples.reduce((a,b)=>b.value<a.value?b:a);
    return {path,label:labelFor(path),start,current,change:start===undefined?undefined:current-start,high,low};
  });
  const i=s.institutions,c=s.society,e=s.economy,d=s.diplomacy;
  const regime=String(s.flags.regime??'republic');
  const regimeName=regime==='constitutional_monarchy'?'君主立宪体制':regime==='council_republic'?'代表会体制':regime==='authoritarian'?'威权体制':'共和国体制';
  const narratives=[
    {title:'权力结构与制度遗产',text:`本局最终观察到的政治安排为${regimeName}。${s.flags.enablingActPassed?'《授权法》已获通过，议会立法制衡受到制度性削弱。':i.parliamentAuthority>=60&&i.judicialIndependence>=50?'议会与司法仍具有较强制衡能力，行政权需要面对公开审议和法律约束。':i.emergencyDependence>=55?'紧急治理已成为权力运作的重要渠道，行政权对常态协商的依赖减弱。':'议会、司法与行政之间仍存在制衡，但其稳定程度取决于协商和法律约束能否延续。'}议会权威 ${i.parliamentAuthority.toFixed(0)}、司法独立 ${i.judicialIndependence.toFixed(0)}、紧急法令依赖 ${i.emergencyDependence.toFixed(0)}。`},
    {title:'政治竞争与治理能力',text:`政党妥协能力 ${i.partyCompromise.toFixed(0)}，政府合法性 ${i.governmentLegitimacy.toFixed(0)}，文官对军队的控制 ${i.militarySubordination.toFixed(0)}。${s.flags.onePartyState?'政党竞争已受到一党体制限制，不能用选举表象判断政治开放程度。':i.partyCompromise<35?'协商基础薄弱，政府更容易受到联盟分裂和街头压力的双重挤压。':'政党之间仍有协商空间，但能否稳定执政，还取决于席位、公众信任与政策结果。'}政府变动和第48条记录见下方年表；更迭次数本身不等同于制度崩溃。`},
    {title:'社会整合与群众政治',text:`社会信任 ${c.socialTrust.toFixed(0)}、极化 ${c.polarization.toFixed(0)}、政治暴力 ${c.violence.toFixed(0)}。${c.polarization>60||c.violence>55?'群体对立或暴力动员处于高位，日常争议容易转化为对制度合法性的对抗。':c.socialTrust>55?'互信仍为社会合作提供基础，和平表达与社会组织有助于缓冲冲突。':'社会合作基础有限，即使街头暂时平静，疏离感与不信任仍可能累积。'}新闻自由 ${c.mediaFreedom.toFixed(0)}、文化自由 ${c.culturalFreedom.toFixed(0)}、女性社会参与 ${c.womenParticipation.toFixed(0)}；${c.mediaFreedom<30?'公开表达受到严重限制，低抗议水平不能直接解释为公众认同。':'表达空间仍需结合政治自由和社会参与共同判断。'}`},
    {title:'民生分配与经济基础',text:`失业率 ${e.unemployment.toFixed(1)}%，青年失业 ${c.youthUnemployment.toFixed(1)}，贫困指标 ${c.poverty.toFixed(0)}，实际工资 ${e.realWages.toFixed(0)}。${e.unemployment>20||c.poverty>50?'就业和贫困压力使家庭缓冲能力不足，既会压低消费，也会增加激进动员的吸引力。':'就业与生活条件为秩序提供了一定支撑，但平均指标不能证明各阶层同等受益。'}工业生产 ${e.output.toFixed(0)}、公共债务/GDP ${e.debt.toFixed(1)}%；生产恢复、分配改善和财政可持续性需要分别评估。`},
    {title:'国际环境与外部脆弱性',text:`国际资本信心 ${d.capitalConfidence.toFixed(0)}，外交孤立 ${d.isolation.toFixed(0)}，银行流动性 ${e.bankLiquidity.toFixed(0)}。${d.isolation>55||e.bankLiquidity<35?'外交或金融缓冲偏弱，海外收贷与贸易摩擦容易向国内就业、财政和政治信任传导。':'外交联系与金融缓冲提供了一定回旋空间，但仍无法消除外部冲击。'}赔款压力 ${d.reparationsPressure.toFixed(0)}、边境压力 ${d.borderPressure.toFixed(0)}；国内制度与国际环境相互制约。`},
  ];
  const records=s.worldEvents?.records??[];
  const worldSummary={total:records.length,favorable:records.filter(r=>r.favorable).length,
    active:records.filter(r=>r.remaining>0).length,categories:Object.entries(WORLD_CATEGORIES).map(([id,label])=>({label,count:records.filter(r=>r.category===id).length})),
    effects:Object.entries(records.reduce((acc,r)=>{for(const [path,delta]of Object.entries(r.cumulative))acc[path]=(acc[path]??0)+delta;return acc;},{} as Record<string,number>)).map(([path,delta])=>({path,label:labelFor(path),delta}))};
  const governmentRecords=[...s.governmentHistory.filter(g=>g.id!==s.government.id||g.startDate!==s.government.startDate),s.government]
    .filter((g,index,all)=>all.findIndex(x=>x.id===g.id&&x.startDate===g.startDate)===index)
    .filter(g=>g.startDate<=now&&(!g.endDate||g.endDate>=s.meta.startDate)).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const governments=governmentRecords.map((g,index)=>{
      const from=g.startDate<s.meta.startDate?s.meta.startDate:g.startDate,to=g.endDate&&g.endDate<now?g.endDate:now;
      const current=g.id===s.government.id&&g.startDate===s.government.startDate,next=governmentRecords[index+1];
      return {id:g.id+g.startDate,name:g.name_zh,leader:personMap.get(g.chancellorId)?.name_zh??g.chancellorId,from,to,
        days:Math.max(0,Math.floor((Date.parse(to)-Date.parse(from))/86400000)),reason:current?'观察截止时仍在任':next?`任期结束；后续政府为${next.name_zh}`:'任期结束，未记录后续政府'};
    });
  const firstElection=s.elections[0],lastElection=s.elections[s.elections.length-1];
  const partyChanges=lastElection?.results.map(r=>{
    const old=firstElection?.results.find(p=>p.partyId===r.partyId);
    return {id:r.partyId,label:partyMap.get(r.partyId)?.short_name??r.partyId,share:r.share,seats:r.seats,change:old?r.share-old.share:undefined};
  }).sort((a,b)=>b.seats-a.seats)??[];
  return {metrics,narratives,worldSummary,worldRecords:records,governments,partyChanges,
    firstElectionDate:firstElection?.date,lastElectionDate:lastElection?.date,
    conclusion:`${s.meta.ended?'本局观察已结束':'本局仍在推演，以下判断仅对应当前时点'}。制度承受力、民生状况和社会整合共同塑造了当前结果，无法仅凭某次选择或一次突发事件解释全部变化。玩家主动选择 ${s.decisions.filter(x=>!x.automatic).length} 次，系统处理 ${s.decisions.filter(x=>x.automatic).length} 次，独立局势事件 ${records.length} 次。下方将实际轨迹、选择记录和外部冲击分别呈现；未进行对照推演，不能据此给出各因素对结局的因果占比。`};
}
