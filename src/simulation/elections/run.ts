import { elections as historicalElections } from '../../data/elections';
import { governments } from '../../data/governments';
import { partyMap } from '../../data/parties';
import { personMap } from '../../data/people';
import type { PartyId } from '../../data/types';
import type { ElectionRecord, GameState, GovernmentState } from '../types';
import type { RNG } from '../engine/random';
import { clamp } from '../engine/random';
import { computeVotes } from './voting';
import { allocateSeats, majorityThreshold } from './seats';
import { formGovernment, buildSimulatedCabinet } from './coalition';
import { addMonths, formatDateFull } from '../engine/date';
import { voterGroups } from '../../data/voterGroups';

/** 选举 → 史实内阁（用于史实锚定较强时安装真实内阁） */
const HISTORICAL_GOV_AFTER_ELECTION: Record<string, string> = {
  election_1919_01: 'gov_scheidemann',
  election_1920_06: 'gov_fehrenbach',
  election_1924_05: 'gov_marx2',
  election_1924_12: 'gov_luther1',
  election_1928_05: 'gov_mueller2',
  election_1930_09: 'gov_bruening1',
  election_1932_07: 'gov_papen',
  election_1932_11: 'gov_schleicher',
  election_1933_03: 'gov_hitler',
};

/** 史实锚定强度：玩家偏离越大，锚定越弱（方案 §12.5 固定史实模式 / 反事实模式分离） */
export function anchorWeight(state: GameState): number {
  if (state.meta.mode === 'free' || state.meta.mode === 'challenge') return 0;
  const base = state.meta.mode === 'historical' ? 0.92 : 0.85;
  return clamp(base - state.meta.divergence * 1.3, 0, base);
}

export interface ElectionRunOptions {
  date: string;
  type: 'reichstag' | 'national_assembly';
  label: string;
  historicalId?: string;
  fairness?: number;
  trigger: string;
}

export function runElection(state: GameState, rng: RNG, opts: ElectionRunOptions): ElectionRecord {
  const hist = opts.historicalId ? historicalElections.find((e) => e.id === opts.historicalId) : undefined;
  const fairness = opts.fairness ?? (state.meta.mode === 'historical' && state.meta.divergence === 0 ? hist?.fairness ?? 0.92 : state.flags.civilRightsSuspended ? 0.45 : state.flags.onePartyState ? 0.1 : 0.92);

  const comp = computeVotes(state, rng, { campaign: true, fairness });

  let shares: Record<PartyId, number> = { ...comp.shares };

  const w = hist ? anchorWeight(state) : 0;
  if (hist && w > 0.01) {
    const anchor: Record<PartyId, number> = {};
    for (const r of hist.results) anchor[r.party_id] = r.vote_share;
    const merged: Record<PartyId, number> = {};
    const keys = new Set([...Object.keys(shares), ...Object.keys(anchor)]);
    for (const k of keys) {
      const a = anchor[k] ?? 0;
      const m = shares[k] ?? 0;
      merged[k] = a * w + m * (1 - w);
    }
    const total = Object.values(merged).reduce((a, b) => a + b, 0) || 1;
    for (const k of Object.keys(merged)) merged[k] = (merged[k] / total) * 100;
    shares = merged;
  }

  // 软上限：魏玛政党体系高度碎片化，任何单一政党在自由选举中都不会
  // 一届之内跃升至绝对垄断（史料最高为 1933 年的 43.9%）。
  // 超过 55% 时向上一届得票收敛，避免模型在极端路径下产生不现实的压倒性多数。
  let guard = 0;
  while (guard < 6 && Math.max(...Object.values(shares)) > 55) {
    let hasPrev = false;
    for (const pid of Object.keys(shares)) {
      const prevShare = state.parties[pid]?.supportLastElection ?? 0;
      if (prevShare > 0) hasPrev = true;
      shares[pid] = shares[pid] * 0.62 + prevShare * 0.38;
    }
    const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
    for (const pid of Object.keys(shares)) shares[pid] = (shares[pid] / sum) * 100;
    if (!hasPrev) break;
    guard++;
  }

  const totalSeats = hist && w > 0.5 ? hist.total_seats : state.parliamentSeatsTotal || 491;

  // 被取缔的政党不参与选举：清零其得票并重新归一化。
  // 否则史实锚定会把该党的历史得票重新注入，使“取缔”选择形同虚设。
  let bannedZeroed = false;
  for (const pid of Object.keys(shares)) {
    if (state.parties[pid]?.banned) {
      if (shares[pid] !== 0) bannedZeroed = true;
      shares[pid] = 0;
    }
  }
  if (bannedZeroed) {
    const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
    for (const pid of Object.keys(shares)) shares[pid] = (shares[pid] / sum) * 100;
  }

  const allocation = allocateSeats(shares, totalSeats, rng, fairness);

  // 结构基础只向“史实得票结构”校准，绝不向模型自身输出校准：
  // 否则任何一次领先都会在下一次选举中被结构放大，形成不可逆的正反馈。
  // 玩家选择通过当期条件乘数（经济、暴力、执政绩效、危机动员）影响结果。
  if (hist) {
    const structural: Record<PartyId, number> = {};
    for (const r of hist.results) structural[r.party_id] = r.vote_share;
    recalibrateAffinities(state, structural);
  }

  // 历史基准（锚定极强）：直接采用史料的票数、得票率与席位，
  // 不用模型席位分配结果替代已知史料（WMR-005 / WMR-006 / WMR-025）。
  const useHistorical = !!(hist && state.meta.mode === 'historical' && state.meta.divergence === 0 && !Object.values(state.parties).some(p => p.banned));
  let recordResults: ElectionRecord['results'];
  let otherSeats: number | undefined;
  let otherVoteShare: number | undefined;

  if (useHistorical && hist) {
    for (const [pid, ps] of Object.entries(state.parties)) {
      ps.inGovernment = false;
      ps.supportsGovernment = false;
      const r = hist.results.find((x) => x.party_id === pid);
      if (r && !ps.banned) {
        ps.supportLastElection = r.vote_share;
        ps.votesLastElection = r.votes;
        ps.seatsLastElection = r.seats;
        ps.seats = r.seats;
        ps.support = r.vote_share;
      } else {
        ps.supportLastElection = 0;
        ps.votesLastElection = 0;
        ps.seatsLastElection = 0;
        ps.seats = 0;
        ps.support = 0;
      }
    }
    state.parliamentSeatsTotal = hist.total_seats;
    otherSeats = hist.other_seats;
    otherVoteShare = hist.other_vote_share;
    recordResults = hist.results
      .filter((r) => !state.parties[r.party_id]?.banned)
      .map((r) => ({
        partyId: r.party_id,
        share: r.vote_share,
        votes: r.votes,
        seats: r.seats,
        isSimulated: false,
      }));
  } else {
    // 写入政党状态（模型/混合锚定）
    for (const [pid, ps] of Object.entries(state.parties)) {
      const share = shares[pid] ?? 0;
      ps.supportLastElection = share;
      ps.votesLastElection = Math.round((share / 100) * comp.validVotes);
      ps.seatsLastElection = allocation.seats[pid] ?? 0;
      ps.seats = allocation.seats[pid] ?? 0;
      ps.support = share;
      ps.inGovernment = false;
      ps.supportsGovernment = false;
    }
    state.parliamentSeatsTotal = totalSeats;
    recordResults = Object.entries(allocation.seats)
      .filter(([pid, s]) => s > 0 || (shares[pid] ?? 0) > 0.2)
      .map(([pid, s]) => ({
        partyId: pid,
        share: shares[pid] ?? 0,
        votes: Math.round(((shares[pid] ?? 0) / 100) * comp.validVotes),
        seats: s,
        isSimulated: true,
      }));
  }
  state.lastElectionDate = opts.date;

  const record: ElectionRecord = {
    id: useHistorical && hist ? hist.id : `sim_${opts.date.replace(/-/g, '')}`,
    date: useHistorical && hist ? hist.date : opts.date,
    type: opts.type,
    label: opts.label,
    totalSeats: useHistorical && hist ? hist.total_seats : totalSeats,
    turnout: useHistorical && hist ? hist.turnout_rate : comp.turnout,
    fairness,
    results: recordResults.sort((a, b) => b.seats - a.seats),
    otherSeats,
    otherVoteShare,
    triggerReason: opts.trigger,
    isHistorical: useHistorical,
    note: hist
      ? `${hist.environment_note}${useHistorical ? '（历史观察：原样展示史实结果，未计入模型贡献）' : '（本局加权推演：史实参考 ' + Math.round(w * 100) + '%，模型 ' + Math.round((1 - w) * 100) + '%）'}`
      : '模型推演选举：结果由选民群体效用模型计算，非史料统计。',
  };

  state.elections.push(record);
  state.stats.electionsHeld++;

  // 组阁：史实锚定较强时安装真实内阁，否则由模型组阁
  let gov: GovernmentState;
  const historicalGovId = hist ? HISTORICAL_GOV_AFTER_ELECTION[hist.id] : undefined;
  const historicalGov = historicalGovId ? governments.find((g) => g.id === historicalGovId) : undefined;
  // 史实内阁若依赖已被取缔的政党，则不能安装，改由模型组阁
  const historicalGovViable = historicalGov && !historicalGov.parties.some((p) => state.parties[p]?.banned);
  if (historicalGov && historicalGovViable && state.meta.mode === 'historical' && state.meta.divergence === 0 && !state.flags.playerGovernment && state.government.isHistorical) {
    // 政府已在选举前成立：保持现任（幂等安装）；
    // 未来政府不在此处提前安装，留给政府日程按真实日期处理（WMR-007 / WMR-008）。
    gov = historicalGov.from <= opts.date ? installHistoricalGovernment(state, historicalGov.id) : state.government;
  } else {
    const outcome = formGovernment(state, rng);
    gov = installGovernment(state, outcome, opts.date, rng, true);
  }
  record.governmentFormed = gov.name_zh;
  state.flags.lastGovernmentFormation = '选举后按新席位完成组阁：' + gov.name_zh + '，首脑' + (personMap.get(gov.chancellorId)?.name_zh ?? gov.chancellorId) + '；执政席位' + gov.seatsAtFormation + '/' + state.parliamentSeatsTotal + '。';

  state.log.push({
    id: `log_election_${opts.date}`,
    date: opts.date,
    type: 'election',
    title: `${formatDateFull(opts.date)} ${opts.label}`,
    detail: `投票率 ${record.turnout.toFixed(1)}%，选举公平性 ${(fairness * 100).toFixed(0)}%。席位第一：${partyMap.get(record.results[0]?.partyId)?.short_name ?? '—'}（${record.results[0]?.seats ?? 0} 席）。组阁结果：${gov.name_zh}。`,
    importance: 'critical',
  });

  return record;
}


function installGovernment(
  state: GameState,
  outcome: ReturnType<typeof formGovernment>,
  date: string,
  rng: RNG,
  afterElection = false
): GovernmentState {
  // 同一总理、同一联盟：视为内阁改组而非新政府，避免同名政府反复生成
  const prev = state.government;
  const sameTeam =
    !afterElection &&
    prev &&
    prev.chancellorId === outcome.chancellorId &&
    prev.parties.length === outcome.parties.length &&
    prev.parties.every((p) => outcome.parties.includes(p));
  if (sameTeam) {
    prev.endReason = undefined;
    state.lastGovernmentChange = prev.startDate;
    return prev;
  }

  // 关闭旧政府
  if (prev) {
    prev.endDate = date;
    prev.endReason = afterElection ? '国会选举后按新席位重组' : '经公开政府危机决策重组';
    const idx = state.governmentHistory.findIndex((g) => g.id === prev.id && g.endDate === null);
    if (idx >= 0) state.governmentHistory[idx] = { ...prev };
  }

  const chancellor = personMap.get(outcome.chancellorId);
  const members = buildSimulatedCabinet(
    outcome.parties.length ? outcome.parties : ['zentrum'],
    outcome.chancellorId,
    date
  );

  const gov: GovernmentState = {
    id: `gov_sim_${date.replace(/-/g, '')}_${Math.floor(rng.next() * 1000)}`,
    name_zh: cabinetName(state, outcome.chancellorId, chancellor?.name_zh ?? '临时'),
    type: outcome.type,
    parties: outcome.parties,
    supportParties: outcome.supportParties,
    chancellorId: outcome.chancellorId,
    viceChancellorId: members.find((m) => m.office_id === 'vice_chancellor')?.person_id ?? null,
    startDate: date,
    endDate: null,
    seatsAtFormation: outcome.seats,
    parliamentSeatsTotal: state.parliamentSeatsTotal,
    members,
    program: `由模型推演生成：${outcome.explanation.join(' ')}`,
    presidentialSupport: state.presidentId === 'person_hindenburg' ? 0.6 : 0.8,
    trustStatus: outcome.type === 'presidential_cabinet' ? 'not_required' : outcome.seats > majorityThreshold(state.parliamentSeatsTotal) ? 'confirmed' : 'tolerated',
    isHistorical: false,
    isSimulated: true,
  };

  applyRegimeType(state, gov);

  state.government = gov;
  state.governmentHistory.push(gov);
  state.lastGovernmentChange = date;
  state.stats.governmentsFormed++;

  for (const p of Object.values(state.parties)) { p.inGovernment = false; p.supportsGovernment = false; }
  for (const pid of gov.parties) if (state.parties[pid]) state.parties[pid].inGovernment = true;
  for (const pid of gov.supportParties) if (state.parties[pid]) state.parties[pid].supportsGovernment = true;

  state.log.push({
    id: `log_gov_${gov.id}`,
    date,
    type: 'government',
    title: `${gov.name_zh}成立`,
    detail: `政府类型：${govTypeLabel(gov.type)}；执政党：${gov.parties.map((p) => partyMap.get(p)?.short_name).join('、') || '无党派'}；席位 ${gov.seatsAtFormation}/${gov.parliamentSeatsTotal}。${outcome.explanation.join(' ')}`,
    importance: 'critical',
    causes: outcome.explanation,
  });

  return gov;
}

/** 同一总理多次组阁时加上“第 N 任”，避免政府史出现同名重复 */
function cabinetName(state: GameState, chancellorId: string, chancellorName: string): string {
  const count = state.governmentHistory.filter((g) => g.chancellorId === chancellorId).length;
  if (count <= 0) return `${chancellorName}内阁`;
  return `${chancellorName}内阁（第 ${count + 1} 任）`;
}

export function govTypeLabel(type: string): string {
  const map: Record<string, string> = {
    parliamentary_majority: '议会多数政府',
    coalition: '联合政府',
    minority: '少数政府',
    caretaker: '看守政府',
    presidential_cabinet: '总统内阁',
    transitional: '过渡政府',
    constitutional_monarchy: '君主立宪政府',
    council_republic: '苏维埃共和政府',
    authoritarian: '威权政府',
  };
  return map[type] ?? type;
}

/**
 * 政权类型决定政府类型：一旦玩家选择保留君主制/建立苏维埃/走向威权，
 * 此后无论安装史实内阁还是模型组阁，政府类型都应延续该政权性质，
 * 否则下一次选举就会把玩家的结构性选择“改回”议会制。
 */
function applyRegimeType(state: GameState, gov: GovernmentState) {
  const regime = state.flags.regime;
  if (regime === 'constitutional_monarchy') gov.type = 'constitutional_monarchy';
  else if (regime === 'council_republic') gov.type = 'council_republic';
  else if (regime === 'authoritarian') gov.type = 'authoritarian';
}

/**
 * 用观察到的选举结果校准各选民群体的党派亲和度（选举学习）。
 * 采用“向观察值插值”而非乘性放大，避免多次选举后亲和度发散。
 */
export function recalibrateAffinities(state: GameState, shares: Record<PartyId, number>) {
  for (const g of voterGroups) {
    const gs = state.voterGroups[g.id];
    if (!gs) continue;
    let total = 0;
    for (const v of Object.values(gs.affinity)) total += v;
    if (total <= 0) total = 175;

    // 目标 = 全国得票结构 × 群体固有倾向^0.5
    // 平方根衰减：保留群体差异，但不让某党在单一群体中被过度放大。
    const weights: Record<string, number> = {};
    let denom = 0;
    for (const pid of Object.keys(gs.affinity)) {
      const observed = Math.max(0.05, shares[pid] ?? 0);
      const tilt = Math.max(0.002, gs.tilt[pid] ?? 1 / Object.keys(gs.affinity).length);
      const w = observed * Math.sqrt(tilt);
      weights[pid] = w;
      denom += w;
    }
    if (denom <= 0) continue;

    for (const pid of Object.keys(gs.affinity)) {
      const target = (weights[pid] / denom) * total;
      gs.affinity[pid] = clamp(gs.affinity[pid] * 0.4 + target * 0.6, 0, 100);
    }
  }
}

/** 安装史实内阁（用于史实锚定较强时的政治更迭） */
export function installHistoricalGovernment(state: GameState, govId: string): GovernmentState {
  const data = governments.find((g) => g.id === govId);
  if (!data) return state.government;

  // 幂等：目标政府已经是当前活动政府时，不得重复关闭、push 或增加 governmentsFormed（WMR-007）
  if (state.government.id === govId && !state.government.endDate) {
    return state.government;
  }

  const prev = state.government;
  prev.endDate = data.from;
  prev.endReason = data.end_reason ?? '内阁更迭';
  const idx = state.governmentHistory.findIndex((g) => g.id === prev.id && g.endDate === null);
  if (idx >= 0) state.governmentHistory[idx] = { ...prev };

  const gov: GovernmentState = {
    id: data.id,
    name_zh: data.name_zh,
    type: data.type,
    parties: [...data.parties],
    supportParties: [...(data.support_parties ?? [])],
    chancellorId: data.chancellor_id,
    viceChancellorId: data.vice_chancellor_id ?? null,
    startDate: data.from,
    endDate: null,
    seatsAtFormation: data.seats_at_formation,
    parliamentSeatsTotal: data.parliament_seats_total || state.parliamentSeatsTotal,
    members: data.members.map((m) => ({ ...m })),
    program: data.program_zh,
    presidentialSupport: data.presidential_support,
    trustStatus: data.parliamentary_trust,
    isHistorical: true,
  };

  applyRegimeType(state, gov);

  state.government = gov;
  state.governmentHistory.push(gov);
  state.lastGovernmentChange = gov.startDate;
  for (const record of state.elections) if (HISTORICAL_GOV_AFTER_ELECTION[record.id] === govId) record.governmentFormed = gov.name_zh;
  state.stats.governmentsFormed++;

  for (const p of Object.values(state.parties)) {
    p.inGovernment = false;
    p.supportsGovernment = false;
  }
  for (const pid of gov.parties) if (state.parties[pid]) state.parties[pid].inGovernment = true;
  for (const pid of gov.supportParties) if (state.parties[pid]) state.parties[pid].supportsGovernment = true;

  state.log.push({
    id: `log_gov_${gov.id}_${state.date}`,
    date: state.date,
    type: 'government',
    title: `${gov.name_zh}成立`,
    detail: `${govTypeLabel(gov.type)}；总理 ${personMap.get(gov.chancellorId)?.name_zh}；执政党 ${gov.parties
      .map((p) => partyMap.get(p)?.short_name)
      .join('、')}；席位 ${gov.seatsAtFormation}/${gov.parliamentSeatsTotal}。`,
    importance: 'critical',
  });

  return gov;
}

/** 政府存续检查：返回是否倒阁及原因 */
export function checkGovernmentSurvival(state: GameState, rng: RNG): { fall: boolean; reason: string } {
  const gov = state.government;
  const threshold = majorityThreshold(state.parliamentSeatsTotal);
  const seats = gov.parties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);
  const supportSeats = gov.supportParties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);

  if (gov.type === 'authoritarian' || state.flags.reichstagDissolved) return { fall: false, reason: '' };
  const lastReview = String(state.flags.lastCabinetReview ?? gov.startDate);
  if (monthsInOffice(lastReview,state.date) < 3) return { fall: false, reason: '' };
  if (seats + supportSeats < threshold) return { fall: true, reason: '当前执政与容忍力量合计 ' + (seats + supportSeats) + ' 席，低于多数门槛 ' + threshold + ' 席，需要重新争取信任。' };
  if (state.institutions.governmentLegitimacy < 25 && state.institutions.partyCompromise < 30) return { fall: true, reason: '政府合法性与联盟妥协能力持续低迷，须公开处理信任危机。' };
  return { fall: false, reason: '' };
}

export function monthsInOffice(start: string, now: string): number {
  const a = new Date(start);
  const b = new Date(now);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** 倒阁后由总统任命新政府 */
export function replaceGovernment(state: GameState, rng: RNG, reason: string) {
  const outcome = formGovernment(state, rng);
  const date = state.cursorDate ?? state.date;
  const prev = state.government;
  prev.endDate = date;
  prev.endReason = reason;
  const idx = state.governmentHistory.findIndex((g) => g.id === prev.id && g.endDate === null);
  if (idx >= 0) state.governmentHistory[idx] = { ...prev };
  installGovernment(state, outcome, date, rng, true);
  state.log.push({
    id: `log_govfall_${date}_${Math.floor(rng.next() * 10000)}`,
    date,
    type: 'government',
    title: `${prev.name_zh}倒台`,
    detail: reason,
    importance: 'critical',
  });
}
