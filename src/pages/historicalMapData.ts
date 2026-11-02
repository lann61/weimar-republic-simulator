/** 地图模块专用：不参与选举模拟、席位分配或游戏状态。 */
export const MAP_ELECTIONS = [
  ['1919','1919-01-19','1919 国民议会'], ['1920','1920-06-06','1920 国会'],
  ['1924a','1924-05-04','1924 年 5 月'], ['1924b','1924-12-07','1924 年 12 月'],
  ['1928','1928-05-20','1928 国会'], ['1930','1930-09-14','1930 国会'],
  ['1932a','1932-07-31','1932 年 7 月'], ['1932b','1932-11-06','1932 年 11 月'],
  ['1933','1933-03-05','1933 国会'],
] as const;
export interface Region { type:'Feature'; properties: { Id:number; deuName:string; engName:string; [key:string]:unknown }; geometry:{type:'MultiPolygon';coordinates:number[][][][]} }
export interface MapCollection { type:'FeatureCollection'; features:Region[] }
export const MAP_SOURCE='https://germanhistorydocs.org/en/weimar-germany-1918-1933/ghdi:map-5019';
export const NAMES:Record<string,string>={
  'Ostpreußen':'东普鲁士','Berlin':'柏林','Potsdam I':'波茨坦一区','Potsdam II':'波茨坦二区','Frankfurt/Oder':'法兰克福（奥德）','Pommern':'波美拉尼亚','Breslau':'布雷斯劳','Liegnitz':'利格尼茨','Oppeln':'奥佩伦','Magdeburg':'马格德堡','Merseburg':'梅泽堡','Thüringen':'图林根','Schleswig-Holstein':'石勒苏益格—荷尔斯泰因','Weser-Ems':'威悉—埃姆斯','Ost-Hannover':'汉诺威东部','Südhannover-Braunschweig':'汉诺威南部—不伦瑞克','Westfalen Nord':'威斯特法伦北部','Westfalen Süd':'威斯特法伦南部','Hessen-Nassau':'黑森—拿骚','Köln-Aachen':'科隆—亚琛','Koblenz-Trier':'科布伦茨—特里尔','Düsseldorf Ost':'杜塞尔多夫东部','Düsseldorf West':'杜塞尔多夫西部','Oberbayern-Schwaben':'上巴伐利亚—施瓦本','Niederbayern':'下巴伐利亚','Franken':'弗兰肯','Pfalz':'普法尔茨','Dresden-Bautzen':'德累斯顿—包岑','Leipzig':'莱比锡','Chemnitz-Zwickau':'开姆尼茨—茨维考','Württemberg':'符腾堡','Baden':'巴登','Hessen-Darmstadt':'黑森—达姆施塔特','Hamburg':'汉堡','Mecklenburg':'梅克伦堡','Aurich':'奥里希','Hannover':'汉诺威','Hamburg-Bremen':'汉堡—不来梅','Posen':'波森','Westpreußen':'西普鲁士',
};
export const PARTIES:Record<string,{name:string;color:string;gameId?:string}>={
  SPD:{name:'SPD 社会民主党',color:'#d95664',gameId:'spd'},USPD:{name:'USPD 独立社民党',color:'#e6ad52',gameId:'uspd'},KPD:{name:'KPD 共产党',color:'#a82036',gameId:'kpd'},
  DDP:{name:'DDP 民主党',color:'#d1ae55',gameId:'ddp'},DStP:{name:'DStP 国家党',color:'#d1ae55',gameId:'dstp'},DVP:{name:'DVP 人民党',color:'#7d89c4',gameId:'dvp'},DNVP:{name:'DNVP 国家人民党',color:'#547db0',gameId:'dnvp'},
  'Zentrum/BVP':{name:'Zentrum / BVP 中央党及巴伐利亚人民党',color:'#59a889'},NSDAP:{name:'NSDAP 纳粹党',color:'#a77745',gameId:'nsdap'},DVFP:{name:'DVFP 民族自由阵营',color:'#a584b3'},WP:{name:'WP 经济党',color:'#a7b063',gameId:'wirtschaftspartei'},Other:{name:'其他政党',color:'#82847e'},
};
export function regionResults(region:Region,key:string) {
  const parties=region.properties[`parties_${key}`] as string[]|undefined;
  const values=region.properties[`percents_${key}`] as number[]|undefined;
  if(!parties||!values) return { rows:[] as {party:string;share:number}[],incomplete:true };
  const rows=parties.map((party,i)=>({party,share:values[i]})).filter(r=>Number.isFinite(r.share)).sort((a,b)=>b.share-a.share);
  const sum=rows.reduce((n,r)=>n+r.share,0);
  return {rows,incomplete:parties.length!==values.length||sum<98||sum>102};
}
/** 真实经纬度转墨卡托投影，保留岛屿与孔洞；不使用模型方块坐标。 */
export function geographicPaths(features:Region[]) {
  const project=([lon,lat]:number[])=>[lon*Math.PI/180, -Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
  const points=features.flatMap(f=>f.geometry.coordinates.flat(2)).map(project);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),minY=Math.min(...ys),dx=Math.max(...xs)-minX,dy=Math.max(...ys)-minY;
  const scale=Math.min(940/dx,700/dy),ox=(1000-dx*scale)/2,oy=(760-dy*scale)/2;
  return features.map(feature=>({feature,path:feature.geometry.coordinates.map(polygon=>polygon.map(ring=>ring.map((p,i)=>{
    const [x,y]=project(p);return `${i?'L':'M'}${((x-minX)*scale+ox).toFixed(2)},${((y-minY)*scale+oy).toFixed(2)}`;
  }).join(' ')+'Z').join(' ')).join(' ')}));
}
