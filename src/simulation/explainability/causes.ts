import type { GameState } from '../types';
import { partyMap } from '../../data/parties';
import { voterGroupMap } from '../../data/voterGroups';

export interface CauseItem {
  label: string;
  detail: string;
  weight: number;
  delta?: number;
  measured?: boolean;
  direction: 'up' | 'down' | 'neutral';
}

/** 指标因果解释（方案 §12.4）：任何重大结果都必须能回答“为什么发生” */
export function explainMetric(state: GameState, path: string): CauseItem[] {
  const out: CauseItem[] = [];
  const actual = state.metricChanges?.[path];
  if (actual?.length) {
    const sum = actual.reduce((n,c) => n + Math.abs(c.delta),0) || 1;
    return actual.map(c => ({ label: c.source, detail: '本月实际记录的指标变化 ' + (c.delta > 0 ? '+' : '') + c.delta.toFixed(3), delta: c.delta,
      weight: Math.abs(c.delta) / sum, measured: true, direction: c.delta > 0 ? 'up' as const : 'down' as const }));
  }
  const prev = state.snapshots[state.snapshots.length - 1];
  const cur = state.snapshots[state.snapshots.length - 2];

  const section = path.split('.')[0] as 'economy' | 'society' | 'institutions' | 'diplomacy';
  const key = path.split('.')[1];
  const currentVal = (state as unknown as Record<string, Record<string, number>>)[section]?.[key] ?? 0;

  if (path === 'economy.unemployment') {
    out.push({
      label: '产出缺口',
      detail: `工业生产指数 ${state.economy.output.toFixed(0)}，低于潜在产出时失业上升。`,
      weight: 0.35,
      direction: state.economy.output < 70 ? 'up' : 'down',
    });
    out.push({
      label: '信贷条件',
      detail: `信贷供给 ${state.economy.creditSupply.toFixed(0)}，融资中断会加速企业裁员。`,
      weight: 0.25,
      direction: state.economy.creditSupply < 50 ? 'up' : 'down',
    });
    out.push({
      label: '外部需求',
      detail: `出口指数 ${state.economy.exports.toFixed(0)}，世界市场收缩直接冲击出口部门。`,
      weight: 0.2,
      direction: state.economy.exports < 50 ? 'up' : 'down',
    });
    out.push({
      label: '政策取向',
      detail: state.activePolicies.length
        ? `当前生效政策：${state.activePolicies.map((p) => p.note).join('、')}`
        : '当前无扩张性就业政策生效。',
      weight: 0.2,
      direction: 'neutral',
    });
  } else if (path === 'economy.inflation') {
    out.push({
      label: '财政赤字货币化',
      detail: `赤字 ${state.economy.deficit.toFixed(1)}% GDP，货币供应指数 ${state.economy.moneySupply.toFixed(0)}。`,
      weight: 0.4,
      direction: state.economy.deficit > 6 ? 'up' : 'down',
    });
    out.push({
      label: '需求压力',
      detail: '产出高于潜在水平时，需求拉动型通胀上升。',
      weight: 0.25,
      direction: state.economy.output > 85 ? 'up' : 'down',
    });
    out.push({
      label: '食品与进口价格',
      detail: `食品价格指数 ${state.economy.foodPrices.toFixed(0)}。`,
      weight: 0.2,
      direction: state.economy.foodPrices > 55 ? 'up' : 'down',
    });
    out.push({
      label: '货币信用',
      detail: '国际资本信心与汇率预期影响通胀预期。',
      weight: 0.15,
      direction: state.diplomacy.capitalConfidence < 40 ? 'up' : 'down',
    });
  } else if (path === 'society.violence') {
    out.push({
      label: '社会极化',
      detail: `极化指数 ${state.society.polarization.toFixed(0)}。`,
      weight: 0.35,
      direction: state.society.polarization > 55 ? 'up' : 'down',
    });
    out.push({
      label: '执法中立性',
      detail: `警察中立性 ${state.institutions.policeNeutrality.toFixed(0)}，偏向性执法会鼓励私刑与私兵。`,
      weight: 0.3,
      direction: state.institutions.policeNeutrality < 55 ? 'up' : 'down',
    });
    out.push({
      label: '司法追责',
      detail: `司法独立 ${state.institutions.judicialIndependence.toFixed(0)}。`,
      weight: 0.2,
      direction: state.institutions.judicialIndependence < 55 ? 'up' : 'down',
    });
    out.push({
      label: '准军事组织',
      detail: '冲锋队、钢盔团与红色前线战士联盟的活动规模。',
      weight: 0.15,
      direction: 'up',
    });
  } else if (path === 'institutions.parliamentAuthority') {
    out.push({
      label: '紧急法令使用',
      detail: `紧急法令依赖度 ${state.institutions.emergencyDependence.toFixed(0)}。`,
      weight: 0.4,
      direction: state.institutions.emergencyDependence > 40 ? 'down' : 'up',
    });
    out.push({
      label: '政府类型',
      detail: `当前为${state.government.type === 'presidential_cabinet' ? '总统内阁' : '议会基础上的政府'}。`,
      weight: 0.25,
      direction: state.government.type === 'presidential_cabinet' ? 'down' : 'up',
    });
    out.push({
      label: '执政联盟席位',
      detail: `${state.government.seatsAtFormation} / ${state.government.parliamentSeatsTotal} 席。`,
      weight: 0.2,
      direction: state.government.seatsAtFormation > state.government.parliamentSeatsTotal / 2 ? 'up' : 'down',
    });
    out.push({
      label: '政党妥协能力',
      detail: `妥协能力 ${state.institutions.partyCompromise.toFixed(0)}。`,
      weight: 0.15,
      direction: state.institutions.partyCompromise < 45 ? 'down' : 'up',
    });
  } else {
    out.push({
      label: '变量当前值',
      detail: `${path} = ${currentVal.toFixed(1)}`,
      weight: 1,
      direction: 'neutral',
    });
    if (prev && cur) {
      const a = (prev as unknown as Record<string, Record<string, number>>)[section]?.[key];
      const b = (cur as unknown as Record<string, Record<string, number>>)[section]?.[key];
      if (typeof a === 'number' && typeof b === 'number') {
        out.push({ label: '上月变化', detail: `${b.toFixed(1)} → ${a.toFixed(1)}`, weight: 0.5, direction: a > b ? 'up' : 'down' });
      }
    }
  }

  return out;
}

/** 解释某政党支持度的驱动因素 */
export function explainPartySupport(state: GameState, partyId: string): CauseItem[] {
  const party = partyMap.get(partyId);
  const ps = state.parties[partyId];
  if (!party || !ps) return [];

  const out: CauseItem[] = [];
  const gov = state.government.parties.includes(partyId);
  const perf = (state.society.satisfaction - 50) / 50;

  out.push({
    label: '政府绩效归因',
    detail: gov ? `作为执政党，承受 ${perf < 0 ? '负面' : '正面'} 绩效评价。` : '作为在野党，从政府绩效中获得反向收益。',
    weight: 0.3,
    direction: gov ? (perf < 0 ? 'down' : 'up') : perf < 0 ? 'up' : 'down',
  });
  out.push({
    label: '组织与动员',
    detail: `组织密度 ${ps.organization.toFixed(0)}，动员能力 ${ps.mobilization.toFixed(0)}。`,
    weight: 0.25,
    direction: ps.organization > 60 ? 'up' : 'neutral',
  });
  out.push({
    label: '选民结构',
    detail: `核心群体：${party.constituencies.map((c) => voterGroupMap.get(c)?.name_zh ?? c).join('、')}。`,
    weight: 0.25,
    direction: 'neutral',
  });
  if (party.anti_system > 0.5) {
    out.push({
      label: '抗议性投票',
      detail: `反体制程度 ${(party.anti_system * 100).toFixed(0)}，在疏离感高的群体中获益。`,
      weight: 0.2,
      direction: state.society.polarization > 55 ? 'up' : 'down',
    });
  }
  if (ps.scandal > 0) {
    out.push({ label: '丑闻', detail: `丑闻指数 ${ps.scandal.toFixed(0)}。`, weight: 0.15, direction: 'down' });
  }
  return out;
}
