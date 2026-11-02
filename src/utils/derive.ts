import type { GameState, GovernmentState } from '../simulation/types';
import { partyMap } from '../data/parties';
import { personMap } from '../data/people';

export interface CabinetCounts {
  /** 内阁唯一人数（总理 + 部长，同一人兼任只计一次） */
  uniquePersons: number;
  /** 部长人数（不含总理） */
  ministers: number;
  /** 部门/职务数量（兼任分别计数） */
  offices: number;
  /** 无任所部长数 */
  withoutPortfolio: number;
  byParty: { partyId: string | null; label: string; count: number }[];
  chancellor: string;
}

export function cabinetCounts(gov: GovernmentState): CabinetCounts {
  const persons = new Set<string>();
  const ministers = new Set<string>();
  const partyCount: Record<string, number> = {};
  let offices = 0;
  let withoutPortfolio = 0;

  for (const m of gov.members) {
    persons.add(m.person_id);
    offices++;
    if (m.office_id !== 'chancellor' && m.office_id !== 'chairman') ministers.add(m.person_id);
    if (m.cabinet_status === 'minister_without_portfolio' || m.office_id === 'without_portfolio') withoutPortfolio++;
    const key = m.party_id ?? 'independent';
    partyCount[key] = (partyCount[key] ?? 0) + 1;
  }

  const byParty = Object.entries(partyCount)
    .map(([pid, count]) => ({
      partyId: pid === 'independent' ? null : pid,
      label: pid === 'independent' ? '无党派' : partyMap.get(pid)?.short_name ?? pid,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    uniquePersons: persons.size,
    ministers: ministers.size,
    offices,
    withoutPortfolio,
    byParty,
    chancellor: personMap.get(gov.chancellorId)?.name_zh ?? gov.chancellorId,
  };
}

export function partySeats(state: GameState) {
  return Object.values(state.parties)
    .filter((p) => p.seats > 0)
    .sort((a, b) => b.seats - a.seats)
    .map((p) => ({
      id: p.id,
      short: partyMap.get(p.id)?.short_name ?? p.id,
      name: partyMap.get(p.id)?.name_zh ?? p.id,
      color: partyMap.get(p.id)?.color ?? '#8B877F',
      seats: p.seats,
      share: state.parliamentSeatsTotal ? (p.seats / state.parliamentSeatsTotal) * 100 : 0,
      support: p.support,
      inGovernment: p.inGovernment,
      supportsGovernment: p.supportsGovernment,
      banned: p.banned,
      membership: p.membership,
    }));
}

export function governmentSeats(state: GameState) {
  const coalition = state.government.parties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);
  const support = state.government.supportParties.reduce((a, p) => a + (state.parties[p]?.seats ?? 0), 0);
  const threshold = Math.floor(state.parliamentSeatsTotal / 2) + 1;
  return {
    coalition,
    support,
    total: coalition + support,
    threshold,
    hasMajority: coalition >= threshold,
    hasEffectiveMajority: coalition + support >= threshold,
    opposition: Math.max(0, state.parliamentSeatsTotal - coalition - support),
  };
}

export function fmtPct(v: number, digits = 1) {
  return `${v.toFixed(digits)}%`;
}

export function fmtNum(v: number) {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(0)}K`;
  return v.toLocaleString('zh-CN');
}

export function metricTone(v: number, good: number, bad: number, invert = false) {
  if (invert) {
    if (v <= good) return 'good';
    if (v >= bad) return 'bad';
    return 'warn';
  }
  if (v >= good) return 'good';
  if (v <= bad) return 'bad';
  return 'warn';
}


export interface HeadOfState {
  name: string;
  title: string;
  since: string | null;
  isTransitional: boolean;
}

/** 当前政权类型（默认共和制） */
export function regimeId(state: GameState): string {
  return typeof state.flags.regime === 'string' ? state.flags.regime : 'republic';
}

/** 国家元首的称谓名词，用于“总统支持度”“总统与紧急权力”等界面文案 */
export function headOfStateNoun(state: GameState): string {
  const r = regimeId(state);
  if (r === 'constitutional_monarchy') return '皇帝';
  if (r === 'council_republic') return '代表会';
  if (r === 'authoritarian') return '元首';
  return '总统';
}

/** 1919年2月11日之前，国家元首为人民代表委员会主席，而非帝国总统 */
export function headOfState(state: GameState): HeadOfState {
  // 总统去世后的空位期：不得继续把前任显示为在任元首（WMR-012）
  if (state.flags.presidentVacant === true) {
    return { name: '空缺', title: '国家元首（总统选举中）', since: null, isTransitional: true };
  }
  // 政权结构改变后（如保留君主制、建立苏维埃共和），使用玩家选择设定的国家元首，
  // 而不是默认的总统逻辑。否则“保留君主制”后界面仍显示艾伯特，选择形同虚设。
  const overrideId = state.flags.headOfStateId;
  if (typeof overrideId === 'string' && overrideId) {
    const overridePerson = personMap.get(overrideId);
    return {
      name:
        overridePerson?.name_zh ??
        (typeof state.flags.headOfStateName === 'string' ? state.flags.headOfStateName : '—'),
      title: typeof state.flags.headOfStateTitle === 'string' ? state.flags.headOfStateTitle : '国家元首',
      since: typeof state.flags.headOfStateSince === 'string' ? state.flags.headOfStateSince : null,
      isTransitional: false,
    };
  }

  const person = personMap.get(state.presidentId);
  const transitional = state.date < state.presidentSince;
  return {
    name: person?.name_zh ?? '—',
    title: transitional ? '人民代表委员会主席' : '帝国总统',
    since: transitional ? null : state.presidentSince,
    isTransitional: transitional,
  };
}
