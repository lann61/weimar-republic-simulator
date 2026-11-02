/**
 * 数据层类型定义 — Weimar Republic Simulator V1.1
 * 所有历史数据必须带 source_ids 与 data_quality 标签（见方案 §27.5）
 */

export type DataQuality =
  | 'historical_verified'
  | 'historical_secondary'
  | 'historical_estimate'
  | 'simulation_derived'
  | 'player_modified'
  | 'unknown';

export interface Sourced {
  source_ids: string[];
  data_quality: DataQuality;
  notes?: string;
}

export type PartyId = string;

export interface Ideology {
  /** -1 极左 .. +1 极右 */
  economic_left_right: number;
  /** -1 威权 .. +1 自由 */
  social_authority_liberty: number;
  /** 0 反民主 .. 1 坚定宪政 */
  democratic_commitment: number;
}

export interface Party extends Sourced {
  id: PartyId;
  name_zh: string;
  name_de: string;
  short_name: string;
  active_from: string;
  active_to: string | null;
  successor_of?: PartyId;
  renamed_to?: PartyId;
  color: string;
  ideology: Ideology;
  /** 核心选民群体 */
  constituencies: string[];
  /** 倾向联合对象 */
  coalition_preferences: PartyId[];
  /** 绝不联合对象（红线） */
  red_lines: PartyId[];
  /** 反体制程度 0..1：越高越倾向以制度外手段行动 */
  anti_system: number;
  /** 组织纪律 0..1 */
  discipline: number;
  /** 动员能力 0..1 */
  mobilization: number;
  /** 组织密度 0..1 */
  organization: number;
  /** 媒体影响力 0..1 */
  media: number;
  /** 领袖影响力 0..1 */
  leadership: number;
  /** 党员规模（历史估算） */
  membership?: { year: number; count: number; data_quality: DataQuality }[];
  /** 政策立场向量，用于组阁与法案计算 */
  policy: {
    welfare: number; // -1 削减 .. +1 扩张
    fiscal: number; // -1 紧缩 .. +1 扩张
    labor: number; // -1 亲雇主 .. +1 亲劳工
    foreign: number; // -1 对抗 .. +1 和解
    federal: number; // -1 中央集权 .. +1 邦权
    religion: number; // -1 世俗 .. +1 宗教
    rearmament: number;
  };
  /** 对总统内阁 / 第48条的容忍度 0..1 */
  tolerates_presidential_cabinet: number;
  tolerates_article48: number;
  summary_zh: string;
}

export interface VoterGroup extends Sourced {
  id: string;
  name_zh: string;
  /** 占全体选民比重（互斥主群体模型，V1.1） */
  weight: number;
  turnout_base: number;
  /** 群体意识形态理想点 */
  ideal: { economic: number; social: number };
  /** 议题敏感度 */
  sensitivity: {
    unemployment: number;
    inflation: number;
    wages: number;
    security: number;
    welfare: number;
    nationalism: number;
    religion: number;
  };
  /** 初始党派亲和度 0..1 */
  affinity: Record<PartyId, number>;
  /** 城市/农村 */
  urban: number;
  region?: string;
}

export interface ElectionPartyResult {
  party_id: PartyId;
  party_name_at_election: string;
  votes: number | null;
  vote_share: number;
  seats: number;
  data_quality: DataQuality;
  notes?: string;
}

export interface Election extends Sourced {
  id: string;
  date: string;
  type: 'national_assembly' | 'reichstag' | 'presidential' | 'referendum';
  label_zh: string;
  total_seats: number;
  registered_voters?: number | null;
  votes_cast?: number | null;
  valid_votes?: number | null;
  invalid_votes?: number | null;
  turnout_rate: number;
  /** 选举公平性 0..1（1 = 完全自由公正） */
  fairness: number;
  results: ElectionPartyResult[];
  /** 未单独建模的小党席位合计（史料中存在的残余席位，不强行分配到具体政党） */
  other_seats?: number;
  other_vote_share?: number;
  /** 总统选举专用 */
  presidential?: {
    candidates: { person_id: string; name_zh: string; party_id: PartyId | null; round1?: number; round2?: number }[];
    winner_person_id: string;
  };
  /** 史实锚定用的校准向量（内部使用） */
  calibration?: Record<PartyId, number>;
  environment_note: string;
  historical_outcome: string;
}

export interface CabinetMember {
  person_id: string;
  office_id: string;
  office_zh: string;
  party_id: PartyId | null;
  political_identity: 'party' | 'independent_official' | 'military' | 'professional_civil_servant' | 'industrialist';
  from: string;
  to: string | null;
  appointment_mode: 'presidential_appointment' | 'chancellor_nomination' | 'cabinet_reshuffle';
  cabinet_status: 'full_member' | 'minister_without_portfolio' | 'concurrent' | 'advisor';
}

export interface Government extends Sourced {
  id: string;
  name_zh: string;
  name_de?: string;
  from: string;
  to: string | null;
  chancellor_id: string;
  vice_chancellor_id?: string | null;
  type:
    | 'parliamentary_majority'
    | 'coalition'
    | 'minority'
    | 'caretaker'
    | 'presidential_cabinet'
    | 'transitional'
    | 'constitutional_monarchy'
    | 'council_republic'
    | 'authoritarian';
  parties: PartyId[];
  support_parties?: PartyId[];
  seats_at_formation: number;
  parliament_seats_total: number;
  members: CabinetMember[];
  program_zh: string;
  presidential_support: number;
  parliamentary_trust: 'confirmed' | 'tolerated' | 'unclear' | 'opposed' | 'not_required';
  end_reason?: string;
  is_historical: boolean;
  historical_summary: string;
}

export interface PersonRole {
  office_id: string;
  office_zh: string;
  government_id?: string;
  from: string;
  to: string | null;
  source_ids: string[];
}

export interface Person extends Sourced {
  id: string;
  name_zh: string;
  name_de: string;
  name_en?: string;
  birth_date: string;
  death_date: string;
  is_historical_person: boolean;
  active_period: { from: string; to: string };
  roles: string[];
  party_memberships: { party_id: PartyId | null; from: string | null; to: string | null; source_ids: string[] }[];
  offices: PersonRole[];
  organizations?: string[];
  relationships?: { person_id: string; type: string; from?: string; to?: string; note?: string }[];
  events?: string[];
  portrait_asset: null;
  historical_summary: string;
  simulation_parameters?: { status: 'not_calibrated' | 'calibrated'; notes: string };
}

/** 政权类型：决定国家元首性质与政府类型的根本制度 */
export type RegimeId = 'republic' | 'constitutional_monarchy' | 'council_republic' | 'authoritarian';

/**
 * 结构性影响：让玩家的选择直接改变政治结构，而不仅是数值变量。
 * 例如“保留君主制”会把国家元首换成皇帝、政府类型改为君主立宪政府。
 */
export interface StructuralEffect {
  /** 政权类型 */
  regime?: RegimeId;
  /** 国家元首人物 id（覆盖默认的总统逻辑） */
  headOfStateId?: string;
  /** 国家元首头衔，如“德意志皇帝”“帝国总统”“苏维埃执行委员会主席” */
  headOfStateTitle?: string;
  /** 国家元首就任日期 */
  headOfStateSince?: string;
  /** 总统职位（共和制下与 headOfState 同步，用于选举/继任） */
  presidentId?: string;
  /** 政府类型（GovernmentState.type） */
  governmentType?: string;
  /** 政府名称 */
  governmentName?: string;
  /** 政府首脑人物 id */
  chancellorId?: string;
  /** 执政党列表（会同步更新各党的 inGovernment 标记） */
  rulingParties?: PartyId[];
  /** 外部支持党列表 */
  supportParties?: PartyId[];
  /** 直接安装某个史实内阁（优先于上面的字段） */
  installGovernmentId?: string;
  /** 记录到事件日志中的说明 */
  note?: string;
}

export interface EventChoiceEffect {
  /** 直接变量增量，key 对应 state 中的路径 */
  vars?: Record<string, number>;
  /** 绝对设定值（用于恶性通胀、货币改革等需要“重置”而非“增减”的情形） */
  set?: Record<string, number>;
  /** 设置标志 */
  flags?: Record<string, number | boolean | string>;
  /** 结构性影响：直接改变政权、国家元首与政府构成 */
  structure?: StructuralEffect;
  /** 触发政策（来自 policies.ts） */
  policy_id?: string;
  /** 立即触发的后续事件 */
  follow_up?: string[];
  /** 延迟影响 */
  delayed?: { months: number; vars?: Record<string, number>; flags?: Record<string, number | boolean | string>; note: string }[];
  /** 政府/政治操作 */
  action?:
    | { type: 'dissolve_reichstag' }
    | { type: 'call_election'; date?: string; months?: number }
    | { type: 'form_government'; government_id: string }
    | { type: 'resign_chancellor' }
    | { type: 'article_48'; scope: string; months: number }
    | { type: 'appoint_chancellor'; person_id: string; government_id?: string }
    | { type: 'ban_party'; party_id: string }
    | { type: 'end_simulation'; ending: string };
}

export interface EventChoice {
  id: string;
  label: string;
  short_term: string;
  long_term: string;
  effects: EventChoiceEffect;
  /** 受影响的群体/党派提示 */
  beneficiaries?: string[];
  losers?: string[];
}

export interface HistoricalEvent extends Sourced {
  id: string;
  date: string;
  end_date?: string;
  title: string;
  category:
    | 'revolution'
    | 'constitution'
    | 'election'
    | 'government_crisis'
    | 'economy'
    | 'diplomacy'
    | 'violence'
    | 'society'
    | 'culture'
    | 'institution'
    | 'elite';
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  importance: 'minor' | 'major' | 'critical';
  background: string;
  participants: string[];
  trigger: {
    type: 'historical_date' | 'condition' | 'event_chain' | 'random';
    conditions?: { path: string; op: '>' | '<' | '>=' | '<=' | '=='; value: number }[];
    requires_events?: string[];
    probability?: number;
  };
  choices: EventChoice[];
  historical_outcome: string;
  /** 无玩家干预时的自动选项 */
  historical_choice_id?: string;
  allows_counterfactual: boolean;
  source_ids: string[];
  data_quality: DataQuality;
}

export interface Policy extends Sourced {
  id: string;
  name_zh: string;
  category: 'fiscal' | 'monetary' | 'labor' | 'social' | 'agriculture' | 'industry' | 'housing' | 'trade' | 'institution';
  description: string;
  fiscal_cost: number; // 占 GDP 百分比
  immediate: Record<string, number>;
  monthly: Record<string, number>;
  beneficiaries: string[];
  losers: string[];
  duration_months: number;
}

export interface ForeignActor extends Sourced {
  id: string;
  name_zh: string;
  name_en: string;
  goals: string[];
  relation_to_germany: number; // -1..1
  trade_dependence: number;
  financial_exposure: number;
  military_pressure: number;
  domestic_constraint: number;
}

export interface EliteNetwork extends Sourced {
  id: string;
  name_zh: string;
  /** 对共和国的认同 0..1 */
  republic_commitment: number;
  /** 对议会政治的接受 0..1 */
  parliamentary_acceptance: number;
  /** 对总统的忠诚 0..1 */
  presidential_loyalty: number;
  /** 对军队自主权偏好 0..1 */
  military_autonomy: number;
  /** 对社会改革态度 -1..1 */
  social_reform: number;
  /** 对非常规治理的容忍 0..1 */
  unconventional_rule_tolerance: number;
  /** 对国家强制力控制 0..1 */
  coercive_control: number;
  influence: number;
  key_figures: string[];
}

export interface Organization extends Sourced {
  id: string;
  name_zh: string;
  name_de?: string;
  type: 'union' | 'employer' | 'veteran' | 'paramilitary' | 'religious' | 'youth' | 'women' | 'press' | 'culture' | 'agriculture';
  alignment: PartyId | 'neutral';
  members_estimate: number;
  violence_participation: number;
  influence: number;
  active_from: string;
  active_to: string | null;
}

export interface Constituency extends Sourced {
  id: string;
  name_zh: string;
  name_de: string;
  /** 席位权重 */
  seats: number;
  urban: number;
  /** 地区党派修正 */
  party_modifiers: Record<PartyId, number>;
  /** 简化地图坐标（SVG 0-100 网格） */
  map: { x: number; y: number; w: number; h: number };
}

/** 挑战情景的结构化条件（WMR-017） */
export interface ChallengeCondition {
  id: string;
  label: string;
  /** 状态路径，如 economy.unemployment */
  path?: string;
  op?: '>' | '<' | '>=' | '<=' | '==';
  value?: number;
  /** 特殊判定：政府是否拥有议会多数 / 是否取缔主要政党 */
  custom?: 'government_majority' | 'no_major_party_ban' | 'parliamentary_governance';
  /** 判定截止日期（可选） */
  deadline?: string;
}

export interface Scenario extends Sourced {
  id: string;
  name_zh: string;
  mode: 'historical' | 'intervention' | 'free' | 'challenge';
  start_date: string;
  description: string;
  objective?: string;
  constraints?: string[];
  state_overrides?: Record<string, number>;
  /** 结构化挑战目标与约束 */
  challenge?: { objectives: ChallengeCondition[]; constraints: ChallengeCondition[] };
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  usage: string;
  license_note: string;
}
