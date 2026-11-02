import { Panel, Chip, Empty } from './ui';
import type { buildReportAnalysis } from '../simulation/engine/reportAnalysis';
import { WORLD_CATEGORIES } from '../simulation/events/worldCatalog';
import { labelFor } from '../utils/labels';

type Analysis=ReturnType<typeof buildReportAnalysis>;
const signed=(v:number)=>`${v>=0?'+':''}${v.toFixed(2)}`;
const ratio=(path:string)=>['economy.unemployment','economy.inflation','economy.debt'].includes(path);
const number=(path:string,value:number)=>value.toFixed(1)+(ratio(path)?'%':'');

export function ReportSynthesis({analysis:a}:{analysis:Analysis}) {
  return <>
    <Panel title="政治与社会总结" sub="依据本局实际状态、月度轨迹和记录形成评估" style={{marginTop:16}}>
      <p style={{fontSize:13,lineHeight:1.9,marginTop:0}}>{a.conclusion}</p>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))'}}>
        {a.narratives.map(n=><div key={n.title} style={{padding:'12px 0',borderTop:'1px solid var(--line)'}}>
          <h3 style={{fontSize:15,color:'var(--brass)',margin:'0 0 8px'}}>{n.title}</h3>
          <p style={{fontSize:12,lineHeight:1.9,color:'var(--ivory-dim)',margin:0}}>{n.text}</p>
        </div>)}
      </div>
    </Panel>
    <Panel title="全局演变与社会代价" sub="起点 → 观察截止值；高低点仅限已保存的月度样本和当前状态" style={{marginTop:16}}>
      <div className="scroll-x"><table className="data"><thead><tr>
        <th>指标</th><th>起点</th><th>截止值</th><th>净变化</th><th>样本最低点</th><th>样本最高点</th>
      </tr></thead><tbody>{a.metrics.map(m=><tr key={m.path}>
        <td>{m.label}</td><td className="num">{m.start===undefined?'未记录':number(m.path,m.start)}</td>
        <td className="num">{number(m.path,m.current)}</td><td className="num">{m.change===undefined?'—':signed(m.change)+(ratio(m.path)?' 个百分点':'')}</td>
        <td className="num">{number(m.path,m.low.value)}<div className="srcline">{m.low.date}</div></td>
        <td className="num">{number(m.path,m.high.value)}<div className="srcline">{m.high.date}</div></td>
      </tr>)}</tbody></table></div>
      <p className="srcline">工业生产以 1928≈100 为参照；公共债务为 GDP 占比；其他社会与制度数值按模型指标口径读取。旧存档没有记录的起点不作补算。</p>
    </Panel>
  </>;
}

export function ReportHistory({analysis:a}:{analysis:Analysis}) {
  return <>
    <div className="grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))',alignItems:'start',marginTop:16}}>
      <Panel title="执政更迭与治理连续性" sub="仅列本局观察期内任职区间">
        {a.governments.length===0?<Empty text="暂无政府任职记录"/>:<div className="timeline">{a.governments.map(g=><div className="timeline-item" key={g.id}>
          <div className="timeline-date">{g.from} — {g.to} · {g.days} 天</div>
          <div style={{fontSize:13}}>{g.name}</div><div className="srcline">首脑：{g.leader} · {g.reason}</div>
        </div>)}</div>}
      </Panel>
      <Panel title="选举力量的重组" sub={a.firstElectionDate?`${a.firstElectionDate} → ${a.lastElectionDate}（含情景起点的上届选举基线）`:'尚无选举基线'}>
        {!a.partyChanges.length?<Empty text="尚未举行选举"/>:<div className="scroll-x"><table className="data"><thead><tr><th>政党</th><th>末次得票</th><th>末次席位</th><th>较首次变化</th></tr></thead>
          <tbody>{a.partyChanges.map(p=><tr key={p.id}><td>{p.label}</td><td>{p.share.toFixed(1)}%</td><td>{p.seats}</td><td>{p.change===undefined?'无可比基线':signed(p.change)+' 个百分点'}</td></tr>)}</tbody></table></div>}
        <p className="srcline">这里比较已举行选举的结果，不把当前民调支持度当作选票。仅有一次选举时，变化为零。</p>
      </Panel>
    </div>
    <Panel title="独立局势事件与累积影响" sub="每 2—3 个月自动发生；无需选择，余波可以叠加" style={{marginTop:16}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <Chip>共 {a.worldSummary.total} 次</Chip><Chip>缓和型 {a.worldSummary.favorable} 次</Chip>
        <Chip>压力型 {a.worldSummary.total-a.worldSummary.favorable} 次</Chip><Chip>仍有余波 {a.worldSummary.active} 次</Chip>
        {a.worldSummary.categories.map(c=><Chip key={c.label}>{c.label} {c.count}</Chip>)}
      </div>
      <p className="srcline">这些事件是时代背景下的模拟变量，不代表新增史实。事件会影响经济、外交、社会与制度，并通过月度反馈传导至选民与政治格局。史实复现模式仍保留原有史实选举和任命规则。</p>
      {a.worldRecords.length===0?<Empty text="本局尚未发生独立局势事件；旧存档从载入后的时间开始累计。"/>:<>
        <details style={{marginBottom:16}}><summary style={{cursor:'pointer',color:'var(--brass)',fontSize:13}}>查看已生效的直接冲击累计</summary>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px 22px',paddingTop:12}}>{a.worldSummary.effects.map(e=><span key={e.path} style={{fontSize:12}}>{e.label} {signed(e.delta)}</span>)}</div>
          <p className="srcline">仅累加自动事件实际施加的直接数值变化，已计入指标上下限；不包含系统反馈，不能直接当作“没有事件时”的差值或结局归因比例。百分比指标的变化单位为百分点。</p>
        </details>
        {[...a.worldRecords].reverse().map((r,index)=><details key={r.id} open={index<2} style={{borderTop:'1px solid var(--line)',padding:'12px 0'}}>
          <summary style={{cursor:'pointer',fontSize:13,lineHeight:1.8}}><span className="num" style={{color:'var(--smoke)',marginRight:10}}>{r.date}</span>{r.title} <span className="srcline">· {WORLD_CATEGORIES[r.category]} · {r.favorable?'缓和型':'压力型'} · {r.remaining>0?`余波剩 ${r.remaining} 个月`:'余波结算完毕'}</span></summary>
          <p style={{fontSize:12,lineHeight:1.8}}>{r.description}</p>
          <p style={{fontSize:12,lineHeight:1.8,color:'var(--ivory-dim)'}}>传导：{r.transmission}</p>
          <p className="srcline">{r.context} 冲击强度 {r.intensity.toFixed(2)} 倍；即时生效，之后持续 {r.duration} 个月。</p>
          <div className="srcline" style={{lineHeight:1.9}}>已生效直接影响：{Object.entries(r.cumulative).map(([path,v])=>`${labelFor(path)} ${signed(v)}`).join('；')}。</div>
        </details>)}
      </>}
    </Panel>
  </>;
}
