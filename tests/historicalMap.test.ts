import { expect,it } from 'vitest';
import early from '../public/maps/weimar-1919.geojson?raw';
import later from '../public/maps/weimar-1920-1933.geojson?raw';
import { geographicPaths, regionResults, MAP_ELECTIONS, NAMES, type MapCollection } from '../src/pages/historicalMapData';

it('历史地图具有分时期的真实多边形，后期35区包含黑森—达姆施塔特',()=>{
  const a=JSON.parse(early) as MapCollection,b=JSON.parse(later) as MapCollection;
  expect(a.features).toHaveLength(36);expect(b.features).toHaveLength(35);
  expect(b.features.some(f=>f.properties.deuName==='Hessen-Darmstadt')).toBe(true);
  expect(a.features.some(f=>f.properties.deuName==='Westpreußen')).toBe(true);
  for(const data of [a,b])for(const p of geographicPaths(data.features)){
    expect(p.path).not.toMatch(/NaN|Infinity/);expect(p.path.length).toBeGreaterThan(100);
    expect(p.path.startsWith('M')).toBe(true);expect(NAMES[p.feature.properties.deuName]).toBeTruthy();
  }
});
it('历次颜色来自逐区史实，柏林从SPD转为KPD，而非全国比例方块投影',()=>{
  const a=JSON.parse(early) as MapCollection,b=JSON.parse(later) as MapCollection;
  expect(regionResults(a.features.find(f=>f.properties.deuName==='Berlin')!,'1919').rows[0].party).toBe('SPD');
  expect(regionResults(b.features.find(f=>f.properties.deuName==='Berlin')!,'1932b').rows[0].party).toBe('KPD');
  for(const [key] of MAP_ELECTIONS)for(const f of (key==='1919'?a:b).features){
    const r=regionResults(f,key);expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every(x=>Number.isFinite(x.share)&&x.share>=0&&x.share<=100)).toBe(true);
  }
});
it('保留原始缺项并提示，而不补造百分比',()=>{
  const b=JSON.parse(later) as MapCollection;
  const r=regionResults(b.features.find(f=>f.properties.deuName==='Ostpreußen')!,'1933');
  expect(r.incomplete).toBe(true);expect(r.rows[0]).toEqual({party:'NSDAP',share:56.5});
  expect(r.rows.reduce((n,x)=>n+x.share,0)).toBeCloseTo(88.7,1);
});
