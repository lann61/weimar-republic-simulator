import type { HistoricalEvent, EventChoice, EventChoiceEffect } from '../types';

/** 每个选择保留结果标记；延迟量表达原决策的落实，不是新的历史事实。 */
export function withConsequences(event: HistoricalEvent): HistoricalEvent {
  return { ...event, choices: event.choices.map(choice => {
    const effects: EventChoiceEffect = { ...choice.effects,
      flags: { ...choice.effects.flags, [`choice_${event.id}_${choice.id}`]: 1 } };
    const delayed = Object.fromEntries(Object.entries(effects.vars ?? {})
      .filter(([k]) => !k.startsWith('parties.') && !['economy.deficit', 'economy.priceLevel', 'society.violenceDeaths'].includes(k))
      .slice(0, 4).map(([k,v]) => [k, Math.max(-1.5, Math.min(1.5, v * 0.12))]));
    effects.delayed = [...(effects.delayed ?? []), { months: 3, vars: delayed,
      note: `「${event.title}」中选择「${choice.label}」的后续落实：${choice.long_term}` }];
    const setFlag = (key: string, value: number | boolean | string) => { effects.flags![key] = value; };
    const id = event.id, c = choice.id;
    // 谈判许可与正式任命分开：1月20日的决定不得提前安装1月30日的政府。
    if (id === 'ev_elite_bargain' && c === 'allow_appointment') { delete effects.structure; delete effects.action; }
    if (id === 'ev_ebert_groener') setFlag('militaryBargain', c === 'cooperate' || choice === event.choices[0] ? 1 : 0);
    if (id === 'ev_treaty_decision') setFlag('treatyAccepted', c === event.historical_choice_id ? 1 : /accept|conditional/.test(c) ? 1 : 0);
    if (id === 'ev_ruhr_occupation') {
      setFlag('ruhr_occupation', 1); setFlag('passiveResistanceActive', c === 'passive_resistance' ? 1 : 0);
      if (/military|invasion/.test(c)) setFlag('militaryRuhr', 1);
      if (c === 'negotiate_payment') effects.delayed!.push({ months: 6, flags: { ruhr_occupation: 0 }, vars: { 'diplomacy.reparationsPressure': -4, 'economy.output': 2 }, note: '部分交付与谈判安排逐步落实，鲁尔停产冲击解除，但赔款义务继续存在。' });
    }
    if (id === 'ev_end_passive_resistance' && c !== 'continue_resistance') {
      setFlag('passiveResistanceActive', 0);
      effects.delayed!.push({ months: c === 'phased_withdrawal' ? 3 : 1, flags: { ruhr_occupation: 0 }, note: '复工安排生效：被动抵抗的生产冲击解除。' });
    }
    if (id === 'ev_hyperinflation' && c === 'stabilize_currency') setFlag('currencyStabilized', 1);
    if (id === 'ev_rentenmark') setFlag('currencyStabilized', c === 'orthodox_stabilization' ? 1 : 0);
    if (id === 'ev_reichstag_fire') setFlag('civilRightsSuspended', c === 'emergency_decree' ? 1 : 0);
    if (id === 'ev_kpd_mandates') setFlag('kpdMandatesRemoved', c === 'annul' ? 1 : 0);
    if (id === 'ev_unemployment_fund_gap') setFlag('parliamentaryBudgetDeal', c === 'cut_or_break' ? 0 : 1);
    if (id === 'ev_mueller_fall') {
      setFlag('muellerSuccessionApproved', c === 'accept_resignation' ? 1 : 0);
      if (c !== 'accept_resignation') setFlag('cabinetReviewDue', 1);
    }
    if (id === 'ev_bruening_cabinet' && c === 'seek_tolerance') effects.structure = { governmentType: 'minority', supportParties: ['spd'], note: '政府改为接受国会容忍与监督，不再以总统内阁作为治理基础。' };
    if (id === 'ev_enabling_act_debate') setFlag('enablingActPassed', c === 'approve' || c === 'abstain' ? 1 : 0);
    if (id === 'ev_civil_service_purge') setFlag('judiciaryPurged', c === 'purge' ? 1 : 0);
    if (id === 'ev_union_dissolved') setFlag('unionsBanned', c === 'dissolve_unions' ? 1 : 0);
    if (id === 'ev_parties_banned') setFlag('onePartyState', c === 'one_party' ? 1 : 0);
    if (id === 'ev_hindenburg_death') setFlag('officesMerged', c === 'merge_offices' ? 1 : 0);
    if (id === 'ev_hindenburg_death' && c !== 'merge_offices') { setFlag('presidentialElectionDue', 1); setFlag('presidentVacant', true); }
    if (c === 'military_rule') setFlag('militaryCoup', 1);
    if (id === 'ev_army_oath') setFlag('personalArmyOath', c === 'personal_oath' ? 1 : 0);
    if (id === 'ev_hitler_appointed' && c === 'immediate_new_election') effects.action = { type: 'call_election', date: '1933-03-05' };
    if (!effects.action && /snap_national|early_election|new_elections|call_election/.test(c)) effects.action = { type: 'call_election', months: 2 };
    if (id === 'ev_reichstag_dissolved_1933' && c === 'delay_election') {
      setFlag('electionPostponedUntil', '1933-05-01');
      effects.action = { type: 'call_election', date: '1933-05-01' };
    }
    if (id === 'ev_council_congress' && c === 'dual_power') effects.delayed!.push({ months: 3,
      flags: { transitionReviewDue: 1 }, note: '双重权力过渡期届满：必须重新确定立法与行政权的关系。' });
    return { ...choice, effects };
  }) };
}

const reviewChoices: EventChoice[] = [
  { id: 'negotiate', label: '以公开谈判兑现承诺', short_term: '增加协商与行政成本。', long_term: '制度信任与合作能力逐步积累。', effects: { vars: { 'institutions.partyCompromise': 4, 'society.trust': 3, 'economy.spending': 0.4 }, flags: { transitionReviewDue: 0 } } },
  { id: 'centralize', label: '集中行政权以加快落实', short_term: '执行加快，反对者承受压力。', long_term: '监督权受到削弱，社会冲突可能转向制度外。', effects: { vars: { 'institutions.presidentialPowerUse': 5, 'institutions.parliamentAuthority': -4, 'society.polarization': 3 }, flags: { transitionReviewDue: 0 } } },
  { id: 'local', label: '交由地方与社会组织试行', short_term: '各地落实速度不同。', long_term: '地方自治与参与扩大，但协调难度增加。', effects: { vars: { 'institutions.federalCohesion': 3, 'society.socialTrust': 2, 'institutions.governmentDurability': -2 }, flags: { transitionReviewDue: 0 } } },
];
export const consequenceEvents: HistoricalEvent[] = [
  { id: 'ev_presidential_succession', date: '1934-08-02', title: '总统继任选举与议会确认', category: 'election', phase: 6, importance: 'critical',
    background: '国家元首去世后，此前选择保留分立职权并启动继任程序。各政治力量提出人选，必须明确新元首及其对政府的监督关系。这是本局推演的继任安排。', participants: ['person_marx_wilhelm','person_wels','person_luther'],
    trigger: { type: 'condition', probability: 1, conditions: [{ path: 'flags.presidentialElectionDue', op: '==', value: 1 }] },
    choices: [
      { id: 'marx', label: '以中间党妥协确认威廉·马克思', short_term: '确立新的国家元首。', long_term: '总统与总理职权继续分立，后续监督取决于实际制度。', effects: { flags: { presidentialElectionDue: 0 }, structure: { presidentId: 'person_marx_wilhelm', headOfStateId: 'person_marx_wilhelm', headOfStateTitle: '帝国总统' }, vars: { 'institutions.parliamentAuthority': 3 } } },
      { id: 'wels', label: '组织共和派联合支持奥托·韦尔斯', short_term: '共和派承担恢复监督的责任。', long_term: '宪政派获得元首职位，但与现政府的冲突上升。', effects: { flags: { presidentialElectionDue: 0 }, structure: { presidentId: 'person_wels', headOfStateId: 'person_wels', headOfStateTitle: '帝国总统' }, vars: { 'institutions.constitutionalCommitment': 5, 'society.polarization': 3 } } },
      { id: 'goerdeler', label: '以保守文官人选汉斯·路德争取跨派支持', short_term: '文官派系获得协调职位。', long_term: '个人权力合并受到限制，但恢复公民权利仍需额外改革。', effects: { flags: { presidentialElectionDue: 0 }, structure: { presidentId: 'person_luther', headOfStateId: 'person_luther', headOfStateTitle: '帝国总统' }, vars: { 'institutions.governmentDurability': 3, 'institutions.presidentialPowerUse': 2 } } },
    ], historical_outcome: '这是玩家拒绝合并职权后产生的反事实继任事件，并非史实选举。', allows_counterfactual: true, source_ids: ['source_project_model'], data_quality: 'simulation_derived' },
  { id: 'ev_transition_review', date: '1919-01-01', title: '过渡安排届满：重新分配权力', category: 'constitution', phase: 1, importance: 'critical',
    background: '此前决定保留双重权力并设立三个月过渡期。期限已经届满，政府、地方和社会代表必须决定此后的权力关系。', participants: [],
    trigger: { type: 'condition', probability: 1, conditions: [{ path: 'flags.transitionReviewDue', op: '==', value: 1 }] },
    choices: reviewChoices, historical_outcome: '这是由本局选择产生的模型事件，没有固定史实结果。', allows_counterfactual: true,
    source_ids: ['source_project_model'], data_quality: 'simulation_derived' },
  { id: 'ev_alternative_cabinet', date: '1919-01-01', title: '政府信任危机与新的执政安排', category: 'government_crisis', phase: 2, importance: 'critical',
    background: '政府缺乏稳定的政治支持。此前的联盟与政策承诺限制了新的合作空间，需要决定继续协商、重组政府还是重新争取选民授权。', participants: [],
    trigger: { type: 'condition', probability: 1, conditions: [{ path: 'flags.cabinetReviewDue', op: '==', value: 1 }] },
    choices: [
      { ...reviewChoices[0], effects: { ...reviewChoices[0].effects, flags: { cabinetReviewDue: 0, cabinetNegotiated: 1 } } },
      { ...reviewChoices[1], effects: { ...reviewChoices[1].effects, flags: { cabinetReviewDue: 0 }, action: { type: 'resign_chancellor' } } },
      { id: 'renew_mandate', label: '解散议会，重新争取授权', short_term: '两个月内举行选举。', long_term: '选民将根据此前政策与危机表现重新决定力量对比。', effects: { vars: { 'society.polarization': 2 }, flags: { cabinetReviewDue: 0 }, action: { type: 'dissolve_reichstag' } } },
    ], historical_outcome: '这是当前政府支持不足所产生的模型事件，结果由玩家和政治模型共同决定。', allows_counterfactual: true,
    source_ids: ['source_project_model'], data_quality: 'simulation_derived' },
];
