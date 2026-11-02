import type { EventChoice } from '../types';
import { c } from './helpers';

/** 1929—1932 年事件补充的第三个选项 */
export const extraChoicesLate: Record<string, EventChoice[]> = {
  // ── 1929—1930 ──────────────────────────────────────────
  ev_wall_street_crash: [
    c('international_coordination', '与国际央行协调建立外汇互助', '获得短期流动性支持。', '外部冲击被缓冲，但对国际协作的依赖加深。', {
      'diplomacy.capitalConfidence': 3,
      'economy.foreignCapital': 2,
      'economy.bankLiquidity': 2,
    }),
  ],
  ev_capital_outflow: [
    c('negotiate_standstill', '与债权国谈判债务展期', '外债到期压力推迟。', '避免即时挤兑，但长期偿债负担与国际监督加重。', {
      'diplomacy.capitalConfidence': 2,
      'diplomacy.reparationsPressure': 3,
      'economy.creditSupply': 1,
    }),
  ],
  ev_credit_crunch: [
    c('credit_guarantee_fund', '设立工业信贷担保基金', '部分企业获得周转资金。', '破产放缓，财政风险上升。', {
      'economy.creditSupply': 2,
      'economy.deficit': 0.8,
      'economy.businessFailures': -1,
    }),
  ],
  ev_unemployment_surge: [
    c('short_time_subsidy', '扩大短时工作补贴', '企业减少裁员。', '失业数字被压低，但工时与收入下降，财政负担转移。', {
      'economy.unemployment': -0.5,
      'economy.spending': 0.8,
      'society.satisfaction': 1,
    }),
  ],
  ev_bloody_may: [
    c('council_inquiry', '由市议会调查警方执法', '执法过程被公开审查。', '警民关系部分修复，但警察系统内部不满。', {
      'institutions.policeNeutrality': 3,
      'society.polarization': -1,
      'institutions.judicialIndependence': 1,
    }),
  ],
  ev_young_plan_referendum: [
    c('presidential_explanation', '由总统公开说明计划收益', '总统为外交路线背书。', '右翼动员受挫，但总统进一步卷入党派争议。', {
      'society.republicSupport': 2,
      'society.polarization': -2,
      'institutions.presidentialPowerUse': 2,
    }),
  ],
  ev_unemployment_fund_gap: [
    c('federal_bond', '由联邦发行专项债券填补缺口', '基金暂时平衡。', '赤字上升，但避免了联盟立即破裂。', {
      'economy.deficit': 1,
      'institutions.governmentDurability': 3,
      'economy.debt': 0.8,
    }),
  ],
  ev_mueller_fall: [
    c('caretaker_until_autumn', '由总统指定看守内阁维持至秋季', '政府以看守身份延续。', '议会组阁权被绕过，总统成为政府形成的实际决定者。', {
      'institutions.presidentialPowerUse': 4,
      'institutions.parliamentAuthority': -3,
      'institutions.governmentLegitimacy': -2,
    }),
  ],
  ev_bruening_cabinet: [
    c('centre_right_tolerance', '组建中右少数政府并寻求SPD容忍', '政府依赖外部容忍。', '议会程序得以维持，紧急法令的使用频率下降。', {
      'institutions.parliamentAuthority': 3,
      'institutions.emergencyDependence': -4,
      'institutions.governmentDurability': -2,
    }),
  ],
  ev_reichstag_rejects_budget: [
    c('negotiate_cuts', '与国会妥协，削减部分紧缩条款', '预算以修改版通过。', '紧缩力度下降，但议会重新获得财政话语权。', {
      'economy.spending': 0.5,
      'institutions.parliamentAuthority': 4,
      'diplomacy.capitalConfidence': -1,
    }),
  ],
  ev_election_1930: [
    c('postpone_election', '推迟选举以稳定局势', '选举延期。', '政府获得时间，但议会代表性受损，街头动员替代了选举竞争。', {
      'institutions.parliamentAuthority': -6,
      'society.polarization': 3,
      'society.violence': 2,
    }),
    c('electoral_threshold', '修改选举法设置进入门槛', '小党被挤出议会。', '议会碎片化缓解，但代表性下降，被排除者转向街头。', {
      'institutions.partyCompromise': -4,
      'institutions.parliamentAuthority': -2,
      'institutions.governmentDurability': 4,
    }),
  ],
  ev_nazi_breakthrough: [
    c('monitor_and_ban_uniforms', '由内政部监控纳粹组织并禁止制服游行', '街头展示被压制。', '纳粹动员受挫，但其选举吸引力未减。', {
      'society.violence': -2,
      'institutions.policeNeutrality': 2,
      'society.polarization': 1,
    }),
  ],
  ev_liberal_decline: [
    c('alliance_with_zentrum', '与中央党结成选举联盟', '中间派协调候选。', '自由主义残余得以保存，但独立性丧失。', {
      'institutions.partyCompromise': 3,
      'institutions.democraticResilience': 2,
      'institutions.parliamentAuthority': 1,
    }),
  ],

  // ── 1931—1932 ──────────────────────────────────────────
  ev_bank_crisis_1931: [
    c('central_bank_injection', '由央行直接注资并部分国有化', '银行体系获得流动性。', '危机被遏制，但国家与银行深度绑定。', {
      'economy.bankLiquidity': 5,
      'economy.deficit': 2,
      'diplomacy.capitalConfidence': -1,
    }),
  ],
  ev_hoover_moratorium: [
    c('accept_and_renegotiate', '接受暂停并同时要求重开赔款谈判', '赔款问题重新进入议程。', '外交主动，但协约国不愿在危机中作长期让步。', {
      'diplomacy.reparationsPressure': -4,
      'diplomacy.relationUSA': 4,
      'diplomacy.relationFrance': 2,
    }),
  ],
  ev_harzburg_front: [
    c('ban_joint_rallies', '禁止准军事组织联合集会', '集会受限。', '右翼联合的公开化被阻断，但地下协调继续。', {
      'society.violence': -2,
      'society.polarization': 2,
      'institutions.policeNeutrality': 2,
    }),
  ],
  ev_violence_escalation: [
    c('special_court', '由帝国法院设立政治暴力专庭', '暴力案件集中审理。', '追责效率提高，但司法系统被推到政治前台。', {
      'institutions.judicialIndependence': 3,
      'society.violence': -2,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_mass_unemployment: [
    c('tax_financed_works', '以税收融资的紧急就业计划', '部分失业者重新就业。', '财政赤字扩大，但“失业—极端化”链条被部分阻断。', {
      'economy.unemployment': -1,
      'economy.deficit': 1.2,
      'society.satisfaction': 3,
    }),
  ],
  ev_austerity_debate: [
    c('exempt_employment', '维持紧缩但豁免就业与住房支出', '紧缩与就业并行。', '财政纪律部分保留，社会压力略有缓解。', {
      'economy.unemployment': -0.4,
      'economy.deficit': 0.6,
      'diplomacy.capitalConfidence': -1,
    }),
  ],
  ev_presidential_1932_first: [
    c('support_with_conditions', '支持兴登堡但要求其公开承诺宪政治理', '总统作出有限承诺。', '共和派支持有条件化，总统的自主空间被压缩。', {
      'institutions.constitutionalCommitment': 4,
      'institutions.presidentialPowerUse': -2,
      'society.polarization': 1,
    }),
  ],
  ev_presidential_1932_second: [
    c('boycott', '共和派弃权以示抗议', '投票率下降。', '抗议表达清晰，但等于把总统职位交给对手阵营的动员。', {
      'society.polarization': 4,
      'institutions.constitutionalCommitment': -3,
      'society.trust': -2,
    }),
    c('full_mobilization', '全力动员共和派选民', '共和派集中投票。', '兴登堡以更大优势连任，但共和派对其的依赖也更深。', {
      'society.republicSupport': 3,
      'institutions.constitutionalCommitment': 3,
      'society.polarization': 2,
    }),
  ],
  ev_sa_expansion: [
    c('joint_police_action', '由各邦警察联合取缔制服游行', '冲锋队的公开动员受阻。', '暴力短期下降，但各邦执法力度不一。', {
      'society.violence': -4,
      'institutions.policeNeutrality': 2,
      'institutions.federalCohesion': -1,
    }),
  ],
  ev_papen_cabinet: [
    c('zentrum_led_minority', '组建由中央党主导的少数政府', '中间派重新主导组阁。', '议会空间保留，但总统顾问圈不满。', {
      'institutions.parliamentAuthority': 4,
      'institutions.presidentialPowerUse': -4,
      'institutions.governmentDurability': -2,
    }),
  ],
  ev_prussian_coup: [
    c('legal_resistance', '由邦议会提起宪法诉讼并号召公务员抵制', '政变遭遇行政阻力。', '联邦与法治获得一线生机，但总统可能进一步动用权力。', {
      'institutions.parliamentAuthority': 4,
      'institutions.federalCohesion': 2,
      'institutions.judicialIndependence': 3,
      'society.polarization': 2,
    }),
  ],
  ev_election_1932_07: [
    c('postpone_election', '推迟选举以争取组阁时间', '选举延期。', '时间被换取，但“议会已无法运作”的叙事强化。', {
      'institutions.parliamentAuthority': -5,
      'society.polarization': 3,
    }),
    c('ban_sa_before_vote', '选前取缔冲锋队', '街头暴力短期下降。', '纳粹动员受挫，但可能激起同情票与右翼反弹。', {
      'society.violence': -4,
      'society.polarization': 3,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_nazi_largest_party: [
    c('parliamentary_censure', '由国会通过谴责动议并要求总统说明', '国会表态。', '议会主权被宣示，但对总统任命权无实质约束。', {
      'institutions.parliamentAuthority': 3,
      'society.polarization': 2,
      'institutions.presidentialPowerUse': -1,
    }),
  ],
  ev_negative_majority: [
    c('reform_rules', '修改议事规则限制解散权', '解散门槛提高。', '议会自我保护，但与总统的直接冲突加剧。', {
      'institutions.parliamentAuthority': 4,
      'institutions.presidentialPowerUse': -3,
      'society.polarization': 2,
    }),
  ],
  ev_altona_bloody_sunday: [
    c('joint_inquiry', '由汉堡与帝国警察联合调查', '事件进入联合调查程序。', '执法中立性部分恢复，但调查结论难以服众。', {
      'institutions.policeNeutrality': 3,
      'society.violence': -1,
      'institutions.judicialIndependence': 1,
    }),
  ],
  ev_election_1932_11: [
    c('postpone_election', '推迟选举', '选举延期。', '避免了又一轮动员，但议会的合法性进一步流失。', {
      'institutions.parliamentAuthority': -4,
      'society.polarization': 2,
    }),
    c('united_democratic_campaign', '民主派联合竞选', '中间派协调候选与议题。', '民主阵营席位集中，但内部矛盾公开化。', {
      'society.republicSupport': 3,
      'institutions.partyCompromise': 3,
      'institutions.parliamentAuthority': 2,
    }),
  ],
  ev_nazi_decline_illusion: [
    c('offer_strasser_post', '向施特拉瑟派提供入阁条件', '纳粹党内分裂加深。', '若分化成功，纳粹的组织统一性将被削弱。', {
      'society.polarization': -2,
      'institutions.democraticResilience': 3,
      'institutions.partyCompromise': 2,
    }),
  ],
  ev_schleicher_cabinet: [
    c('union_military_pact', '由工会与军方共同支持就业计划', '跨阵营联盟成形。', '若维持，或可阻断纳粹的合法夺权路径。', {
      'economy.unemployment': -0.5,
      'institutions.partyCompromise': 3,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_agrarian_pressure: [
    c('debt_swap_neutrality', '以农业债务重组换取地主放弃政治干预', '地主获得实质利益。', '农村压力缓解，精英对宪政的直接干预减少。', {
      'economy.agriculturalDebt': -3,
      'economy.spending': 0.4,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_elite_bargain: [
    c('emergency_and_ban', '由总统宣布紧急状态并禁止一切准军事组织', '街头武装被同时压制。', '暴力短期下降，但总统权力进一步扩张，民主程序仍受威胁。', {
      'society.violence': -3,
      'institutions.presidentialPowerUse': 5,
      'institutions.democraticResilience': -2,
      'institutions.policeNeutrality': 2,
    }),
  ],
};
