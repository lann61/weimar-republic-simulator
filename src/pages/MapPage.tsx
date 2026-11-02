import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Chip } from '../components/ui';
import { elections } from '../data/elections';
import { MAP_ELECTIONS, MAP_SOURCE, NAMES, PARTIES, geographicPaths, regionResults, type MapCollection } from './historicalMapData';

const cache = new Map<string,Promise<MapCollection>>();
function loadMap(early:boolean) {
  const path='maps/'+(early?'weimar-1919':'weimar-1920-1933')+'.geojson';
  if(!cache.has(path)) cache.set(path,fetch(new URL(path,document.baseURI)).then(r=>{if(!r.ok)throw new Error('地图数据加载失败');return r.json();}).catch(e=>{cache.delete(path);throw e;}));
  return cache.get(path)!;
}
export function MapPage() {
  const {state}=useGame();
  const [mode,setMode]=useState<'history'|'simulation'>('history');
  const [selected,setSelected]=useState('');
  const [gameIndex,setGameIndex]=useState(-1);
  const [hover,setHover]=useState('Berlin');
  const [zoom,setZoom]=useState(1);
  const [data,setData]=useState<MapCollection|null>(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const latest=state?.elections[gameIndex<0?(state.elections.length-1):gameIndex];
  const date=mode==='simulation'&&latest?latest.date: selected || [...MAP_ELECTIONS].reverse().find(e=>e[1]<=(state?.cursorDate??state?.date??''))?.[1] || MAP_ELECTIONS[0][1];
  const reference=[...MAP_ELECTIONS].reverse().find(e=>e[1]<=date)??MAP_ELECTIONS[0];
  const key=reference[0],early=key==='1919';
  useEffect(()=>{
    let active=true;setData(null);setError('');
    loadMap(early).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(String(e.message));});
    return()=>{active=false;};
  },[early,retry]);
  const paths=useMemo(()=>data?geographicPaths(data.features):[],[data]);
  const local=useMemo(()=>{
    const results=new Map<number,ReturnType<typeof regionResults>>();
    for(const region of data?.features??[]) {
      const raw=regionResults(region,key);
      if(mode==='history'||!latest) {results.set(region.properties.Id,raw);continue;}
      const national=elections.find(e=>e.date===reference[1]);
      const share=(party:string,record:'base'|'game')=>{
        const ids=party==='Zentrum/BVP'?['zentrum','bvp']:[PARTIES[party]?.gameId??''];
        return ids.reduce((n,id)=>n+(record==='game'?(latest.results.find(r=>r.partyId===id)?.share??0):(national?.results.find(r=>r.party_id===id)?.vote_share??0)),0);
      };
      const rows=raw.rows.map(r=>({party:r.party,share:r.share*(share(r.party,'base')>0?share(r.party,'game')/share(r.party,'base'):1)}));
      const total=rows.reduce((n,r)=>n+r.share,0);
      results.set(region.properties.Id,{rows:rows.map(r=>({...r,share:total?r.share/total*100:0})).sort((a,b)=>b.share-a.share),incomplete:raw.incomplete});
    }
    return results;
  },[data,key,mode,latest,reference]);
  if(!state)return null;
  const active=paths.find(p=>p.feature.properties.deuName===hover)??paths[0];
  const info=active?local.get(active.feature.properties.Id):undefined;
  const legend=[...new Set([...local.values()].map(v=>v.rows[0]?.party).filter(Boolean))];
  const position=MAP_ELECTIONS.findIndex(e=>e[0]===key);
  const future=mode==='history'&&reference[1]>(state.cursorDate??state.date);
  const selectStyle={background:'#211f1b',color:'var(--ivory)',padding:8,border:'1px solid var(--line)'};
  return <>
    <h2 className="page-title">历史地图</h2>
    <div className="page-sub">真实历史区域边界 · {mode==='history'?'逐区史实得票':'本局全国结果的地区投影估算'} · {mode==='history'?reference[2]:latest?.label} · {date}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginBottom:16}}>
      <button className={'btn sm '+(mode==='history'?'solid':'')} onClick={()=>setMode('history')}>史实选举地图</button>
      <button className={'btn sm '+(mode==='simulation'?'solid':'')} disabled={!state.elections.length} onClick={()=>setMode('simulation')}>本局结果投影</button>
      {mode==='history'?<>
        <button className="btn sm" aria-label="上一次选举地图" disabled={position===0} onClick={()=>setSelected(MAP_ELECTIONS[position-1][1])}>←</button>
        <select aria-label="历史选举地图年份" value={reference[1]} onChange={e=>setSelected(e.target.value)} style={selectStyle}>
          {MAP_ELECTIONS.map(e=><option key={e[0]} value={e[1]}>{e[2]} · {e[1]}</option>)}
        </select>
        <button className="btn sm" aria-label="下一次选举地图" disabled={position===MAP_ELECTIONS.length-1} onClick={()=>setSelected(MAP_ELECTIONS[position+1][1])}>→</button>
      </>:<select aria-label="本局选举地图" value={gameIndex<0?state.elections.length-1:gameIndex} onChange={e=>setGameIndex(Number(e.target.value))} style={selectStyle}>{state.elections.map((e,i)=><option key={e.id} value={i}>{e.date} · {e.label}</option>)}</select>}
      <Chip>{mode==='history'?'史实档案':'模型估算'}</Chip>
    </div>
    {future&&<div className="page-sub">正在浏览历史档案；该次选举尚未在本局发生。</div>}
    {mode==='simulation'&&<div className="page-sub">真实边界上的地区估算：以历史地区差异和本局全国得票变化投影，不是逐区真实开票数据，不参与游戏结算。</div>}
    <div className="grid" style={{gridTemplateColumns:'minmax(0,1fr) 280px',alignItems:'start'}}>
      <Panel title="选区政治地理" sub={early?'1919 年国民议会选举边界（含西普鲁士、波森等历史区域）':'1920—1933 年魏玛德国疆域与 35 个历史选区'}>
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <button className="btn sm" aria-label="放大历史地图" disabled={zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.5))}>＋</button>
          <button className="btn sm" aria-label="缩小历史地图" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.5))}>－</button>
          <button className="btn sm" onClick={()=>setZoom(1)}>重置视图</button>
          <span className="srcline">颜色：各区得票第一党 · 悬停、点击或键盘选择区域</span>
        </div>
        {error?<div role="alert">{error} <button className="btn sm" onClick={()=>setRetry(n=>n+1)}>重新加载</button></div>:!data?<p role="status">正在加载历史地理数据…</p>:<div style={{overflow:'auto',maxHeight:650,background:'#171e24',border:'1px solid var(--line)'}}>
          <svg role="img" aria-label={reference[2]+'真实历史选区地图'} viewBox="0 0 1000 760" style={{display:'block',width:(zoom*100)+'%',height:'auto',minHeight:330}}>
            <text x="150" y="82" fill="#82989f" fontSize="15" letterSpacing="5">北 海</text><text x="565" y="90" fill="#82989f" fontSize="15" letterSpacing="5">波 罗 的 海</text>
            {paths.map(({feature,path})=>{
              const result=local.get(feature.properties.Id),winner=result?.rows[0],name=feature.properties.deuName;
              return <path key={feature.properties.Id} data-region={name} d={path} fill={PARTIES[winner?.party??'']?.color??'#6a6b65'} fillRule="evenodd" stroke={name===active?.feature.properties.deuName?'#fff3cf':'#252522'} strokeWidth={name===active?.feature.properties.deuName?2.2:.8} vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={(NAMES[name]??name)+'，'+(winner?.party??'无数据')} onFocus={()=>setHover(name)} onMouseEnter={()=>setHover(name)} onClick={()=>setHover(name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setHover(name);}} style={{cursor:'pointer'}}>
                <title>{NAMES[name]??name} / {name} — {winner?winner.party+' '+winner.share.toFixed(1)+'%':'无数据'}</title>
              </path>;
            })}
            <text x="25" y="741" fill="#9ba4a4" fontSize="12">历史边界 · 墨卡托投影 · 东普鲁士按真实地理位置绘制</text>
          </svg>
        </div>}
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:14}}>{legend.map(p=><span key={p} style={{fontSize:11}}><span className="dot" style={{background:PARTIES[p]?.color??'#82847e',marginRight:5}}/>{PARTIES[p]?.name??p}</span>)}</div>
      </Panel>
      <Panel title="选区详情" sub="历史区域与得票结构">
        {active&&<><div style={{fontSize:21,fontFamily:'var(--font-display)'}}>{NAMES[active.feature.properties.deuName]??active.feature.properties.deuName}</div><div className="srcline" style={{marginBottom:15}}>{active.feature.properties.deuName}</div>
          <div className="srcline">{mode==='history'?'来源记录的得票率，保留原始口径':'本局全国得票投影估算'}</div>
          {info?.rows.map(r=><div className="kv" key={r.party}><span style={{color:PARTIES[r.party]?.color??'#aaa'}}>{r.party}</span><span className="v">{r.share.toFixed(1)}%</span></div>)}
          {info?.incomplete&&<p className="srcline">此区来源统计存在缺项或口径差异；史实值没有补造或强制归一化。</p>}
        </>}
        <p className="srcline">1919 年与后来选举使用不同边界文件。1919 年按来源可用的 36 个区域绘制；未提供的区域没有补绘。</p>
        <p className="srcline">中央党与 BVP 按史料合并口径显示。</p>
      </Panel>
    </div>
    <Panel title="地区选举变化" sub="点击地区行可在地图中定位" style={{marginTop:16}}>
      <div className="scroll-x"><table className="data"><thead><tr><th>历史选区</th><th>第一党</th><th>得票率</th><th>第二党</th><th>得票率</th></tr></thead><tbody>
        {paths.map(({feature})=>{const result=local.get(feature.properties.Id),a=result?.rows[0],b=result?.rows[1];return <tr key={feature.properties.Id} onClick={()=>setHover(feature.properties.deuName)} style={{cursor:'pointer',background:hover===feature.properties.deuName?'rgba(185,154,98,.12)':undefined}}><td>{NAMES[feature.properties.deuName]??feature.properties.deuName}</td><td style={{color:PARTIES[a?.party??'']?.color}}>{a?.party??'—'}</td><td>{a?a.share.toFixed(1)+'%':'—'}</td><td>{b?.party??'—'}</td><td>{b?b.share.toFixed(1)+'%':'—'}</td></tr>;})}
      </tbody></table></div>
    </Panel>
    <div className="srcline" style={{marginTop:16,lineHeight:1.9}}>地理边界与逐区选举数据：<a href={MAP_SOURCE} target="_blank" rel="noreferrer">GHDI / 德国历史研究所，Reichstag Elections 1919–1933</a>。制图资料：Gabriel Moss（MossMaps）与 Erik Jensen，2024。<a href="https://germanhistorydocs.org/en/terms" target="_blank" rel="noreferrer">来源使用说明（教育与非商业用途）</a>。</div>
  </>;
}
