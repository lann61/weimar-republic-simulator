import type { EventChoice } from '../types';
import { c } from './helpers';

/** 1933—1934 年事件与条件事件补充的第三个选项 */
export const extraChoicesEnd: Record<string, EventChoice[]> = {
  // ── 1933—1934 ──────────────────────────────────────────
  ev_hitler_appointed: [
    c('cabinet_veto', '保守派要求在授权法案中加入否决权条款', '内阁形式上受约束。', '条款在紧急状态下形同虚设，但为日后追责留下文本依据。', {
      'institutions.presidentialPowerUse': 2,
      'institutions.democraticResilience': -2,
      'institutions.parliamentAuthority': 1,
    }),
    c('immediate_new_election', '要求立即举行新选举以检验授权', '政治不确定性上升。', '选举在暴力环境中举行，结果未必削弱纳粹，但保留了程序形式。', {
      'institutions.parliamentAuthority': 2,
      'society.violence': 3,
      'institutions.democraticResilience': -1,
    }),
  ],
  ev_reichstag_dissolved_1933: [
    c('delay_election', '推迟选举以巩固行政控制', '选举延后。', '短期控制力增强，但选举合法性进一步受损。', {
      'institutions.parliamentAuthority': -4,
      'society.violence': 2,
      'institutions.democraticResilience': -3,
    }),
    c('restrict_sa', '同时限制冲锋队的竞选活动', '街头压力部分下降。', '选举环境略有好转，但与执政伙伴的冲突加剧。', {
      'society.violence': -4,
      'institutions.policeNeutrality': 2,
      'society.polarization': 2,
    }),
  ],
  ev_reichstag_fire: [
    c('emergency_with_rights', '宣布全国紧急状态但保留基本权利', '紧急状态与权利保障并存。', '行政权扩张，但言论与集会自由未被全面中止，抵抗空间仍在。', {
      'society.mediaFreedom': -8,
      'institutions.emergencyDependence': 6,
      'institutions.democraticResilience': -4,
      'institutions.presidentialPowerUse': 4,
    }),
  ],
  ev_election_1933: [
    c('document_suppression', '系统记录压制事实并公布', '国际舆论关注。', '选举结果不变，但“不自由选举”的证据被完整保存。', {
      'society.mediaFreedom': 2,
      'institutions.democraticResilience': 2,
      'diplomacy.prestige': -1,
    }),
    c('opposition_boycott', '反对派抵制选举', '投票率下降。', '抵制削弱了议会的代表性，也削弱了反对派自身的制度阵地。', {
      'institutions.parliamentAuthority': -4,
      'society.polarization': 3,
    }),
  ],
  ev_unfree_election: [
    c('international_complaint', '向国联与人权组织提交报告', '国际社会收到申诉。', '外交压力有限，但记录进入国际档案。', {
      'diplomacy.prestige': -2,
      'society.mediaFreedom': 1,
      'institutions.democraticResilience': 1,
    }),
  ],
  ev_kpd_mandates: [
    c('speaker_refusal', '由国会议长拒绝执行取消资格', '议长与政府正面冲突。', '议会主权被最后一次宣示，但代价是议长职位与人身安全。', {
      'institutions.parliamentAuthority': 5,
      'society.polarization': 3,
      'institutions.democraticResilience': 3,
    }),
  ],
  ev_laender_gleichschaltung: [
    c('laender_petition', '由邦总理联合向总统请愿', '邦级抵抗公开化。', '联邦原则被宣示，但总统已无意制衡。', {
      'institutions.federalCohesion': 3,
      'institutions.presidentialPowerUse': -2,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_civil_service_purge: [
    c('judges_protest', '由法官协会公开抗议', '司法界发声。', '抗议被记录，但无法阻止清洗。', {
      'institutions.judicialIndependence': 3,
      'society.trust': 1,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_union_dissolved: [
    c('underground_mutual_aid', '工会转入地下并组织互助基金', '组织形态改变但网络延续。', '抵抗得以保存，但工人运动失去公开代表渠道。', {
      'society.strikes': 3,
      'society.socialTrust': -2,
      'society.violence': 1,
      'institutions.democraticResilience': 2,
    }),
  ],
  ev_parties_banned: [
    c('formal_multiparty', '保留形式上的多党选举', '选举继续举行但无竞争性。', '形式多元为日后恢复保留制度接口，独裁实质不变。', {
      'institutions.parliamentAuthority': 2,
      'institutions.democraticResilience': -2,
      'society.mediaFreedom': -3,
    }),
  ],
  ev_hindenburg_death: [
    c('parliament_elects', '由国会选举新总统', '总统职位回到议会程序。', '若能维持，行政权的个人化将被阻断。', {
      'institutions.parliamentAuthority': 4,
      'institutions.presidentialPowerUse': -3,
      'institutions.constitutionalCommitment': 3,
    }),
  ],
  ev_army_oath: [
    c('oath_with_guardianship', '宣誓效忠宪法，并由国防军自设宪法监护条款', '军方要求对违宪命令的审查权。', '军队获得制度性仲裁角色，短期制约独裁，长期则使军方成为政治裁判者。', {
      'institutions.militarySubordination': 2,
      'institutions.democraticResilience': 2,
      'institutions.presidentialPowerUse': -3,
      'institutions.constitutionalCommitment': 1,
    }),
  ],

  // ── 条件与随机事件 ──────────────────────────────────────
  ev_rand_bank_run: [
    c('emergency_discount', '由帝国银行提供紧急贴现', '挤兑缓解。', '流动性恢复，但货币扩张埋下通胀隐患。', {
      'economy.bankLiquidity': 3,
      'economy.inflation': 0.5,
      'society.trust': 1,
    }),
  ],
  ev_rand_factory_closure: [
    c('short_time_work', '转为短时工作制', '裁员减少。', '失业数字下降，但收入减少、财政补贴上升。', {
      'economy.unemployment': -0.2,
      'economy.realWages': -0.5,
      'economy.spending': 0.2,
    }),
  ],
  ev_rand_party_split: [
    c('leadership_arbitration', '由党主席团仲裁', '分裂被暂时压制。', '党内矛盾转入地下，纪律松弛。', {
      'institutions.partyCompromise': 2,
      'institutions.governmentDurability': 1,
    }),
  ],
  ev_rand_local_election: [
    c('snap_national', '提前举行全国选举', '全国选战提前。', '不确定性上升，反体制政党可能获益。', {
      'institutions.parliamentAuthority': -2,
      'society.polarization': 2,
    }),
  ],
  ev_rand_political_murder: [
    c('federal_prosecutor', '由联邦检察官接管案件', '调查脱离地方政治。', '追责可能性提高，但地方与中央的司法摩擦加剧。', {
      'institutions.judicialIndependence': 4,
      'institutions.policeNeutrality': 2,
      'institutions.federalCohesion': -1,
    }),
  ],
  ev_rand_leader_health: [
    c('designate_successor', '提前指定继任者', '外交路线名义上延续。', '职位空缺风险降低，但继任者缺乏同等威望。', {
      'institutions.governmentDurability': 2,
      'diplomacy.prestige': -1,
      'institutions.partyCompromise': 1,
    }),
    c('collective_leadership', '由内阁集体领导外交', '决策分散化。', '避免个人依赖，但谈判一致性下降。', {
      'institutions.partyCompromise': 2,
      'diplomacy.prestige': -2,
      'institutions.governmentDurability': 1,
    }),
  ],
  ev_rand_food_prices: [
    c('import_subsidy', '增加进口以平抑价格', '食品价格回落。', '城市压力缓解，但农业利益与外汇储备受损。', {
      'economy.foodPrices': -2,
      'economy.exports': -1,
      'society.satisfaction': 2,
    }),
  ],
  ev_rand_housing: [
    c('cooperative_build', '由住房合作社建设', '住房供给增加。', '成本较低，但覆盖速度慢于商业开发。', {
      'society.housing': 2,
      'economy.spending': 0.3,
      'society.satisfaction': 1,
    }),
  ],
  ev_rand_student_protest: [
    c('expand_scholarships', '扩大大学助学金', '部分学生获得资助。', '青年不满缓解，财政支出上升。', {
      'society.youthUnemployment': -1,
      'economy.spending': 0.3,
      'society.optimism': 1,
    }),
  ],
};
