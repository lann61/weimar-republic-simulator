import type { EventChoice } from '../types';
import { c } from './helpers';

/** 1923—1928 年事件补充的第三个选项 */
export const extraChoicesMiddle: Record<string, EventChoice[]> = {
  // ── 1923 ───────────────────────────────────────────────
  ev_ruhr_occupation: [
    c('suspend_payments_only', '只停止赔款支付，不禁止服从占领当局', '避免正面冲突，但被指屈服。', '民族主义动员减弱，赔款与外交压力仍然存在。', {
      'diplomacy.reparationsPressure': 4,
      'diplomacy.relationFrance': -4,
      'economy.inflation': 2,
      'society.satisfaction': -2,
    }),
  ],
  ev_revenue_collapse: [
    c('levy_in_kind', '征收实物税与紧急财产税', '财政收入部分恢复。', '税基重建，但富裕阶层与农业利益强烈反对。', {
      'economy.taxRevenue': 1,
      'economy.inflation': -1,
      'society.satisfaction': -2,
    }),
  ],
  ev_hyperinflation: [
    c('indexed_bonds', '发行外币计价债券以稳定预期', '部分资本回流。', '货币信心短期改善，但外债依赖加深。', {
      'economy.inflation': -6,
      'diplomacy.capitalConfidence': 3,
      'economy.savingsValue': -2,
    }),
  ],
  ev_cuno_fall: [
    c('presidential_reshuffle', '由总统授权库诺改组为少数内阁', '政府形式上延续。', '议会更迭被行政安排取代，总统权力进一步前置。', {
      'institutions.presidentialPowerUse': 3,
      'institutions.parliamentAuthority': -2,
      'institutions.governmentDurability': -2,
    }),
  ],
  ev_middle_class_ruin: [
    c('compensation_fund', '设立通胀受害者补偿基金', '中产获得象征性补偿。', '财政负担上升，但“通胀创伤”的政治能量被部分吸收。', {
      'economy.spending': 0.5,
      'society.satisfaction': 2,
      'society.polarization': -1,
    }),
  ],
  ev_barter_economy: [
    c('tax_foreign_currency', '允许外币结算但对其征税', '交易恢复且部分可税。', '货币主权碎片化，但国家获得新的收入来源。', {
      'economy.inflation': 1,
      'economy.taxRevenue': 1,
      'economy.capitalInflow': 1,
    }),
  ],
  ev_end_passive_resistance: [
    c('phased_withdrawal', '分阶段结束抵抗，先恢复铁路与矿业', '停产逐步缓解。', '社会痛苦延长，但避免了突然的政策转向冲击。', {
      'society.satisfaction': -3,
      'economy.inflation': -3,
      'diplomacy.relationFrance': 2,
    }),
  ],
  ev_bavaria_emergency: [
    c('military_buffer', '由国防军中立化巴伐利亚边境', '中央展示武力但避免直接接管。', '联邦紧张升级，军队的政治角色强化。', {
      'institutions.federalCohesion': -3,
      'institutions.militarySubordination': 2,
      'society.violence': 2,
    }),
  ],
  ev_saxony_thuringia: [
    c('fiscal_supervision', '以财政监督代替军事接管', '邦政府保留形式但受制于中央。', '联邦原则受损较小，中央权威以更隐蔽的方式确立。', {
      'institutions.federalCohesion': 2,
      'institutions.parliamentAuthority': 1,
      'institutions.presidentialPowerUse': 2,
    }),
  ],
  ev_separatism: [
    c('fiscal_loyalty_deal', '以紧急财政援助换取莱茵兰效忠', '分离运动失去财政基础。', '领土完整以财政代价维持，地方对中央的依赖加深。', {
      'economy.spending': 0.4,
      'institutions.federalCohesion': 2,
      'diplomacy.relationFrance': -1,
    }),
  ],
  ev_beer_hall_putsch: [
    c('bavarian_suppression', '由巴伐利亚邦政府自行镇压以保面子', '慕尼黑自行收场。', '联邦冲突缓和，但纳粹审判仍在巴伐利亚司法体系内进行。', {
      'institutions.federalCohesion': 2,
      'institutions.judicialIndependence': -1,
      'society.violence': -1,
    }),
  ],
  ev_rentenmark: [
    c('gold_backed_bank', '以黄金与外汇储备支持的新发行银行', '货币获得硬通货支撑。', '稳定更可信，但对外汇储备的依赖成为新的脆弱点。', {
      'diplomacy.capitalConfidence': 4,
      'economy.inflation': -8,
      'economy.savingsValue': -1,
    }),
  ],
  ev_hitler_trial: [
    c('imperial_court', '移交帝国法院审理', '审判脱离巴伐利亚地方政治。', '司法程序更中立，但判决仍受民族主义舆论影响。', {
      'institutions.judicialIndependence': 3,
      'society.polarization': -2,
      'institutions.democraticResilience': 2,
    }),
  ],

  // ── 1924—1928 ──────────────────────────────────────────
  ev_dawes_plan: [
    c('accept_with_review', '接受但附加“经济能力条款”定期审查', '赔款与偿付能力挂钩。', '财政弹性增加，但每年都要面对国际审查的政治压力。', {
      'diplomacy.reparationsPressure': 2,
      'diplomacy.capitalConfidence': 2,
      'institutions.governmentDurability': -1,
    }),
  ],
  ev_election_1924_05: [
    c('electoral_alliance', '选前组建中右选举联盟', '中间派协调候选。', '席位略有集中，但联盟内部矛盾延续到议会。', {
      'institutions.partyCompromise': 3,
      'institutions.governmentDurability': 2,
    }),
    c('postpone_election', '推迟选举至局势稳定', '选举延期。', '政府获得时间，但议会代表性被质疑。', {
      'institutions.parliamentAuthority': -4,
      'society.polarization': 2,
    }),
  ],
  ev_election_1924_12: [
    c('early_dissolution', '提前解散以趁势选举', '选战提前。', '执政党可能获益，但政治疲劳加剧。', {
      'society.polarization': 2,
      'institutions.governmentDurability': 1,
    }),
    c('commit_grand', '选前承诺组建大联合', '中间派获得协调信号。', '组阁更顺，但政策空间被预先锁定。', {
      'institutions.partyCompromise': 3,
      'institutions.governmentDurability': 2,
    }),
  ],
  ev_luther_cabinet: [
    c('minority_only', '组建不含DNVP的少数内阁', '政府更中间化。', '议会基础更弱，但避免了对保守派的依赖。', {
      'institutions.governmentDurability': -2,
      'institutions.parliamentAuthority': -1,
      'institutions.constitutionalCommitment': 2,
    }),
    c('grand_coalition_1925', '组建包括SPD的大联合', '政府获得稳定多数。', '改革空间更大，但左右翼在国旗与外交上冲突不断。', {
      'institutions.partyCompromise': 3,
      'institutions.parliamentAuthority': 3,
      'institutions.governmentDurability': 3,
    }),
  ],
  ev_ebert_death: [
    c('quick_successor', '由国会快速选出继任者', '总统职位迅速填补。', '议会主导继任，总统职位的党派色彩加深。', {
      'institutions.parliamentAuthority': 3,
      'institutions.presidentialPowerUse': -2,
      'society.trust': 1,
    }),
    c('senate_regency', '由参议院代行职权至选举', '出现代理元首。', '制度连续性维持，但行政权威短期弱化。', {
      'institutions.constitutionalCommitment': -3,
      'institutions.governmentDurability': -2,
      'society.trust': -1,
    }),
  ],
  ev_presidential_1925: [
    c('nonpartisan_judge', '支持无党派法学家西蒙斯', '候选人超出党派。', '总统职位去政治化，但缺乏动员基础。', {
      'institutions.constitutionalCommitment': 3,
      'society.polarization': -1,
      'institutions.presidentialPowerUse': -2,
    }),
  ],
  ev_bauhaus: [
    c('industry_sponsorship', '由工业界资助、减少公共预算', '学校获得企业资金。', '文化创新延续，但对私人赞助的依赖加深。', {
      'society.culturalFreedom': 2,
      'economy.spending': -0.2,
      'institutions.constitutionalCommitment': 1,
    }),
  ],
  ev_hindenburg_elected: [
    c('public_oath', '要求总统公开宣誓并公布顾问名单', '总统作出公开承诺。', '行政透明度提升，总统权力的非正式运作受到约束。', {
      'institutions.constitutionalCommitment': 4,
      'institutions.presidentialPowerUse': -2,
      'society.trust': 2,
    }),
  ],
  ev_locarno: [
    c('sign_with_east_reservation', '签署但明确保留东部边界立场', '西部安全与东方保留并行。', '外交收益与民族主义诉求部分兼顾，但波兰与法国保持警惕。', {
      'diplomacy.relationFrance': 4,
      'diplomacy.relationPoland': -4,
      'diplomacy.prestige': 3,
    }),
  ],
  ev_rationalization: [
    c('share_productivity', '以缩短工时分享生产率收益', '工时下降、工资上升。', '社会冲突缓和，但企业成本上升、国际竞争力承压。', {
      'economy.unemployment': -0.4,
      'economy.realWages': 1,
      'society.satisfaction': 2,
      'economy.output': -0.3,
    }),
  ],
  ev_berlin_treaty: [
    c('economic_only', '仅续签经济协定，暂不涉及军事条款', '合作有限。', '维持东方杠杆，同时降低西方的警觉。', {
      'diplomacy.relationUSSR': 4,
      'diplomacy.relationBritain': 1,
      'diplomacy.isolation': -2,
    }),
  ],
  ev_flag_decree: [
    c('parliament_statute', '由国会立法规定旗帜使用', '争议回到议会。', '议会权威确立，总统的单方面法令被纠正。', {
      'institutions.parliamentAuthority': 3,
      'institutions.presidentialPowerUse': -2,
      'institutions.constitutionalCommitment': 2,
    }),
  ],
  ev_young_plan_negotiation: [
    c('link_to_capacity', '把赔款支付与“经济能力”自动挂钩', '赔款安排获得弹性。', '危机年份可自动减免，但每年都要面对国际审查与国内指责。', {
      'diplomacy.reparationsPressure': 2,
      'diplomacy.capitalConfidence': 2,
      'institutions.governmentDurability': -1,
    }),
  ],
  ev_princes_referendum: [
    c('partial_expropriation', '与王室协商部分征收', '达成财政妥协。', '社会不满部分缓解，君主主义阵营的抵抗减弱。', {
      'economy.spending': 0.3,
      'society.satisfaction': 2,
      'society.polarization': 1,
    }),
  ],
  ev_rand_diplomatic_error: [
    c('parliamentary_explanation', '由外交部长在国会说明并接受质询', '争议进入议会程序。', '外交决策的透明度提升，但谈判空间被公开化压缩。', {
      'institutions.parliamentAuthority': 2,
      'diplomacy.prestige': 1,
      'diplomacy.isolation': -1,
    }),
  ],
  ev_league_entry: [
    c('join_with_parity', '加入但要求裁军对等条款', '入联与裁军挂钩。', '国际地位提升，同时把裁军问题转化为长期谈判筹码。', {
      'diplomacy.leagueParticipation': 6,
      'diplomacy.prestige': 2,
      'diplomacy.isolation': -3,
      'diplomacy.disarmamentConstraint': 2,
    }),
  ],
  ev_berlin_nightlife: [
    c('municipal_regulation', '以市政治安条例有限管理', '夜生活受规范但未禁绝。', '文化活力保留，保守派的道德焦虑部分被安抚。', {
      'society.culturalFreedom': 3,
      'society.polarization': -1,
      'society.optimism': 1,
    }),
  ],
  ev_rand_scandal: [
    c('parliamentary_inquiry', '交由国会调查委员会处理', '调查公开进行。', '议会监督职能强化，但政府短期陷入被动。', {
      'institutions.parliamentAuthority': 2,
      'institutions.governmentDurability': -1,
      'society.trust': 1,
    }),
  ],
  ev_unemployment_insurance: [
    c('shared_financing', '建立保险但由联邦与邦分担费用', '财政责任分摊。', '制度更可持续，但邦政府与中央的财政摩擦增加。', {
      'economy.spending': 0.8,
      'institutions.federalCohesion': 2,
      'society.socialTrust': 3,
    }),
  ],
  ev_election_1928: [
    c('pledge_grand', '选前承诺维持大联合', '中间派获得稳定预期。', '组阁更顺，但政策妥协被提前锁定。', {
      'institutions.governmentDurability': 3,
      'institutions.partyCompromise': 2,
    }),
    c('run_on_reparations', '以反赔款为竞选主轴', '民族主义议题升温。', '短期动员有效，但外交空间被压缩。', {
      'society.polarization': 3,
      'diplomacy.isolation': 2,
      'institutions.democraticResilience': -2,
    }),
  ],
  ev_grand_coalition_1928: [
    c('centre_right_minority', '组建中右少数政府', '政府更窄。', '决策更快，但议会基础不稳。', {
      'institutions.parliamentAuthority': -3,
      'institutions.governmentDurability': -2,
      'institutions.partyCompromise': -2,
    }),
    c('spd_tolerance', '由SPD外部容忍中右政府', '政府依赖容忍协议。', '形式上是少数政府，实质决策受制于容忍条件。', {
      'institutions.governmentDurability': -2,
      'institutions.parliamentAuthority': 1,
      'institutions.partyCompromise': 2,
    }),
  ],
  ev_rand_agri_debt: [
    c('tariff_plus_reschedule', '以关税与债务重组并行', '农户获得双重缓解。', '农村稳定改善，但城市食品价格上升。', {
      'economy.agriculturalDebt': -2,
      'economy.foodPrices': 0.2,
      'society.polarization': -1,
    }),
  ],
  ev_rand_strike: [
    c('voluntary_agreement', '由工会与雇主自愿协议', '冲突以私契约收场。', '国家不介入，劳资自治强化但覆盖面有限。', {
      'society.strikes': -1,
      'society.socialTrust': 1,
      'economy.realWages': 0.3,
    }),
  ],
  ev_panzerschiff: [
    c('defer_to_league', '推迟造舰并交由裁军会议讨论', '军备问题国际化。', '外交信誉提升，但军方与民族主义阵营不满。', {
      'institutions.militarySubordination': -2,
      'diplomacy.prestige': 2,
      'diplomacy.disarmamentConstraint': 3,
    }),
  ],
  ev_wage_conflict: [
    c('arbitration_with_cap', '维持仲裁但设工资上限', '工资增长受限。', '通胀压力减小，工会不满累积。', {
      'economy.realWages': 0.5,
      'economy.inflation': 0.03,
      'society.strikes': 1,
    }),
  ],
  ev_rand_press_exposure: [
    c('budget_oversight', '设立议会军事预算监督委员会', '军费进入议会监督。', '文官控制强化，军方抵触。', {
      'institutions.parliamentAuthority': 3,
      'institutions.militarySubordination': 2,
      'society.mediaFreedom': 2,
    }),
  ],
};
