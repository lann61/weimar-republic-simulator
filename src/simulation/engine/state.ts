import { parties as partyData } from '../../data/parties';
import { voterGroups as groupData } from '../../data/voterGroups';
import { governments, governmentMap } from '../../data/governments';
import { elections } from '../../data/elections';
import { events } from '../../data/events';
import { scenarioMap } from '../../data/scenarios';
import { recalibrateAffinities } from '../elections/run';
import type { Government, PartyId } from '../../data/types';
import type { GameState, GameMode, GovernmentState, PartyState, VoterGroupState } from '../types';
import { parseDate, phaseOf, toISO } from './date';

export const DATA_VERSION = '2.2.0';
export const BASE_SEED = 19181109;

const INITIAL_SUPPORT: Record<PartyId, number> = {
  spd: 36.5,
  uspd: 10.0,
  kpd: 2.0,
  zentrum: 19.0,
  bvp: 3.5,
  ddp: 16.5,
  dvp: 5.0,
  dnvp: 8.5,
  nsdap: 0.2,
  wirtschaftspartei: 0.2,
  landvolk: 0.1,
  dhp: 1.0,
  csvd: 0,
  vrp: 0,
  dstp: 0,
};

export function governmentToState(g: Government): GovernmentState {
  return {
    id: g.id,
    name_zh: g.name_zh,
    type: g.type,
    parties: [...g.parties],
    supportParties: [...(g.support_parties ?? [])],
    chancellorId: g.chancellor_id,
    viceChancellorId: g.vice_chancellor_id ?? null,
    startDate: g.from,
    endDate: g.to,
    seatsAtFormation: g.seats_at_formation,
    parliamentSeatsTotal: g.parliament_seats_total,
    members: g.members.map((m) => ({ ...m })),
    program: g.program_zh,
    presidentialSupport: g.presidential_support,
    trustStatus: g.parliamentary_trust,
    endReason: g.end_reason,
    isHistorical: g.is_historical,
  };
}

export function buildInitialState(scenarioId = 'sc_intervention', seed = BASE_SEED): GameState {
  const scenario = scenarioMap.get(scenarioId) ?? scenarioMap.get('sc_intervention')!;
  const startDate = scenario.start_date;

  const partyStates: Record<PartyId, PartyState> = {};
  for (const p of partyData) {
    partyStates[p.id] = {
      id: p.id,
      support: INITIAL_SUPPORT[p.id] ?? 0,
      supportLastElection: 0,
      votesLastElection: null,
      seatsLastElection: 0,
      seats: 0,
      membership: p.membership?.[0]?.count ?? 0,
      organization: p.organization * 100,
      mobilization: p.mobilization * 100,
      media: p.media * 100,
      leadership: p.leadership * 100,
      discipline: p.discipline * 100,
      scandal: 0,
      banned: false,
      active: true,
      inGovernment: false,
      supportsGovernment: false,
    };
  }

  const voterStates: Record<string, VoterGroupState> = {};
  for (const g of groupData) {
    const affinity: Record<PartyId, number> = {};
    for (const p of partyData) {
      affinity[p.id] = (g.affinity[p.id] ?? 0) * 100;
    }
    const tiltSum = Object.values(affinity).reduce((a, b) => a + b, 0) || 1;
    const tilt: Record<PartyId, number> = {};
    for (const p of partyData) tilt[p.id] = affinity[p.id] / tiltSum;

    voterStates[g.id] = {
      id: g.id,
      affinity,
      tilt,
      satisfaction: 45,
      trust: 40,
      republicSupport: 48,
      economicOutlook: 40,
      turnout: g.turnout_base * 100,
      alienation: 25,
    };
  }

  // 1918-11-01：帝制尚未崩溃，威廉二世仍为国家元首，马克斯·冯·巴登任帝国总理。
  // 1918-11-09 之后由十一月革命事件切换到革命政府（WMR-001）。
  const isImperialStart = startDate <= '1918-11-09';
  const firstGov = governmentMap.get(isImperialStart ? 'gov_max_von_baden' : 'gov_rat_volksbeauftragte')!;
  const initialFlags: Record<string, string | number> = isImperialStart
    ? {
        regime: 'constitutional_monarchy',
        republicanRegime: 0,
        headOfStateId: 'person_wilhelm_ii',
        headOfStateTitle: '德意志皇帝',
        headOfStateSince: '1888-06-15',
      }
    : { republicanRegime: 1 };

  const state: GameState = {
    meta: {
      seed,
      mode: scenario.mode,
      scenarioId: scenario.id,
      startDate,
      dataVersion: DATA_VERSION,
      rngCalls: 0,
      divergence: 0,
      ended: false,
    },
    date: startDate,
    cursorDate: startDate,
    phase: phaseOf(startDate),
    economy: {
      output: 55,
      gdp: 58,
      unemployment: 6.2,
      inflation: 15,
      priceLevel: 100,
      realWages: 55,
      taxRevenue: 12,
      spending: 24,
      deficit: 12,
      debt: 160,
      foreignCapital: 18,
      bankLiquidity: 58,
      creditSupply: 55,
      businessFailures: 38,
      agriculturalDebt: 40,
      foodPrices: 70,
      savingsValue: 92,
      investment: 48,
      consumption: 55,
      exports: 30,
      imports: 38,
      capitalInflow: 12,
      moneySupply: 58,
      reparationsPaid: 0,
    },
    society: {
      satisfaction: 40,
      trust: 34,
      republicSupport: 46,
      polarization: 55,
      violence: 45,
      violenceDeaths: 0,
      strikes: 38,
      mediaFreedom: 58,
      inequality: 60,
      housing: 40,
      socialTrust: 34,
      optimism: 40,
      youthUnemployment: 12,
      antisemitism: 34,
      poverty: 55,
      protests: 42,
      politicalMurders: 8,
      womenParticipation: 22,
      culturalFreedom: 56,
    },
    institutions: {
      constitutionalCommitment: 44,
      parliamentAuthority: 48,
      presidentialPowerUse: 18,
      emergencyDependence: 8,
      governmentLegitimacy: 46,
      judicialIndependence: 56,
      policeNeutrality: 50,
      militarySubordination: 38,
      federalCohesion: 60,
      partyCompromise: 56,
      governmentDurability: 46,
      democraticResilience: 44,
    },
    diplomacy: {
      reparationsPressure: 18,
      foreignLoans: 20,
      capitalConfidence: 30,
      treatyConstraint: 28,
      isolation: 85,
      prestige: 24,
      relationFrance: -60,
      relationBritain: -22,
      relationUSA: 18,
      relationUSSR: 12,
      relationPoland: -70,
      borderPressure: 38,
      disarmamentConstraint: 20,
      leagueParticipation: 0,
    },
    parties: partyStates,
    voterGroups: voterStates,
    government: governmentToState(firstGov),
    governmentHistory: [governmentToState(firstGov)],
    presidentId: 'person_ebert',
    presidentSince: '1919-02-11',
    elections: [],
    electionSchedule: [],
    article48: [],
    activePolicies: [],
    delayedEffects: [],
    pendingEvent: null,
    firedEvents: [],
    evaluatedEvents: {},
    decisionMemory: [],
    metricChanges: {},
    decisions: [],
    log: [],
    snapshots: [],
    news: [],
    flags: initialFlags,
    decisionsThisMonth: 0,
    parliamentSeatsTotal: 0,
    lastElectionDate: null,
    lastGovernmentChange: null,
    stats: { electionsHeld: 0, governmentsFormed: 1, article48Count: 0, decisionsMade: 0, crisesResolved: 0 },
  };

  // 场景覆盖：从更晚的年份开始
  if (startDate !== '1918-11-01') {
    applyScenarioStart(state, startDate);
  }

  // 1918-11 起点的政党体系校准：以 1919 年国民议会选举的史实结构作为初始党派亲和度，
  // 避免“第一场选举由任意初始参数决定，并锁死此后所有选举”
  if (startDate < '1919-01-19') {
    const first = elections.find((e) => e.id === 'election_1919_01');
    if (first) {
      const baselineShares: Record<string, number> = {};
      for (const r of first.results) baselineShares[r.party_id] = r.vote_share;
      recalibrateAffinities(state, baselineShares);
    }
  }

  // 场景起点预设：让经济、社会与制度状态与起始年份自洽
  const year = startDate.slice(0, 4);
  const preset = YEAR_PRESETS[year];
  if (preset) {
    for (const [path, value] of Object.entries(preset)) {
      setPath(state as unknown as Record<string, unknown>, path, value);
    }
  }

  if (scenario.state_overrides) {
    for (const [path, value] of Object.entries(scenario.state_overrides)) {
      setPath(state as unknown as Record<string, unknown>, path, value);
    }
  }

  // 挑战情景：初始化结构化目标与约束（WMR-017）
  if (scenario.mode === 'challenge' && scenario.challenge) {
    state.challenge = {
      scenarioId: scenario.id,
      objectives: scenario.challenge.objectives,
      constraints: scenario.challenge.constraints,
      progress: [],
      status: 'active',
    };
  }

  // 首个政府需与起始日期匹配
  if (startDate !== '1918-11-01') {
    const gov = governments
      .filter((g) => g.from <= startDate && (g.to === null || g.to >= startDate))
      .sort((a, b) => (a.from < b.from ? 1 : -1))[0];
    if (gov) {
      state.government = governmentToState(gov);
      state.governmentHistory = [governmentToState(gov)];
      state.lastGovernmentChange = gov.from;
      for (const p of Object.values(state.parties)) {
        p.inGovernment = false;
        p.supportsGovernment = false;
      }
      for (const pid of gov.parties) if (state.parties[pid]) state.parties[pid].inGovernment = true;
      for (const pid of gov.support_parties ?? []) if (state.parties[pid]) state.parties[pid].supportsGovernment = true;
    }
  }

  // ── WMR-002：载入场景开始前的历史档案 ─────────────────────────
  // 场景不是从 1918-11 开始时，必须把开始日期之前已经发生的事件、选举与政府
  // 标记为“已发生”，否则 dueEvents() 会把它们当成待触发事件重放。
  // 制度/经济后果由 YEAR_PRESETS 与 scenario.state_overrides 近似承载。
  if (startDate > '1918-11-01') {
    const pastEvents = events.filter((e) => e.date < startDate && e.trigger.type === 'historical_date');
    state.firedEvents = pastEvents.map((e) => e.id);

    const startMonth = startDate.slice(0, 7);
    // 包含与起始月同月的选举，避免 sc_1928 从 05-01 开始时跳过 05-20 的选举（WMR-003）
    const pastNational = elections.filter(
      (e) =>
        e.date < startDate &&
        (e.type === 'national_assembly' || e.type === 'reichstag')
    );
    state.elections = pastNational.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      label: e.label_zh,
      totalSeats: e.total_seats,
      turnout: e.turnout_rate,
      fairness: e.fairness,
      results: e.results.map((r) => ({
        partyId: r.party_id,
        share: r.vote_share,
        votes: r.votes,
        seats: r.seats,
        isSimulated: false,
      })),
      otherSeats: e.other_seats,
      otherVoteShare: e.other_vote_share,
      isHistorical: true,
      note: e.environment_note,
    }));
    state.stats.electionsHeld = state.elections.length;
    if (pastNational.length > 0) {
      const last = pastNational[pastNational.length - 1];
      state.lastElectionDate = last.date;
      state.parliamentSeatsTotal = last.total_seats;
      // 若最后一届选举发生在起始月内，以它的席位/得票作为开局议会状态
      for (const r of last.results) {
        const ps = state.parties[r.party_id];
        if (ps) {
          ps.support = r.vote_share;
          ps.supportLastElection = r.vote_share;
          ps.votesLastElection = r.votes;
          ps.seatsLastElection = r.seats;
          ps.seats = r.seats;
        }
      }
    }

    const pastGovs = governments.filter((g) => g.from < startDate);
    state.governmentHistory = [...pastGovs.map((g) => governmentToState(g)), state.government];
    state.stats.governmentsFormed = state.governmentHistory.length;

    state.flags.scenarioArchive = startDate;
    state.log.push({
      id: `log_archive_${startDate}`,
      date: startDate,
      type: 'institution',
      title: '已载入历史档案',
      detail: `场景开始前已发生 ${pastEvents.length} 个历史事件、${pastNational.length} 次全国选举、${pastGovs.length} 届政府；这些事件不会在开局重放。`,
      importance: 'major',
    });
  }

  const openingElection = elections.find(e => (e.type === 'reichstag' || e.type === 'national_assembly') && e.date >= startDate && e.date.slice(0,7) === startDate.slice(0,7));
  if (openingElection) state.electionSchedule!.push({ date: openingElection.date, type: openingElection.type as 'reichstag' | 'national_assembly', label: openingElection.label_zh,
    historicalId: scenario.mode === 'historical' ? openingElection.id : undefined, trigger: 'schedule', reason: '场景起始月的预定选举' });
  // 起始快照：让图表有起点
  const partySupport: Record<string, number> = {};
  for (const [pid, ps] of Object.entries(state.parties)) partySupport[pid] = ps.support;
  state.snapshots.push({
    date: state.date,
    economy: { ...state.economy },
    society: { ...state.society },
    institutions: { ...state.institutions },
    diplomacy: { ...state.diplomacy },
    parties: partySupport,
    governmentId: state.government.id,
    chancellorId: state.government.chancellorId,
  });

  state.log.push({
    id: `log_start_${startDate}`,
    date: startDate,
    type: 'news',
    title: '模拟开始',
    detail: `${scenario.name_zh}：${scenario.description}`,
    importance: 'major',
  });

  return state;
}

/** 不同起始年份的经济—社会—制度预设（研究型参数，用于让场景起点自洽） */
const YEAR_PRESETS: Record<string, Record<string, number>> = {
  '1923': {
    'economy.output': 62, 'economy.gdp': 62, 'economy.unemployment': 9.5, 'economy.inflation': 60,
    'economy.priceLevel': 260, 'economy.realWages': 48, 'economy.spending': 27, 'economy.taxRevenue': 13,
    'economy.deficit': 18, 'economy.debt': 180, 'economy.creditSupply': 42, 'economy.bankLiquidity': 46,
    'economy.savingsValue': 55, 'economy.foodPrices': 82, 'economy.moneySupply': 70,
    'society.satisfaction': 34, 'society.polarization': 70, 'society.violence': 58,
    'institutions.parliamentAuthority': 46, 'institutions.democraticResilience': 48,
    'diplomacy.reparationsPressure': 88, 'diplomacy.isolation': 78, 'diplomacy.relationFrance': -90,
  },
  '1928': {
    'economy.output': 91, 'economy.gdp': 90, 'economy.unemployment': 7.5, 'economy.inflation': 0.5,
    'economy.priceLevel': 121, 'economy.realWages': 78, 'economy.spending': 22, 'economy.taxRevenue': 18,
    'economy.deficit': 4.5, 'economy.debt': 78, 'economy.creditSupply': 70, 'economy.bankLiquidity': 68,
    'economy.savingsValue': 78, 'economy.foodPrices': 58, 'economy.moneySupply': 58,
    'society.satisfaction': 62, 'society.polarization': 48, 'society.violence': 34, 'society.optimism': 60,
    'institutions.parliamentAuthority': 64, 'institutions.democraticResilience': 58,
    'diplomacy.reparationsPressure': 52, 'diplomacy.isolation': 42, 'diplomacy.prestige': 52,
    'diplomacy.leagueParticipation': 60, 'diplomacy.relationFrance': -18, 'diplomacy.relationBritain': 10,
  },
  '1930': {
    'economy.output': 84, 'economy.gdp': 84, 'economy.unemployment': 15, 'economy.inflation': -1,
    'economy.priceLevel': 120, 'economy.realWages': 72, 'economy.spending': 25, 'economy.taxRevenue': 15,
    'economy.deficit': 8, 'economy.debt': 92, 'economy.creditSupply': 55, 'economy.bankLiquidity': 50,
    'economy.savingsValue': 70, 'economy.foodPrices': 60, 'economy.moneySupply': 58,
    'society.satisfaction': 45, 'society.polarization': 62, 'society.violence': 52, 'society.optimism': 40,
    'institutions.parliamentAuthority': 48, 'institutions.democraticResilience': 52,
    'institutions.presidentialPowerUse': 45, 'institutions.emergencyDependence': 30,
    'diplomacy.reparationsPressure': 48, 'diplomacy.isolation': 38, 'diplomacy.capitalConfidence': 45,
  },
  '1932': {
    'economy.output': 62, 'economy.gdp': 63, 'economy.unemployment': 29, 'economy.inflation': -6,
    'economy.priceLevel': 112, 'economy.realWages': 60, 'economy.spending': 27, 'economy.taxRevenue': 12,
    'economy.deficit': 6, 'economy.debt': 112, 'economy.creditSupply': 35, 'economy.bankLiquidity': 28,
    'economy.savingsValue': 62, 'economy.foodPrices': 58, 'economy.moneySupply': 56,
    'society.satisfaction': 32, 'society.polarization': 80, 'society.violence': 70, 'society.optimism': 28,
    'society.poverty': 72, 'society.mediaFreedom': 48,
    'institutions.parliamentAuthority': 30, 'institutions.democraticResilience': 36,
    'institutions.presidentialPowerUse': 72, 'institutions.emergencyDependence': 62,
    'diplomacy.reparationsPressure': 40, 'diplomacy.isolation': 34, 'diplomacy.capitalConfidence': 25,
  },
};

/** 从史实选举结果反推起始状态 */
function applyScenarioStart(state: GameState, startDate: string) {
  const prior = elections
    .filter((e) => e.date < startDate && e.type !== 'presidential' && e.type !== 'referendum')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  if (!prior) return;

  state.lastElectionDate = prior.date;
  state.parliamentSeatsTotal = prior.total_seats;
  for (const r of prior.results) {
    const p = state.parties[r.party_id];
    if (!p) continue;
    p.support = r.vote_share;
    p.supportLastElection = r.vote_share;
    p.votesLastElection = r.votes;
    p.seatsLastElection = r.seats;
    p.seats = r.seats;
  }

  // 总统
  const { y, m } = parseDate(startDate);
  if (y > 1925 || (y === 1925 && m >= 5)) {
    state.presidentId = 'person_hindenburg';
    state.presidentSince = '1925-04-26';
  }
  if (y > 1934 || (y === 1934 && m >= 8)) {
    state.presidentId = 'person_hitler';
    state.presidentSince = '1934-08-02';
  }

  // 用上届选举结果校准群体亲和度，使模型支持度与起始政治格局一致
  const shares: Record<string, number> = {};
  for (const r of prior.results) shares[r.party_id] = r.vote_share;
  recalibrateAffinities(state, shares);

  // 重置执政标记（具体政府的标记在最终安装政府后设置）
  for (const p of Object.values(state.parties)) {
    p.inGovernment = false;
    p.supportsGovernment = false;
  }

  state.elections.push({
    id: prior.id,
    date: prior.date,
    type: prior.type,
    label: prior.label_zh,
    totalSeats: prior.total_seats,
    turnout: prior.turnout_rate,
    fairness: prior.fairness,
    results: prior.results.map((r) => ({
      partyId: r.party_id,
      share: r.vote_share,
      votes: r.votes,
      seats: r.seats,
      isSimulated: false,
    })),
    isHistorical: true,
    note: prior.environment_note,
  });
  state.stats.electionsHeld = 1;
}

export function setPath(obj: Record<string, unknown>, path: string, value: number) {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (typeof next !== 'object' || next === null) return;
    cur = next as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function getPath(obj: unknown, path: string): number {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return 0;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'number' ? cur : 0;
}

export function addPath(obj: Record<string, unknown>, path: string, delta: number) {
  if (!delta) return;
  const current = getPath(obj, path);
  setPath(obj, path, current + delta);
}

/** 变量合法范围（方案 §11.2：每个变量必须有定义与取值范围） */
export const VAR_BOUNDS: Record<string, [number, number]> = {
  'economy.unemployment': [0.5, 60],
  'economy.inflation': [-30, 5000],
  'economy.priceLevel': [50, 100000],
  'economy.deficit': [-15, 35],
  'economy.debt': [0, 400],
  'economy.taxRevenue': [4, 45],
  'economy.spending': [4, 50],
  'economy.output': [20, 120],
  'economy.gdp': [20, 130],
  'diplomacy.reparationsPressure': [0, 100],
  'diplomacy.relationFrance': [-100, 100],
  'diplomacy.relationBritain': [-100, 100],
  'diplomacy.relationUSA': [-100, 100],
  'diplomacy.relationUSSR': [-100, 100],
  'diplomacy.relationPoland': [-100, 100],
};

export function defaultBoundsFor(path: string): [number, number] {
  if (VAR_BOUNDS[path]) return VAR_BOUNDS[path];
  if (path.startsWith('society.violenceDeaths')) return [0, 100000];
  if (path.startsWith('economy.')) return [0, 150];
  return [0, 100];
}

export function clampStateVars(state: GameState) {
  const root = state as unknown as Record<string, unknown>;
  for (const section of ['economy', 'society', 'institutions', 'diplomacy']) {
    const obj = state[section as 'economy'] as unknown as Record<string, number>;
    for (const key of Object.keys(obj)) {
      const path = `${section}.${key}`;
      const [lo, hi] = defaultBoundsFor(path);
      obj[key] = Math.max(lo, Math.min(hi, obj[key]));
    }
  }
  void root;
}

export { toISO };
