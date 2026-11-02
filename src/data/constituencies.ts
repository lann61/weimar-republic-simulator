import type { Constituency } from './types';

/**
 * 选区（Wahlkreis）简化模型。
 * 说明：席位权重与党派地区修正为研究型参数（simulation_derived），
 * 用于产生地区差异与“剩余票”分配效果，不代表逐区历史统计值。
 * 地图坐标为示意布局（schematic），非地理精确边界。
 */
const C = (
  id: string,
  zh: string,
  de: string,
  seats: number,
  urban: number,
  mods: Record<string, number>,
  map: [number, number, number, number]
): Constituency => ({
  id,
  name_zh: zh,
  name_de: de,
  seats,
  urban,
  party_modifiers: mods,
  map: { x: map[0], y: map[1], w: map[2], h: map[3] },
  source_ids: ['source_ghdi_maps', 'source_project_model'],
  data_quality: 'simulation_derived',
});

export const constituencies: Constituency[] = [
  C('wk01', '东普鲁士', 'Ostpreußen', 13, 0.35, { dnvp: 0.5, landvolk: 0.4, spd: -0.3, kpd: -0.4 }, [80, 8, 12, 12]),
  C('wk02', '柏林', 'Berlin', 20, 1.0, { spd: 0.4, kpd: 0.7, ddp: 0.3, nsdap: 0.2, dnvp: -0.5, zentrum: -0.2 }, [58, 26, 10, 9]),
  C('wk03', '波茨坦二区', 'Potsdam II', 12, 0.8, { ddp: 0.3, spd: 0.2, dnvp: 0.1 }, [54, 30, 8, 7]),
  C('wk04', '波茨坦一区', 'Potsdam I', 14, 0.5, { dnvp: 0.3, ddp: 0.2, nsdap: 0.1 }, [46, 28, 8, 8]),
  C('wk05', '法兰克福（奥德）', 'Frankfurt a. d. Oder', 12, 0.3, { dnvp: 0.4, landvolk: 0.3, spd: -0.2 }, [66, 30, 9, 8]),
  C('wk06', '波美拉尼亚', 'Pommern', 13, 0.25, { dnvp: 0.6, landvolk: 0.4, spd: -0.4 }, [68, 18, 10, 9]),
  C('wk07', '布雷斯劳', 'Breslau', 14, 0.5, { zentrum: 0.4, dnvp: 0.3, spd: 0.1 }, [70, 40, 10, 8]),
  C('wk08', '利格尼茨', 'Liegnitz', 11, 0.3, { dnvp: 0.5, zentrum: 0.2, landvolk: 0.2 }, [64, 40, 8, 7]),
  C('wk09', '奥佩伦', 'Oppeln', 13, 0.35, { zentrum: 0.9, dnvp: 0.1 }, [68, 48, 9, 8]),
  C('wk10', '马格德堡', 'Magdeburg', 12, 0.4, { spd: 0.3, dnvp: 0.2, kpd: 0.1 }, [46, 33, 9, 8]),
  C('wk11', '梅泽堡', 'Merseburg', 12, 0.4, { spd: 0.3, kpd: 0.3, dnvp: 0.1 }, [50, 40, 8, 7]),
  C('wk12', '图林根', 'Thüringen', 12, 0.4, { spd: 0.3, kpd: 0.2, nsdap: 0.2 }, [41, 45, 9, 8]),
  C('wk13', '石勒苏益格-荷尔斯泰因', 'Schleswig-Holstein', 12, 0.35, { dnvp: 0.3, spd: 0.2, nsdap: 0.3 }, [35, 8, 9, 9]),
  C('wk14', '威悉-埃姆斯', 'Weser-Ems', 12, 0.35, { zentrum: 0.5, dnvp: 0.2, dhp: 0.2 }, [30, 22, 9, 8]),
  C('wk15', '汉诺威东部', 'Hannover-Ost', 11, 0.35, { dnvp: 0.3, dhp: 0.2, spd: 0.2 }, [38, 22, 8, 7]),
  C('wk16', '汉诺威南部', 'Hannover-Süd', 11, 0.35, { spd: 0.3, dhp: 0.2, zentrum: 0.2 }, [36, 32, 8, 7]),
  C('wk17', '威斯特法伦北部', 'Westfalen-Nord', 11, 0.45, { zentrum: 0.6, spd: 0.1 }, [28, 30, 8, 7]),
  C('wk18', '威斯特法伦南部', 'Westfalen-Süd', 14, 0.7, { zentrum: 0.4, spd: 0.3, kpd: 0.3 }, [30, 38, 9, 8]),
  C('wk19', '黑森-拿骚', 'Hessen-Nassau', 13, 0.5, { spd: 0.2, zentrum: 0.3, ddp: 0.2 }, [36, 45, 9, 8]),
  C('wk20', '科隆-亚琛', 'Köln-Aachen', 13, 0.6, { zentrum: 1.1, spd: 0.0 }, [20, 30, 8, 7]),
  C('wk21', '科布伦茨-特里尔', 'Koblenz-Trier', 10, 0.3, { zentrum: 1.0 }, [22, 39, 8, 7]),
  C('wk22', '杜塞尔多夫东部', 'Düsseldorf-Ost', 12, 0.85, { zentrum: 0.4, spd: 0.2, kpd: 0.3 }, [24, 33, 7, 6]),
  C('wk23', '杜塞尔多夫西部', 'Düsseldorf-West', 11, 0.85, { zentrum: 0.5, kpd: 0.2, dnvp: 0.1 }, [18, 34, 7, 6]),
  C('wk24', '上巴伐利亚-施瓦本', 'Oberbayern-Schwaben', 15, 0.45, { bvp: 1.2, zentrum: -0.4, nsdap: 0.2 }, [48, 68, 11, 9]),
  C('wk25', '下巴伐利亚', 'Niederbayern', 10, 0.25, { bvp: 1.3, zentrum: -0.5 }, [55, 65, 9, 8]),
  C('wk26', '弗兰肯', 'Franken', 13, 0.4, { bvp: 0.7, spd: 0.2, nsdap: 0.2 }, [48, 55, 10, 8]),
  C('wk27', '普法尔茨', 'Pfalz', 9, 0.35, { bvp: 0.6, zentrum: 0.2, spd: 0.2 }, [30, 57, 8, 7]),
  C('wk28', '符腾堡', 'Württemberg', 12, 0.4, { ddp: 0.3, zentrum: 0.2, dnvp: 0.2 }, [38, 62, 9, 8]),
  C('wk29', '巴登', 'Baden', 12, 0.45, { zentrum: 0.6, spd: 0.2, ddp: 0.2 }, [32, 65, 9, 8]),
  C('wk30', '汉堡', 'Hamburg', 12, 1.0, { spd: 0.4, kpd: 0.3, ddp: 0.2, dnvp: -0.2 }, [40, 17, 8, 7]),
  C('wk31', '梅克伦堡', 'Mecklenburg', 10, 0.25, { dnvp: 0.6, landvolk: 0.3, spd: -0.2 }, [48, 14, 9, 7]),
  C('wk32', '开姆尼茨-茨维考', 'Chemnitz-Zwickau', 13, 0.7, { spd: 0.3, kpd: 0.6, nsdap: 0.2 }, [55, 52, 9, 8]),
  C('wk33', '德累斯顿-包岑', 'Dresden-Bautzen', 13, 0.5, { dnvp: 0.2, spd: 0.2, nsdap: 0.2 }, [63, 52, 9, 8]),
  C('wk34', '莱比锡', 'Leipzig', 12, 0.7, { spd: 0.3, kpd: 0.3, ddp: 0.2, nsdap: 0.2 }, [52, 46, 8, 7]),
];

export const constituencyMap = new Map(constituencies.map((c) => [c.id, c]));
export const totalConstituencySeats = constituencies.reduce((s, c) => s + c.seats, 0);
