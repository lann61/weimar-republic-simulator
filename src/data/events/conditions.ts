import type { HistoricalEvent } from '../types';

/**
 * 事件前置条件（方案 §10.3 / §5 状态驱动）
 *
 * 设计原则：
 * 1. 条件表达“该事件在历史上得以发生的状态前提”，而不是精确复刻某一数值。
 * 2. 阈值相对基线留出足够余量，保证历史观察模式仍能完整复现史料进程
 *    （基线数值见 docs/SIMULATION_MODEL.md）。
 * 3. 玩家若把状态推向相反方向，事件将不再发生，历史由此真正分叉。
 */
export const eventConditions: Record<string, { path: string; op: '>' | '<' | '>=' | '<=' | '=='; value: number }[]> = {
  // ── 共和制专属：总统选举与总统继任 ──────────────────────
  // 玩家选择维持帝制/苏维埃/威权时，这些事件不应发生（WMR-012 的政权门控）
  ev_ebert_death: [{ path: 'flags.republicanRegime', op: '==', value: 1 }],
  ev_presidential_1925: [{ path: 'flags.republicanRegime', op: '==', value: 1 }],
  ev_hindenburg_elected: [{ path: 'flags.republicanRegime', op: '==', value: 1 }],
  ev_presidential_1932_second: [{ path: 'flags.republicanRegime', op: '==', value: 1 }],

  // ── 革命与建国 ──────────────────────────────────────────
  ev_spartacus_uprising: [{ path: 'society.polarization', op: '>=', value: 45 }],
  ev_luxemburg_murder: [{ path: 'society.violence', op: '>=', value: 35 }],
  ev_march_1919_berlin: [{ path: 'society.violence', op: '>=', value: 30 }],
  ev_bavarian_soviet: [{ path: 'society.violence', op: '>=', value: 30 }],
  ev_treaty_decision: [{ path: 'diplomacy.isolation', op: '>=', value: 40 }],
  ev_versailles_signed: [{ path: 'diplomacy.isolation', op: '>=', value: 30 }],

  // ── 1920—1922 ──────────────────────────────────────────
  ev_kapp_putsch: [{ path: 'institutions.militarySubordination', op: '<=', value: 60 }],
  ev_ruhr_red_army: [{ path: 'society.polarization', op: '>=', value: 40 }],
  ev_london_ultimatum: [{ path: 'diplomacy.reparationsPressure', op: '>=', value: 15 }],
  ev_rathenau_assassination: [{ path: 'society.violence', op: '>=', value: 14 }],
  ev_republic_protection_law: [{ path: 'society.violence', op: '>=', value: 14 }],
  ev_upper_silesia: [{ path: 'diplomacy.borderPressure', op: '>=', value: 20 }],

  // ── 1923 ───────────────────────────────────────────────
  ev_ruhr_occupation: [{ path: 'diplomacy.reparationsPressure', op: '>=', value: 20 }],
  ev_revenue_collapse: [{ path: 'economy.deficit', op: '>=', value: 2 }],
  ev_hyperinflation: [{ path: 'economy.moneySupply', op: '>=', value: 58 }],
  ev_middle_class_ruin: [{ path: 'economy.savingsValue', op: '<=', value: 60 }],
  
  ev_end_passive_resistance: [{ path: 'economy.inflation', op: '>=', value: 8 }],
  ev_bavaria_emergency: [{ path: 'society.polarization', op: '>=', value: 30 }],
  ev_saxony_thuringia: [{ path: 'society.polarization', op: '>=', value: 30 }],
  ev_separatism: [{ path: 'institutions.federalCohesion', op: '<=', value: 65 }],
  ev_beer_hall_putsch: [{ path: 'society.violence', op: '>=', value: 12 }],
  ev_rentenmark: [{ path: 'economy.moneySupply', op: '>=', value: 52 }],

  // ── 1924—1928 ──────────────────────────────────────────
  ev_dawes_plan: [{ path: 'diplomacy.reparationsPressure', op: '>=', value: 12 }],
  ev_hitler_trial: [{ path: 'society.polarization', op: '>=', value: 25 }],
  ev_locarno: [{ path: 'diplomacy.relationFrance', op: '>=', value: -80 }],
  ev_unemployment_insurance: [{ path: 'society.satisfaction', op: '>=', value: 40 }],
  ev_young_plan_negotiation: [{ path: 'diplomacy.reparationsPressure', op: '>=', value: 10 }],
  ev_princes_referendum: [{ path: 'society.polarization', op: '>=', value: 15 }],

  // ── 1929—1930 ──────────────────────────────────────────
  ev_young_plan_referendum: [{ path: 'society.polarization', op: '>=', value: 15 }],
  ev_capital_outflow: [{ path: 'economy.foreignCapital', op: '>=', value: 15 }],
  ev_unemployment_surge: [{ path: 'economy.output', op: '<=', value: 95 }],
  ev_unemployment_fund_gap: [{ path: 'economy.unemployment', op: '>=', value: 6 }],
  ev_mueller_fall: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 90 }],
  ev_bruening_cabinet: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 85 }],
  ev_reichstag_rejects_budget: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 80 }],

  // ── 1931—1932 ──────────────────────────────────────────
  ev_bank_crisis_1931: [{ path: 'economy.bankLiquidity', op: '<=', value: 60 }],
  ev_harzburg_front: [{ path: 'society.polarization', op: '>=', value: 20 }],
  ev_mass_unemployment: [{ path: 'economy.unemployment', op: '>=', value: 10 }],
  ev_presidential_1932_first: [
    { path: 'society.polarization', op: '>=', value: 20 },
    { path: 'flags.republicanRegime', op: '==', value: 1 },
  ],
  ev_papen_cabinet: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 70 }],
  ev_prussian_coup: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 60 }],
  ev_nazi_largest_party: [{ path: 'parties.nsdap.seats', op: '>=', value: 120 }],
  ev_schleicher_cabinet: [{ path: 'institutions.parliamentAuthority', op: '<=', value: 60 }],
  ev_elite_bargain: [
    { path: 'parties.nsdap.seats', op: '>=', value: 100 },
    { path: 'flags.republicanRegime', op: '==', value: 1 },
  ],

  // ── 1933—1934 ──────────────────────────────────────────
  ev_hitler_appointed: [
    { path: 'parties.nsdap.seats', op: '>=', value: 100 },
    // 只有精英交易选择了“允许希特勒出任总理”，任命事件才发生（WMR-026）
    // 该 flag 只由共和制下的 allow_appointment 设置，已隐含政权门控
    { path: 'flags.hitlerAppointmentAllowed', op: '>=', value: 1 },
  ],
  ev_reichstag_fire: [{ path: 'parties.nsdap.seats', op: '>=', value: 120 }],
  ev_enabling_act_debate: [{ path: 'parties.nsdap.seats', op: '>=', value: 150 }],
  ev_kpd_mandates: [{ path: 'parties.nsdap.seats', op: '>=', value: 180 }],
  ev_laender_gleichschaltung: [{ path: 'parties.nsdap.seats', op: '>=', value: 180 }],
  ev_civil_service_purge: [{ path: 'parties.nsdap.seats', op: '>=', value: 180 }],
};

/** 事件链：前置事件未发生，则后续事件也不发生 */
export const eventRequires: Record<string, string[]> = {
  ev_versailles_signed: ['ev_treaty_decision'],
  ev_republic_protection_law: ['ev_rathenau_assassination'],
  ev_hyperinflation: ['ev_ruhr_occupation'],
  ev_middle_class_ruin: ['ev_hyperinflation'],
  ev_barter_economy: ['ev_hyperinflation'],
  ev_end_passive_resistance: ['ev_ruhr_occupation'],
  ev_rentenmark: ['ev_hyperinflation'],
  ev_beer_hall_putsch: ['ev_bavaria_emergency'],
  ev_hitler_trial: ['ev_beer_hall_putsch'],
  ev_bruening_cabinet: ['ev_mueller_fall'],
  ev_reichstag_rejects_budget: ['ev_bruening_cabinet'],
  ev_papen_cabinet: ['ev_bruening_cabinet'],
  ev_prussian_coup: ['ev_papen_cabinet'],
  ev_nazi_largest_party: ['ev_election_1932_07'],
  ev_schleicher_cabinet: ['ev_papen_cabinet'],
  ev_elite_bargain: ['ev_schleicher_cabinet'],
  ev_hitler_appointed: ['ev_elite_bargain'],
  ev_reichstag_dissolved_1933: ['ev_hitler_appointed'],
  ev_reichstag_fire: ['ev_reichstag_dissolved_1933'],
  ev_election_1933: ['ev_reichstag_fire'],
  ev_unfree_election: ['ev_election_1933'],
  ev_kpd_mandates: ['ev_election_1933'],
  ev_enabling_act_debate: ['ev_kpd_mandates'],
  ev_laender_gleichschaltung: ['ev_enabling_act_debate'],
  ev_civil_service_purge: ['ev_enabling_act_debate'],
  ev_union_dissolved: ['ev_enabling_act_debate'],
  ev_parties_banned: ['ev_enabling_act_debate'],
  ev_hindenburg_death: ['ev_hitler_appointed'],
  ev_army_oath: ['ev_hindenburg_death'],
};

export function applyConditions(events: HistoricalEvent[]): HistoricalEvent[] {
  return events.map((e) => {
    const cond = eventConditions[e.id];
    const req = eventRequires[e.id];
    if (!cond && !req) return e;
    return {
      ...e,
      trigger: {
        ...e.trigger,
        conditions: cond ?? e.trigger.conditions,
        requires_events: req ?? e.trigger.requires_events,
      },
    };
  });
}
