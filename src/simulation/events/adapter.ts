import type { GameState } from '../types';
import type { HistoricalEvent, EventChoiceEffect } from '../../data/types';
import { personMap } from '../../data/people';
import { governments } from '../../data/governments';
import { anchorWeight } from '../elections/run';

/**
 * 事件状态适配器（WMR-029）
 *
 * 事件数据是史实剧本，文本里写死了“库诺政府”“总统艾伯特”“国会”等。
 * 玩家改变政权/总理后，这些文本会与实际状态不符。
 * 本适配器在运行时按当前政权、国家元首、总理与政府名称改写叙述与选项，
 * 并在玩家显著偏离史实后，避免选项安装与当前政局不符的史实内阁。
 */

export interface AdaptedChoiceText {
  id: string;
  label: string;
  short_term: string;
  long_term: string;
  /** 原始变量效果，供弹窗展示 */
  vars?: Record<string, number>;
}

export interface AdaptedEventText {
  title: string;
  background: string;
  choices: AdaptedChoiceText[];
  participants: string[];
  contextual: boolean;
}

interface Terms {
  president: string;
  parliament: string;
  chancellor: string;
}

function termsFor(state: GameState): Terms {
  const regime = String(state.flags.regime ?? 'republic');
  if (regime === 'constitutional_monarchy') {
    return { president: '皇帝', parliament: '帝国议会', chancellor: '帝国总理' };
  }
  if (regime === 'council_republic') {
    return { president: '苏维埃执行委员会主席', parliament: '工兵代表会', chancellor: '人民委员会主席' };
  }
  if (regime === 'authoritarian') {
    return { president: '元首', parliament: '国会', chancellor: '总理' };
  }
  return { president: '总统', parliament: '国会', chancellor: '总理' };
}

/** 历史总理姓氏（用于把“库诺政府”“施特雷泽曼内阁”改写为当前政府） */
const HISTORICAL_SURNAMES: string[] = Array.from(
  new Set(
    governments
      .map((g) => personMap.get(g.chancellor_id)?.name_zh ?? '')
      .filter(Boolean)
      .map((n) => n.split('·').pop() ?? n)
      .filter((s) => s.length >= 2)
  )
);

/** 历史国家元首姓名（用于把“总统艾伯特”改写为当前元首） */
const HISTORICAL_HEADS = ['艾伯特', '兴登堡', '希特勒'];

function replaceAll(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

function adaptText(state: GameState, text: string): string {
  const terms = termsFor(state);
  let out = text;

  const currentGov = state.government.name_zh;
  const currentChancellor = personMap.get(state.government.chancellorId)?.name_zh ?? '';
  const currentHead =
    personMap.get(String(state.flags.headOfStateId ?? state.presidentId))?.name_zh ?? '';

  // 1) 历史政府/内阁名称 → 当前政府（避免“库诺政府”出现在巴登内阁时期）
  for (const surname of HISTORICAL_SURNAMES) {
    if (currentChancellor.includes(surname)) continue;
    out = replaceAll(out, `${surname}政府`, currentGov);
    out = replaceAll(out, `${surname}内阁`, currentGov);
    out = replaceAll(out, `要求${surname}辞职`, '要求现政府辞职');
    out = replaceAll(out, `${surname}组建`, '现政府组建');
    out = replaceAll(out, `${surname}出任总理`, `${currentChancellor || '现总理'}出任总理`);
  }

  // 2) “总统X” → 当前国家元首（必须在“总统→皇帝”之前处理）
  for (const name of HISTORICAL_HEADS) {
    if (currentHead.includes(name)) continue;
    out = replaceAll(out, `总统${name}`, `${terms.president}${currentHead}`);
    out = replaceAll(out, `${name}总统`, `${currentHead}${terms.president}`);
  }

  // 3) 角色术语按政权改写（避免“副总理/帝国总理”被二次替换）
  if (terms.president !== '总统') out = replaceAll(out, '总统', terms.president);
  if (terms.parliament !== '国会') out = replaceAll(out, '国会', terms.parliament);
  if (terms.chancellor !== '总理') {
    out = out.replace(/(?<!副|帝国|人民委员会)总理/g, terms.chancellor);
  }

  return out;
}

export function currentGovernmentContext(state: GameState, event: HistoricalEvent): boolean {
  const replay = state.meta.mode === 'historical' && state.meta.divergence === 0 && !state.flags.playerGovernment && state.government.isHistorical;
  return !replay && (event.category === 'government_crisis' || ['ev_austerity_debate','ev_reichstag_rejects_budget'].includes(event.id));
}

export function adaptEventText(state: GameState, event: HistoricalEvent): AdaptedEventText {
  const contextual = currentGovernmentContext(state,event);
  const leader = personMap.get(state.government.chancellorId)?.name_zh ?? '现任政府首脑';
  const governText = (text: string) => {
    let raw = text;
    if (contextual) for (const g of governments) {
      const name = personMap.get(g.chancellor_id)?.name_zh;
      if (name && name !== leader) raw = replaceAll(raw,name,leader);
    }
    let out = adaptText(state,raw);
    if (contextual) for (const surname of [...HISTORICAL_SURNAMES].sort((a,b)=>b.length-a.length)) {
      if (!leader.includes(surname)) out = replaceAll(out,surname,leader);
    }
    return out;
  };
  const election = event.id.startsWith('ev_election_') ? state.elections.filter(e => e.date.slice(0,7) === state.date.slice(0,7)).slice(-1)[0] : undefined;
  const electionSummary = election ? '本局选举：' + election.results.slice(0,4).map(r => (r.partyId + ' ' + r.seats + '席')).join('、') + '。议会总席位' + election.totalSeats + '，过半门槛' + (Math.floor(election.totalSeats/2)+1) + '。按实际席位与联盟协商，当前政府为' + state.government.name_zh + '，首脑为' + leader + '。' : '';
  const military = event.id === 'ev_ebert_groener' && state.flags.regime !== 'republic';
  return {
    title: military ? '政府与军方的权力协商' : contextual ? '现政府的信任与组阁危机' : adaptText(state,event.title),
    background: election ? electionSummary : military ? '当前政府' + state.government.name_zh + '需要与军官团确定武力指挥权、秩序恢复及文官监督的边界。' : contextual ?
      '当前政府为' + state.government.name_zh + '，首脑为' + leader + '。执政力量与外部支持必须决定政策、信任及组阁安排。' + String(state.flags.cabinetReviewReason ?? '') + '此卡根据本局实际政府推演，原历史内阁仅作为档案对照。' : adaptText(state,event.background),
    choices: event.choices.map(c => ({ id:c.id,label:governText(c.label),short_term:election ? electionSummary : governText(c.short_term),long_term:governText(c.long_term),vars:c.effects.vars })),
    participants: contextual || military || election ? Array.from(new Set([state.government.chancellorId, String(state.flags.headOfStateId ?? state.presidentId)])) : event.participants,
    contextual: contextual || !!(election && !election.isHistorical),
  };
}

export function adaptChoiceEffects(state: GameState, effects: EventChoiceEffect, event?: HistoricalEvent): EventChoiceEffect {
  const replay = state.meta.mode === 'historical' && state.meta.divergence === 0 && !state.flags.playerGovernment && state.government.isHistorical;
  if (replay || !effects.structure) return effects;
  const structure = { ...effects.structure };
  const generic = event && currentGovernmentContext(state,event);
  if (generic) {
    delete structure.chancellorId;
    delete structure.governmentName;
  }
  if (structure.installGovernmentId) {
    delete structure.installGovernmentId;
    return { ...effects, structure, action: { type:'resign_chancellor' } };
  }
  return { ...effects,structure };
}
