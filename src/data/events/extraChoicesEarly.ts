import type { EventChoice } from '../types';
import { c } from './helpers';

/** 1918—1922 年事件补充的第三个选项（保证每个事件至少 3 个可选方案） */
export const extraChoicesEarly: Record<string, EventChoice[]> = {
  ev_kiel_mutiny: [
    c('negotiate_reform', '派特使承诺军纪与选举权改革，争取时间', '起义暂缓，水兵接受谈判。', '革命被拖延但未被阻止，政府获得有限的回旋空间。', {
      'society.violence': -2,
      'institutions.militarySubordination': 2,
      'society.satisfaction': 1,
    }),
  ],
  ev_november_revolution: [
    c('constitutional_monarchy', '由皇帝任命议会制政府，保留君主作为象征元首', '革命派分裂，君主制以议会形式延续。', '民主化可能更平缓，但共和国的合法性从未被彻底确立。', {
      'institutions.constitutionalCommitment': -5,
      'institutions.parliamentAuthority': 3,
      'society.polarization': 4,
    }, { structure: {
      regime: 'constitutional_monarchy',
      headOfStateId: 'person_wilhelm_ii',
      headOfStateTitle: '德意志皇帝',
      headOfStateSince: '1888-06-15',
      governmentType: 'constitutional_monarchy',
      governmentName: '威廉二世任命的帝国议会政府',
      note: '政治结构改变：保留君主制，威廉二世继续作为立宪君主任国家元首，由皇帝任命议会制政府。',
    } }),
  ],
  ev_ebert_groener: [
    c('citizens_militia', '建立由工会与军官团共同监督的国民自卫队', '军队与工人组织形成双重武力。', '文官控制略有改善，但武装力量碎片化，暴力风险上升。', {
      'society.violence': 3,
      'institutions.militarySubordination': 3,
      'institutions.democraticResilience': 3,
    }),
  ],
  ev_council_congress: [
    c('dual_power', '代表会与国民议会并立，设三个月过渡期', '形成双重权力结构。', '制度冲突被推迟而非解决，立法效率下降。', {
      'institutions.parliamentAuthority': -4,
      'society.polarization': 5,
      'institutions.constitutionalCommitment': -2,
    }),
  ],
  ev_christmas_battle: [
    c('union_mediation', '由工会与士兵代表会调解，撤出宫殿但保留武装', '对峙以妥协收场。', '避免了流血，但政府未能确立对首都武力的垄断。', {
      'society.violence': -2,
      'institutions.militarySubordination': -3,
      'society.satisfaction': 2,
    }),
  ],
  ev_spartacus_uprising: [
    c('joint_appeal', '由SPD与USPD联合呼吁停火，承诺改组警察', '部分起义者撤离。', '左翼分裂被暂时掩盖，但承诺难以兑现。', {
      'society.violence': -3,
      'society.polarization': -3,
      'institutions.militarySubordination': -2,
    }),
  ],
  ev_luxemburg_murder: [
    c('court_inquiry', '交由帝国法院独立调查并公开审理', '调查启动，军方不满。', '司法公信力部分恢复，但军队与政府的信任受损。', {
      'institutions.judicialIndependence': 4,
      'society.violence': 1,
      'institutions.militarySubordination': -1,
    }),
  ],
  ev_election_1919: [
    c('delay_election', '推迟选举，先完成宪法草案', '制宪优先于选举。', '宪法可能更完整，但代表会的权力真空延长，街头政治主导议程。', {
      'institutions.parliamentAuthority': -6,
      'institutions.constitutionalCommitment': -4,
      'society.polarization': 4,
    }),
    c('council_first', '由工兵代表会先行立法三个月', '革命机构暂时掌握立法权。', '议会民主的起点被推迟，左右两翼的合法性之争加剧。', {
      'institutions.parliamentAuthority': -8,
      'society.polarization': 6,
      'institutions.constitutionalCommitment': -5,
    }),
  ],
  ev_women_suffrage: [
    c('vote_only', '先赋予投票权，暂缓被选举权', '女性可以投票但不能竞选。', '形式平等被推迟，妇女组织持续施压。', {
      'society.womenParticipation': 5,
      'society.socialTrust': -1,
      'institutions.constitutionalCommitment': 1,
    }),
  ],
  ev_weimar_assembly: [
    c('berlin_session', '在柏林召开，直面革命压力', '会议在动荡中进行。', '制宪与革命短兵相接，妥协空间更小但合法性更直接。', {
      'society.violence': 4,
      'institutions.parliamentAuthority': 3,
      'society.polarization': 3,
    }),
    c('frankfurt_session', '改在法兰克福，象征自由主义传统', '会议获得象征性权威。', '与革命中心保持距离，但也与街头现实脱节。', {
      'institutions.constitutionalCommitment': 3,
      'society.polarization': -1,
      'institutions.parliamentAuthority': 1,
    }),
  ],
  ev_march_1919_berlin: [
    c('council_mediation', '由市议会与工会组成调解委员会', '罢工以谈判收场。', '暴力规模缩小，但政府被指对革命让步。', {
      'society.violence': -3,
      'society.polarization': -2,
      'institutions.parliamentAuthority': 2,
    }),
  ],
  ev_bavarian_soviet: [
    c('bavarian_self_restore', '由巴伐利亚邦议会自行恢复秩序，中央不介入', '邦政府夺回控制权。', '联邦原则得以维持，但慕尼黑右翼网络获得更大空间。', {
      'institutions.federalCohesion': 4,
      'society.violence': -2,
      'institutions.parliamentAuthority': 1,
    }),
  ],
  ev_scheidemann_resign: [
    c('reshuffle_keep', '内阁改组但保留总理', '谢德曼留任，部分部长更换。', '政府避免更迭，但条约问题仍未解决。', {
      'institutions.governmentDurability': 2,
      'society.satisfaction': -1,
      'institutions.presidentialPowerUse': -1,
    }),
    c('referendum_treaty', '将条约交由全民公投决定', '条约成为全民议题。', '民主参与扩大，但外交决策被情绪化动员主导。', {
      'society.polarization': 5,
      'institutions.constitutionalCommitment': -3,
      'society.satisfaction': 2,
    }),
  ],
  ev_versailles_signed: [
    c('sign_with_reservations', '签署但附保留声明', '条约生效，德国保留法律异议。', '为日后修订留下依据，但协约国视之为不诚意。', {
      'diplomacy.treatyConstraint': 4,
      'diplomacy.prestige': -2,
      'institutions.governmentLegitimacy': 1,
    }),
    c('delay_signature', '拖延签署以争取最后修改', '协约国施压升级。', '外交孤立加深，占领风险上升。', {
      'diplomacy.isolation': 5,
      'diplomacy.reparationsPressure': 4,
      'society.satisfaction': 1,
    }),
  ],
  ev_weimar_constitution: [
    c('amend_article48', '通过前削弱第48条', '紧急权力受到限制。', '总统内阁的法律通道被收窄，但危机治理也更困难。', {
      'institutions.presidentialPowerUse': -8,
      'institutions.constitutionalCommitment': 6,
      'institutions.militarySubordination': -2,
      'institutions.democraticResilience': 5,
    }),
    c('strengthen_president', '强化总统作为“稳定器”', '总统获得更大仲裁权。', '短期稳定，长期为行政权凌驾议会埋下伏笔。', {
      'institutions.presidentialPowerUse': 8,
      'institutions.parliamentAuthority': -4,
      'institutions.governmentDurability': 3,
    }),
  ],

  // ── 1920—1922 ──────────────────────────────────────────
  ev_erzberger_reform: [
    c('phased_centralization', '与各邦协商、分阶段中央化', '改革放慢但阻力减小。', '财政能力提升有限，联邦冲突缓和。', {
      'economy.taxRevenue': 1,
      'institutions.federalCohesion': 2,
      'institutions.parliamentAuthority': 1,
    }),
  ],
  ev_veterans_reintegration: [
    c('public_works', '以公共工程吸纳退伍军人', '部分退伍者获得工作。', '财政支出上升，但准军事组织的招募基础被削弱。', {
      'economy.spending': 0.8,
      'economy.unemployment': -0.3,
      'society.violence': -1,
    }),
  ],
  ev_kapp_putsch: [
    c('relocate_stuttgart', '政府迁往斯图加特，号召公务员抵制', '政变者无法接管行政机器。', '政变迅速失败，但国家机器出现短暂真空。', {
      'institutions.parliamentAuthority': 3,
      'society.violence': 2,
      'institutions.militarySubordination': -2,
    }),
  ],
  ev_ruhr_red_army: [
    c('union_disarm', '由工会与地方当局谈判解除武装', '工人武装分批交出武器。', '避免了军事镇压，但右翼指责政府纵容革命。', {
      'society.violence': -2,
      'society.polarization': -2,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_election_1920: [
    c('postpone_election', '推迟选举以先稳定局势', '选举延期数月。', '政府获得喘息，但议会代表性受损。', {
      'institutions.parliamentAuthority': -4,
      'society.polarization': 3,
      'institutions.governmentDurability': 2,
    }),
    c('change_electoral_system', '改为多数制选举', '选区逻辑改变。', '大党受益、小党被挤出，议会碎片化缓解但代表性下降。', {
      'institutions.parliamentAuthority': -2,
      'institutions.partyCompromise': -4,
      'institutions.governmentDurability': 4,
    }),
  ],
  ev_labor_employer: [
    c('state_arbitration', '建立由国家主持的工资仲裁委员会', '工资争议进入制度化轨道。', '罢工减少，但国家承担了工资冲突的政治责任。', {
      'society.strikes': -1.5,
      'economy.realWages': 0.5,
      'economy.inflation': 0.05,
    }),
  ],
  ev_upper_silesia: [
    c('league_arbitration', '请求国联仲裁并接受分阶段移交', '移交过程延长。', '国际信誉提升，但民族主义阵营不满。', {
      'diplomacy.prestige': 3,
      'diplomacy.borderPressure': 2,
      'society.satisfaction': -1,
    }),
  ],
  ev_london_ultimatum: [
    c('accept_with_loan', '接受赔款但要求国际贷款作为支付条件', '谈判延长，支付重启。', '财政压力部分转嫁国际资本市场，但对外依赖加深。', {
      'diplomacy.reparationsPressure': 6,
      'diplomacy.capitalConfidence': 2,
      'society.satisfaction': -2,
    }),
  ],
  ev_wirth_cabinet: [
    c('zentrum_only', '组建纯中央党少数政府', '政府更窄但更统一。', '决策效率提高，议会基础更薄弱。', {
      'institutions.parliamentAuthority': -2,
      'institutions.governmentDurability': -2,
      'institutions.partyCompromise': 1,
    }),
    c('grand_coalition_1921', '组建包括DVP的大联合', '政府获得更宽基础。', '联盟内部张力上升，但议会算术更稳。', {
      'institutions.partyCompromise': 3,
      'institutions.governmentDurability': 2,
      'institutions.parliamentAuthority': 2,
    }),
  ],
  ev_bavaria_conservative: [
    c('fiscal_bargain', '以财政转移换取巴伐利亚约束右翼组织', '慕尼黑获得补贴。', '联邦关系缓和，但中央对右翼组织的控制仍有限。', {
      'institutions.federalCohesion': 2,
      'economy.spending': 0.3,
      'society.violence': -1,
    }),
  ],
  ev_rapallo: [
    c('economic_only', '仅签署经济与技术协定，暂不建交', '合作有限但风险较低。', '获得部分东方杠杆，同时减少西方的猜疑。', {
      'diplomacy.relationUSSR': 5,
      'diplomacy.isolation': -3,
      'diplomacy.relationFrance': -1,
    }),
  ],
  ev_rathenau_assassination: [
    c('national_mourning', '宣布全国哀悼日并加速审判', '社会短暂凝聚。', '象征性团结，但制度性追责仍不彻底。', {
      'institutions.judicialIndependence': 2,
      'society.violence': 1,
      'society.satisfaction': 1,
    }),
  ],
  ev_republic_protection_law: [
    c('laender_execute', '由各邦自行执行，中央只设监督', '执行标准不一。', '联邦摩擦减少，但法律的实际效力被削弱。', {
      'institutions.federalCohesion': 3,
      'institutions.democraticResilience': -2,
      'institutions.judicialIndependence': -1,
    }),
  ],
  ev_right_terror_impunity: [
    c('special_prosecutor', '设立特别检察官办公室', '部分旧案重启。', '司法追责的制度化程度提高，但法官群体抵触。', {
      'institutions.judicialIndependence': 5,
      'institutions.policeNeutrality': 2,
      'institutions.democraticResilience': 3,
    }),
  ],
};
