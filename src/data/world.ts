import type { EliteNetwork, ForeignActor, Organization } from './types';

const P = 'source_project_model';

export const foreignActors: ForeignActor[] = [
  {
    id: 'france', name_zh: '法国', name_en: 'France',
    goals: ['确保对德安全边界', '严格执行赔款', '阻止德国重整军备'],
    relation_to_germany: -0.6, trade_dependence: 0.35, financial_exposure: 0.2, military_pressure: 0.8, domestic_constraint: 0.5,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'britain', name_zh: '英国', name_en: 'United Kingdom',
    goals: ['维持欧洲均势', '恢复贸易与金融稳定', '避免法国过度扩张'],
    relation_to_germany: -0.1, trade_dependence: 0.45, financial_exposure: 0.4, military_pressure: 0.3, domestic_constraint: 0.4,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'usa', name_zh: '美国', name_en: 'United States',
    goals: ['收回战争贷款', '维持国际金融稳定', '避免卷入欧洲政治'],
    relation_to_germany: 0.2, trade_dependence: 0.5, financial_exposure: 0.8, military_pressure: 0.1, domestic_constraint: 0.6,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'ussr', name_zh: '苏联', name_en: 'Soviet Union',
    goals: ['突破外交孤立', '利用德波矛盾', '推动革命扩散'],
    relation_to_germany: 0.1, trade_dependence: 0.3, financial_exposure: 0.05, military_pressure: 0.2, domestic_constraint: 0.3,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'poland', name_zh: '波兰', name_en: 'Poland',
    goals: ['保住西部领土', '防范德国修正主义', '争取法国支持'],
    relation_to_germany: -0.75, trade_dependence: 0.25, financial_exposure: 0.05, military_pressure: 0.4, domestic_constraint: 0.4,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'italy', name_zh: '意大利', name_en: 'Italy',
    goals: ['修订凡尔赛安排', '在南蒂罗尔与巴尔干扩张影响'],
    relation_to_germany: 0.05, trade_dependence: 0.3, financial_exposure: 0.1, military_pressure: 0.2, domestic_constraint: 0.5,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'belgium', name_zh: '比利时', name_en: 'Belgium',
    goals: ['赔款与重建', '鲁尔与边境安全'],
    relation_to_germany: -0.5, trade_dependence: 0.4, financial_exposure: 0.1, military_pressure: 0.3, domestic_constraint: 0.3,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'czechoslovakia', name_zh: '捷克斯洛伐克', name_en: 'Czechoslovakia',
    goals: ['维持战后边界', '防范德国与匈牙利修正主义'],
    relation_to_germany: -0.45, trade_dependence: 0.3, financial_exposure: 0.05, military_pressure: 0.25, domestic_constraint: 0.4,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'league', name_zh: '国际联盟', name_en: 'League of Nations',
    goals: ['维持集体安全程序', '管理委任统治与裁军'],
    relation_to_germany: 0.1, trade_dependence: 0, financial_exposure: 0, military_pressure: 0, domestic_constraint: 0.6,
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'markets', name_zh: '国际银行与金融市场', name_en: 'International capital markets',
    goals: ['收益与风险控制', '赔款支付的可预期性'],
    relation_to_germany: 0.15, trade_dependence: 0, financial_exposure: 1.0, military_pressure: 0, domestic_constraint: 0.3,
    source_ids: [P], data_quality: 'simulation_derived',
  },
];

export const eliteNetworks: EliteNetwork[] = [
  {
    id: 'presidential_office', name_zh: '总统府与顾问圈',
    republic_commitment: 0.35, parliamentary_acceptance: 0.3, presidential_loyalty: 1.0,
    military_autonomy: 0.5, social_reform: -0.4, unconventional_rule_tolerance: 0.8, coercive_control: 0.4, influence: 0.95,
    key_figures: ['person_hindenburg', 'person_papen', 'person_schleicher'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'reichswehr', name_zh: '国防军领导层',
    republic_commitment: 0.25, parliamentary_acceptance: 0.15, presidential_loyalty: 0.85,
    military_autonomy: 0.95, social_reform: -0.5, unconventional_rule_tolerance: 0.6, coercive_control: 0.85, influence: 0.9,
    key_figures: ['person_seeckt', 'person_groener', 'person_schleicher', 'person_blomberg'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'civil_service', name_zh: '高级公务员与官僚系统',
    republic_commitment: 0.4, parliamentary_acceptance: 0.45, presidential_loyalty: 0.6,
    military_autonomy: 0.2, social_reform: -0.2, unconventional_rule_tolerance: 0.5, coercive_control: 0.5, influence: 0.8,
    key_figures: ['person_luther', 'person_krosigk'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'judiciary', name_zh: '司法系统',
    republic_commitment: 0.4, parliamentary_acceptance: 0.5, presidential_loyalty: 0.5,
    military_autonomy: 0.3, social_reform: -0.3, unconventional_rule_tolerance: 0.35, coercive_control: 0.4, influence: 0.65,
    key_figures: ['person_simons', 'person_guertner'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'industry', name_zh: '大工业与金融资本',
    republic_commitment: 0.3, parliamentary_acceptance: 0.35, presidential_loyalty: 0.4,
    military_autonomy: 0.3, social_reform: -0.6, unconventional_rule_tolerance: 0.55, coercive_control: 0.2, influence: 0.85,
    key_figures: ['person_stinnes', 'person_hugenberg', 'person_thyssen', 'person_schacht'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'agrarian', name_zh: '农业地主与保守派组织',
    republic_commitment: 0.2, parliamentary_acceptance: 0.3, presidential_loyalty: 0.7,
    military_autonomy: 0.4, social_reform: -0.7, unconventional_rule_tolerance: 0.6, coercive_control: 0.3, influence: 0.7,
    key_figures: ['person_hugenberg', 'person_schiele', 'person_braun_magnus'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'state_governments', name_zh: '邦政府与地方警察系统',
    republic_commitment: 0.5, parliamentary_acceptance: 0.55, presidential_loyalty: 0.45,
    military_autonomy: 0.2, social_reform: 0.0, unconventional_rule_tolerance: 0.3, coercive_control: 0.7, influence: 0.75,
    key_figures: ['person_braun_otto', 'person_severing', 'person_held'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'press', name_zh: '报刊、出版与广播网络',
    republic_commitment: 0.5, parliamentary_acceptance: 0.6, presidential_loyalty: 0.3,
    military_autonomy: 0.1, social_reform: 0.2, unconventional_rule_tolerance: 0.15, coercive_control: 0.05, influence: 0.7,
    key_figures: ['person_wolff_theodor', 'person_ossietzky', 'person_hugenberg'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'unions', name_zh: '工会与雇主组织',
    republic_commitment: 0.75, parliamentary_acceptance: 0.75, presidential_loyalty: 0.2,
    military_autonomy: 0.05, social_reform: 0.7, unconventional_rule_tolerance: 0.1, coercive_control: 0.2, influence: 0.8,
    key_figures: ['person_legien', 'person_leipart', 'person_stegerwald'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
  {
    id: 'party_factions', name_zh: '政党内部派系与个人网络',
    republic_commitment: 0.55, parliamentary_acceptance: 0.7, presidential_loyalty: 0.35,
    military_autonomy: 0.1, social_reform: 0.1, unconventional_rule_tolerance: 0.3, coercive_control: 0.15, influence: 0.8,
    key_figures: ['person_wels', 'person_strasser', 'person_kaas'],
    source_ids: [P], data_quality: 'simulation_derived',
  },
];

export const organizations: Organization[] = [
  { id: 'adgb', name_zh: '自由工会联合会', name_de: 'Allgemeiner Deutscher Gewerkschaftsbund', type: 'union', alignment: 'spd', members_estimate: 4500000, violence_participation: 0.05, influence: 0.85, active_from: '1919-07-01', active_to: '1933-05-02', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'christian_unions', name_zh: '基督教工会', name_de: 'Christliche Gewerkschaften', type: 'union', alignment: 'zentrum', members_estimate: 1000000, violence_participation: 0.02, influence: 0.55, active_from: '1919-01-01', active_to: '1933-05-02', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'rgi', name_zh: '帝国工业联合会', name_de: 'Reichsverband der Deutschen Industrie', type: 'employer', alignment: 'dvp', members_estimate: 0, violence_participation: 0, influence: 0.85, active_from: '1919-02-01', active_to: '1933-06-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'landbund', name_zh: '帝国农业联盟', name_de: 'Reichslandbund', type: 'agriculture', alignment: 'dnvp', members_estimate: 0, violence_participation: 0.1, influence: 0.7, active_from: '1919-01-01', active_to: '1933-06-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'stahlhelm', name_zh: '钢盔团', name_de: 'Stahlhelm, Bund der Frontsoldaten', type: 'paramilitary', alignment: 'dnvp', members_estimate: 500000, violence_participation: 0.6, influence: 0.55, active_from: '1918-12-25', active_to: '1934-01-01', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'reichsbanner', name_zh: '黑红金帝国旗帜团', name_de: 'Reichsbanner Schwarz-Rot-Gold', type: 'paramilitary', alignment: 'spd', members_estimate: 1500000, violence_participation: 0.35, influence: 0.5, active_from: '1924-02-22', active_to: '1933-03-01', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'sa', name_zh: '冲锋队', name_de: 'Sturmabteilung', type: 'paramilitary', alignment: 'nsdap', members_estimate: 400000, violence_participation: 0.95, influence: 0.7, active_from: '1920-11-01', active_to: '1934-07-01', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'rfk', name_zh: '红色前线战士联盟', name_de: 'Roter Frontkämpferbund', type: 'paramilitary', alignment: 'kpd', members_estimate: 100000, violence_participation: 0.8, influence: 0.4, active_from: '1924-07-01', active_to: '1929-05-03', source_ids: [P], data_quality: 'historical_estimate' },
  { id: 'catholic_assoc', name_zh: '天主教社会与教会组织', name_de: 'Katholische Verbände', type: 'religious', alignment: 'zentrum', members_estimate: 0, violence_participation: 0, influence: 0.75, active_from: '1919-01-01', active_to: '1933-07-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'protestant_assoc', name_zh: '新教教会与保守社团', name_de: 'Evangelische Verbände', type: 'religious', alignment: 'dnvp', members_estimate: 0, violence_participation: 0.05, influence: 0.6, active_from: '1919-01-01', active_to: '1933-07-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'youth_movement', name_zh: '青年与体育团体', name_de: 'Jugend- und Sportverbände', type: 'youth', alignment: 'neutral', members_estimate: 0, violence_participation: 0.15, influence: 0.4, active_from: '1919-01-01', active_to: '1933-07-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'women_movement', name_zh: '妇女组织与福利协会', name_de: 'Frauenverbände', type: 'women', alignment: 'neutral', members_estimate: 0, violence_participation: 0, influence: 0.4, active_from: '1919-01-01', active_to: '1933-07-01', source_ids: [P], data_quality: 'historical_secondary' },
  { id: 'scherl', name_zh: '胡根贝格报业集团', name_de: 'Scherl-Konzern', type: 'press', alignment: 'dnvp', members_estimate: 0, violence_participation: 0, influence: 0.65, active_from: '1916-01-01', active_to: '1933-06-01', source_ids: [P], data_quality: 'historical_secondary' },
];
