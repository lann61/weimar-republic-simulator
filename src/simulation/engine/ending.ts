import type { GameState } from '../types';
import { partyMap } from '../../data/parties';
import { personMap } from '../../data/people';
import { headOfState } from '../../utils/derive';
import { formatDateFull } from './date';
import { buildReportAnalysis } from './reportAnalysis';

export type EndingId =
  | 'democratic_consolidation'
  | 'fragile_democracy'
  | 'presidential_rule'
  | 'left_revolution'
  | 'military_authoritarian'
  | 'nazi_seizure'
  | 'nazi_seizure_early'
  | 'enabling_act'
  | 'nazi_majority'
  | 'nazi_consolidation'
  | 'state_disorder'
  | 'constitutional_monarchy'
  | 'council_governance'
  | 'authoritarian_rule';

export interface EndingDefinition {
  id: EndingId;
  title: string;
  summary: string;
  tone: 'positive' | 'mixed' | 'negative';
}

export const ENDINGS: Record<EndingId, EndingDefinition> = {
  constitutional_monarchy: { id: 'constitutional_monarchy', title: '君主立宪秩序延续', summary: '君主制保留，政府与议会的关系由本局制度安排决定。经济、权利与治理质量见下方评估。', tone: 'mixed' },
  council_governance: { id: 'council_governance', title: '代表会体制延续', summary: '工兵代表会构成权力基础。社会参与、文官监督与地方协调的实际表现决定这一体制的治理质量。', tone: 'mixed' },
  authoritarian_rule: { id: 'authoritarian_rule', title: '威权治理延续', summary: '行政权居于主导地位，议会与公民权利受到持续限制。具体约束与政策后果见下方评估。', tone: 'negative' },
  democratic_consolidation: {
    id: 'democratic_consolidation',
    title: '议会民主巩固',
    summary: '政党形成可持续妥协，宪法秩序得到强化。制度韧性与经济表现分别评估，制度巩固不代表所有社会问题已经解决。',
    tone: 'positive',
  },
  fragile_democracy: {
    id: 'fragile_democracy',
    title: '脆弱民主延续',
    summary: '政府频繁更迭，但议会与公民权利仍然存在。共和国没有崩溃，也没有真正稳固。',
    tone: 'mixed',
  },
  presidential_rule: {
    id: 'presidential_rule',
    title: '长期总统化治理',
    summary: '议会持续弱化，行政权扩大，民主程序名存实亡。国家仍保留选举形式，但决策权已转移至总统府。',
    tone: 'negative',
  },
  left_revolution: {
    id: 'left_revolution',
    title: '左翼革命与国家分裂危机',
    summary: '议会秩序被革命冲突和地方对抗破坏，国家面临分裂或内战。',
    tone: 'negative',
  },
  military_authoritarian: {
    id: 'military_authoritarian',
    title: '军方或保守威权统治',
    summary: '民主制度被非民选权力取代。国家未必走向纳粹体制，但公民权利与议会政治已被中止。',
    tone: 'negative',
  },
  nazi_seizure: {
    id: 'nazi_seizure',
    title: '纳粹夺权',
    summary: '反民主力量通过总统任命、精英交易与政治暴力取得政权，开始拆除议会民主。',
    tone: 'negative',
  },
  nazi_seizure_early: {
    id: 'nazi_seizure_early',
    title: '提前的纳粹夺权',
    summary: '纳粹党在更早的时间点获得总理职位，制度拆除的时间表被提前。',
    tone: 'negative',
  },
  enabling_act: {
    id: 'enabling_act',
    title: '《授权法》与议会民主的终结',
    summary: '国会将立法权移交政府，宪法制衡被制度性拆除。此后议会仅存形式。',
    tone: 'negative',
  },
  nazi_majority: {
    id: 'nazi_majority',
    title: '纳粹党取得议会绝对多数',
    summary: '纳粹党在国会取得过半席位，议会制衡在算术上已不可能。',
    tone: 'negative',
  },
  nazi_consolidation: {
    id: 'nazi_consolidation',
    title: '独裁巩固',
    summary: '总统与总理职权合并，军队向个人宣誓效忠，一党体制完成。魏玛共和国彻底终结。',
    tone: 'negative',
  },
  state_disorder: {
    id: 'state_disorder',
    title: '多重危机下的国家失序',
    summary: '经济、政治与地方秩序同时失控，国家失去有效治理能力。',
    tone: 'negative',
  },
};

export function determineEnding(state: GameState): EndingId {
  const i = state.institutions;
  const s = state.society;
  const nsdap = state.parties['nsdap'];
  const kpd = state.parties['kpd'];

  if (state.flags.officesMerged && state.flags.personalArmyOath && state.flags.onePartyState && state.government.chancellorId === 'person_hitler') {
    return 'nazi_consolidation';
  }
  if (state.flags.enablingActPassed) return 'enabling_act';
  if (state.government.chancellorId === 'person_hitler' && state.date >= '1933-01-30') return 'nazi_seizure';
  if (nsdap && nsdap.seats > state.parliamentSeatsTotal * 0.5) return 'nazi_majority';
  if (i.federalCohesion < 22 && s.violence > 70) return 'state_disorder';
  if (kpd && kpd.support > 28 && s.violence > 65) return 'left_revolution';
  if (i.militarySubordination < 20 && i.parliamentAuthority < 30) return 'military_authoritarian';
  if (i.presidentialPowerUse > 70 && i.parliamentAuthority < 32) return 'presidential_rule';
  if (state.flags.regime === 'constitutional_monarchy') return 'constitutional_monarchy';
  if (state.flags.regime === 'council_republic') return 'council_governance';
  if (state.flags.regime === 'authoritarian') return 'authoritarian_rule';
  if (i.democraticResilience > 68 && s.republicSupport > 62 && i.parliamentAuthority > 60) return 'democratic_consolidation';
  if (i.democraticResilience > 48) return 'fragile_democracy';
  return 'presidential_rule';
}

export interface ReportSection {
  title: string;
  rows: { label: string; value: string; note?: string }[];
}

export function buildReport(state: GameState) {
  const endingId = state.meta.ended && state.meta.ending ? state.meta.ending as EndingId : determineEnding(state);
  const ending = ENDINGS[endingId] ?? ENDINGS.fragile_democracy;

  const first = state.snapshots[0];
  const last = state.snapshots[state.snapshots.length - 1];

  const elections = state.elections.map((e) => {
    const top = [...e.results].sort((a, b) => b.seats - a.seats).slice(0, 4);
    return {
      date: e.date,
      label: e.label,
      turnout: e.turnout,
      fairness: e.fairness,
      totalSeats: e.totalSeats,
      top: top.map((r) => `${partyMap.get(r.partyId)?.short_name ?? r.partyId} ${r.share.toFixed(1)}% / ${r.seats}席`),
      governmentFormed: e.governmentFormed,
      isHistorical: e.isHistorical,
    };
  });

  const keyTurns = state.log
    .filter((l) => l.importance === 'critical')
    .slice(-12)
    .map((l) => ({ date: l.date, title: l.title, detail: l.detail }));

  const sections: ReportSection[] = [
    {
      title: '制度与政治',
      rows: [
        { label: '议会权威', value: state.institutions.parliamentAuthority.toFixed(0), note: '0—100' },
        { label: '民主韧性', value: state.institutions.democraticResilience.toFixed(0) },
        { label: '紧急法令依赖度', value: state.institutions.emergencyDependence.toFixed(0) },
        { label: '第48条使用次数', value: String(state.stats.article48Count) },
        { label: '政府更迭次数', value: String(state.stats.governmentsFormed) },
        { label: headOfState(state).title, value: headOfState(state).name },
        { label: '末任总理', value: personMap.get(state.government.chancellorId)?.name_zh ?? '—' },
      ],
    },
    {
      title: '经济与社会',
      rows: [
        { label: '失业率', value: `${state.economy.unemployment.toFixed(1)}%`, note: first ? `起点 ${(first.economy.unemployment ?? 0).toFixed(1)}%` : '' },
        { label: '通胀率', value: `${state.economy.inflation.toFixed(1)}%` },
        { label: '工业生产指数', value: state.economy.output.toFixed(0), note: '1928≈100' },
        { label: '公共债务/GDP', value: `${state.economy.debt.toFixed(0)}%` },
        { label: '社会满意度', value: state.society.satisfaction.toFixed(0) },
        { label: '政治暴力指数', value: state.society.violence.toFixed(0) },
        { label: '新闻自由', value: state.society.mediaFreedom.toFixed(0) },
        { label: '共和国认同', value: state.society.republicSupport.toFixed(0) },
      ],
    },
    {
      title: '外交',
      rows: [
        { label: '赔款压力', value: state.diplomacy.reparationsPressure.toFixed(0) },
        { label: '国际资本信心', value: state.diplomacy.capitalConfidence.toFixed(0) },
        { label: '外交孤立', value: state.diplomacy.isolation.toFixed(0) },
        { label: '对法关系', value: state.diplomacy.relationFrance.toFixed(0) },
        { label: '对英关系', value: state.diplomacy.relationBritain.toFixed(0) },
        { label: '对苏关系', value: state.diplomacy.relationUSSR.toFixed(0) },
      ],
    },
  ];

  const decisions = state.decisions.map((d) => ({
    title: d.title ?? d.eventId,
    automatic: d.automatic,
    longTerm: d.longTerm,
    causes: d.causes,
    date: d.date,
    label: d.label,
    eventId: d.eventId,
  }));

  return {
    analysis: buildReportAnalysis(state),
    ending,
    sections,
    elections,
    keyTurns,
    decisions,
    period: `${formatDateFull(state.meta.startDate)} — ${formatDateFull(state.cursorDate ?? state.date)}`,
    divergence: state.meta.divergence,
    lastSnapshot: last,
    challenge: state.challenge,
  };
}
