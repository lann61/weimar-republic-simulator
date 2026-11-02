import type { PartyId, ChallengeCondition } from '../data/types';

export type GameMode = 'historical' | 'intervention' | 'free' | 'challenge';

export interface EconomyState {
  output: number; // 工业生产指数，1928≈100
  gdp: number;
  unemployment: number; // %
  inflation: number; // 年化 %
  priceLevel: number; // 1913=100
  realWages: number;
  taxRevenue: number; // % GDP
  spending: number; // % GDP
  deficit: number; // % GDP
  debt: number; // % GDP
  foreignCapital: number;
  bankLiquidity: number;
  creditSupply: number;
  businessFailures: number;
  agriculturalDebt: number;
  foodPrices: number;
  savingsValue: number;
  investment: number;
  consumption: number;
  exports: number;
  imports: number;
  capitalInflow: number;
  moneySupply: number;
  reparationsPaid: number;
}

export interface SocietyState {
  satisfaction: number;
  trust: number;
  republicSupport: number;
  polarization: number;
  violence: number;
  violenceDeaths: number;
  strikes: number;
  mediaFreedom: number;
  inequality: number;
  housing: number;
  socialTrust: number;
  optimism: number;
  youthUnemployment: number;
  antisemitism: number;
  poverty: number;
  protests: number;
  politicalMurders: number;
  womenParticipation: number;
  culturalFreedom: number;
}

export interface InstitutionsState {
  constitutionalCommitment: number;
  parliamentAuthority: number;
  presidentialPowerUse: number;
  emergencyDependence: number;
  governmentLegitimacy: number;
  judicialIndependence: number;
  policeNeutrality: number;
  militarySubordination: number;
  federalCohesion: number;
  partyCompromise: number;
  governmentDurability: number;
  democraticResilience: number;
}

export interface DiplomacyState {
  reparationsPressure: number;
  foreignLoans: number;
  capitalConfidence: number;
  treatyConstraint: number;
  isolation: number;
  prestige: number;
  relationFrance: number;
  relationBritain: number;
  relationUSA: number;
  relationUSSR: number;
  relationPoland: number;
  borderPressure: number;
  disarmamentConstraint: number;
  leagueParticipation: number;
}

export interface PartyState {
  id: PartyId;
  support: number; // 模型估算支持度 %
  supportLastElection: number; // 最近一次选举得票率
  votesLastElection: number | null;
  seatsLastElection: number;
  seats: number; // 当前席位
  membership: number;
  organization: number;
  mobilization: number;
  media: number;
  leadership: number;
  discipline: number;
  scandal: number;
  banned: boolean;
  active: boolean;
  inGovernment: boolean;
  supportsGovernment: boolean;
}

export interface VoterGroupState {
  id: string;
  affinity: Record<PartyId, number>;
  /** 群体固有党派倾向（归一化），用于在选举校准后仍保留群体差异 */
  tilt: Record<PartyId, number>;
  satisfaction: number;
  trust: number;
  republicSupport: number;
  economicOutlook: number;
  turnout: number;
  alienation: number;
}

export interface GovernmentMemberState {
  person_id: string;
  office_id: string;
  office_zh: string;
  party_id: PartyId | null;
  political_identity: string;
  from: string;
  to: string | null;
  appointment_mode: string;
  cabinet_status: string;
}

export interface GovernmentState {
  id: string;
  name_zh: string;
  type: string;
  parties: PartyId[];
  supportParties: PartyId[];
  chancellorId: string;
  viceChancellorId: string | null;
  startDate: string;
  endDate: string | null;
  seatsAtFormation: number;
  parliamentSeatsTotal: number;
  members: GovernmentMemberState[];
  program: string;
  presidentialSupport: number;
  trustStatus: string;
  endReason?: string;
  isHistorical: boolean;
  /** 模拟生成的政府 */
  isSimulated?: boolean;
}

export interface ElectionRecord {
  id: string;
  date: string;
  type: string;
  label: string;
  totalSeats: number;
  turnout: number;
  fairness: number;
  results: { partyId: PartyId; share: number; votes: number | null; seats: number; isSimulated: boolean }[];
  /** 史料中未单独列出的“其他政党/独立议员”席位（历史模式保留） */
  otherSeats?: number;
  /** 其他政党/独立议员的得票率 */
  otherVoteShare?: number;
  /** 触发原因（schedule / event / dissolution / early） */
  triggerReason?: string;
  isHistorical: boolean;
  note: string;
  governmentFormed?: string;
}

/** 统一选举日程条目（WMR-016） */
export interface ElectionScheduleEntry {
  date: string;
  type: 'reichstag' | 'national_assembly';
  label: string;
  historicalId?: string;
  trigger: 'schedule' | 'event' | 'dissolution' | 'early';
  reason: string;
}

export interface Article48Record {
  id: string;
  date: string;
  reason: string;
  scope: string;
  months: number;
  presidentId: string;
  chancellorId: string;
  parliamentaryReaction: string;
  active: boolean;
}

export interface DelayedEffect {
  id: string;
  triggerDate: string;
  months: number;
  vars: Record<string, number>;
  note: string;
  eventId?: string;
  flags?: Record<string, number | boolean | string>;
}

export interface ActivePolicy {
  id: string;
  policyId: string;
  startDate: string;
  monthsLeft: number;
  note: string;
}

export interface PendingEvent {
  eventId: string;
  choices: string[];
  openedAt: string;
}

export interface LogEntry {
  id: string;
  date: string;
  type: 'event' | 'election' | 'government' | 'economy' | 'society' | 'institution' | 'diplomacy' | 'decision' | 'news' | 'article48';
  title: string;
  detail: string;
  importance: 'minor' | 'major' | 'critical';
  causes?: string[];
}

export interface Snapshot {
  date: string;
  economy: Partial<EconomyState>;
  society: Partial<SocietyState>;
  institutions: Partial<InstitutionsState>;
  /** 当月外交状态副本（旧存档可能缺失，读取时需兼容） */
  diplomacy?: Partial<DiplomacyState>;
  parties: Record<PartyId, number>;
  governmentId: string;
  chancellorId: string;
}

export interface CauseContribution {
  factor: string;
  weight: number;
  detail: string;
}

export interface MonthlyNews {
  date: string;
  headline: string;
  body: string;
  tags: string[];
}

/** 挑战情景运行时状态（WMR-017） */
export interface ChallengeProgress {
  id: string;
  label: string;
  current: number;
  met: boolean;
  evaluatedAt?: string;
}

export interface ChallengeState {
  scenarioId: string;
  objectives: ChallengeCondition[];
  constraints: ChallengeCondition[];
  progress: ChallengeProgress[];
  status: 'active' | 'passed' | 'failed';
  note?: string;
}

export interface GameState {
  /** 无选择的外生局势事件；独立随机流避免改变原有选项随机序列。 */
  worldEvents?: WorldEventState;
  meta: {
    seed: number;
    mode: GameMode;
    scenarioId: string;
    startDate: string;
    dataVersion: string;
    rngCalls: number;
    /** 玩家决策偏离史实的累积程度 0..1 */
    divergence: number;
    ended: boolean;
    ending?: string;
    endingTitle?: string;
  };
  date: string;
  /** 日级游标（当月内当前处理到的事件/任命日期）；缺省时回落到 date */
  cursorDate?: string;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  economy: EconomyState;
  society: SocietyState;
  institutions: InstitutionsState;
  diplomacy: DiplomacyState;
  parties: Record<PartyId, PartyState>;
  voterGroups: Record<string, VoterGroupState>;
  government: GovernmentState;
  governmentHistory: GovernmentState[];
  presidentId: string;
  presidentSince: string;
  elections: ElectionRecord[];
  /** 事件触发的选举日程（WMR-016） */
  electionSchedule?: ElectionScheduleEntry[];
  article48: Article48Record[];
  activePolicies: ActivePolicy[];
  delayedEffects: DelayedEffect[];
  pendingEvent: PendingEvent | null;
  firedEvents: string[];
  evaluatedEvents?: Record<string, string>;
  decisionMemory?: { eventId: string; choiceId: string; date: string; expires: string; monthly: Record<string, number>; note: string }[];
  metricChanges?: Record<string, { source: string; delta: number }[]>;
  decisions: { date: string; eventId: string; choiceId: string; label: string; title?: string; shortTerm?: string; longTerm?: string; automatic?: boolean; effects?: Record<string, number>; causes?: string[] }[];
  log: LogEntry[];
  snapshots: Snapshot[];
  news: MonthlyNews[];
  flags: Record<string, number | boolean | string>;
  /** 本月已出现的普通决策数 */
  decisionsThisMonth: number;
  parliamentSeatsTotal: number;
  lastElectionDate: string | null;
  lastGovernmentChange: string | null;
  stats: {
    electionsHeld: number;
    governmentsFormed: number;
    article48Count: number;
    decisionsMade: number;
    crisesResolved: number;
  };
  /** 挑战情景运行时状态（仅 challenge 模式） */
  challenge?: ChallengeState;
}

export type WorldEventCategory = 'international' | 'economic' | 'political' | 'popular' | 'social';
export interface WorldEventRecord {
  id: string;
  templateId: string;
  date: string;
  category: WorldEventCategory;
  favorable: boolean;
  title: string;
  description: string;
  transmission: string;
  context: string;
  intensity: number;
  duration: number;
  remaining: number;
  monthly: Record<string, number>;
  /** 已实际生效的直接冲击，含边界截断；不冒充全部间接因果。 */
  cumulative: Record<string, number>;
}
export interface WorldEventState {
  nextDate: string;
  rngCalls: number;
  lastProcessedMonth?: string;
  records: WorldEventRecord[];
}

export interface StepResult {
  state: GameState;
  openedEvent?: string;
  messages: string[];
}
