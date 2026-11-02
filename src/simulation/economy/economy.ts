import { strategy } from '../events/strategy';
import { policyMap } from '../../data/policies';
import type { GameState } from '../types';
import type { RNG } from '../engine/random';
import { clamp } from '../engine/random';
import { parseDate } from '../engine/date';

/**
 * 世界经济周期锚点（外部环境，方案 §6.3 外部依赖 / §11.3 回路E）
 * 数值为研究型参数，用于表达 1924—1929 繁荣、1929—1932 崩溃、1933 后微弱复苏。
 */
const WORLD_CYCLE: [string, number][] = [
  ['1918-11-01', 0.72],
  ['1919-06-01', 0.78],
  ['1920-03-01', 0.86],
  ['1921-01-01', 0.82],
  ['1922-01-01', 0.85],
  ['1923-01-01', 0.76],
  ['1923-11-01', 0.64],
  ['1924-06-01', 0.82],
  ['1925-06-01', 0.94],
  ['1926-06-01', 0.97],
  ['1927-06-01', 1.01],
  ['1928-06-01', 1.04],
  ['1929-01-01', 1.05],
  ['1929-11-01', 0.95],
  ['1930-06-01', 0.80],
  ['1931-06-01', 0.63],
  ['1932-06-01', 0.50],
  ['1933-01-01', 0.53],
  ['1934-01-01', 0.62],
  ['1934-08-01', 0.67],
];

export function worldCycle(date: string): number {
  if (date <= WORLD_CYCLE[0][0]) return WORLD_CYCLE[0][1];
  for (let i = 0; i < WORLD_CYCLE.length - 1; i++) {
    const [d0, v0] = WORLD_CYCLE[i];
    const [d1, v1] = WORLD_CYCLE[i + 1];
    if (date >= d0 && date < d1) {
      const t0 = new Date(d0).getTime();
      const t1 = new Date(d1).getTime();
      const t = new Date(date).getTime();
      const f = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * f;
    }
  }
  return WORLD_CYCLE[WORLD_CYCLE.length - 1][1];
}

/** 潜在产出：随年份缓慢增长（战后重建 → 1928 峰值） */
function potentialOutput(date: string): number {
  const { y, m } = parseDate(date);
  const t = y + (m - 1) / 12;
  if (t < 1924) return 52 + (t - 1918) * 2.2;
  if (t < 1929) return 65 + (t - 1924) * 7.0;
  if (t < 1933) return 100 - (t - 1929) * 0.5;
  return 98 + (t - 1933) * 1.5;
}

export interface EconomyDelta {
  outputGrowth: number;
  unemploymentDelta: number;
  inflationDelta: number;
  note: string;
}

export function stepEconomy(state: GameState, rng: RNG): EconomyDelta {
  const e = state.economy;
  const s = state.society;
  const d = state.diplomacy;
  const inst = state.institutions;
  const cycle = worldCycle(state.date);

  // ── 1. 外部冲击：资本流入与信心 ────────────────────────────
  const capitalTarget = clamp(Math.pow(cycle, 3) * 100 + d.capitalConfidence * 0.25 - d.isolation * 0.18 - e.debt * 0.04, 0, 100);
  e.capitalInflow += (capitalTarget - e.capitalInflow) * 0.18 + rng.normal() * 1.2;
  e.foreignCapital = clamp(e.foreignCapital + (e.capitalInflow - e.foreignCapital) * 0.12, 0, 100);

  // ── 2. 银行与信贷（回路E：外资依赖—外部脆弱性） ─────────────
  const liquidityTarget = clamp(20 + e.capitalInflow * 0.55 + strategy(state,'cooperation') * 0.5 - e.businessFailures * 0.25 + d.capitalConfidence * 0.1, 0, 100);
  e.bankLiquidity += (liquidityTarget - e.bankLiquidity) * 0.2 + rng.normal() * 1.0;
  const creditTarget = clamp(e.bankLiquidity * 0.7 + d.capitalConfidence * 0.3 - e.inflation * 0.15, 0, 100);
  e.creditSupply += (creditTarget - e.creditSupply) * 0.22;

  // ── 3. 投资与消费 ────────────────────────────────────────
  const realWagePressure = Math.max(0, e.realWages - 60) * 0.06;
  // 金融加速器：流动性枯竭时投资额外收缩（回路E）
  const financialAccelerator = Math.max(0, 45 - e.bankLiquidity) * 0.8;
  const investTarget = clamp(
    e.creditSupply * 0.55 +
      e.capitalInflow * 0.25 +
      d.capitalConfidence * 0.2 +
      e.output * 0.05 -
      realWagePressure -
      e.debt * 0.05 -
      financialAccelerator,
    5,
    100
  );
  e.investment += (investTarget - e.investment) * 0.16 + rng.normal() * 0.6;

  const consTarget = clamp(
    e.realWages * 0.45 + (100 - e.unemployment * 2.4) * 0.28 + e.savingsValue * 0.12 + s.satisfaction * 0.15,
    5,
    100
  );
  e.consumption += (consTarget - e.consumption) * 0.2 + rng.normal() * 0.5;

  // ── 4. 出口与进口 ────────────────────────────────────────
  const exportTarget = clamp(cycle * 78 + d.relationBritain * 0.1 + d.relationFrance * 0.08 - d.treatyConstraint * 0.08, 5, 100);
  e.exports += (exportTarget - e.exports) * 0.2;
  const importTarget = clamp(e.consumption * 0.5 + e.investment * 0.35 + 10, 5, 100);
  e.imports += (importTarget - e.imports) * 0.18;

  // ── 5. 产出（需求驱动） ───────────────────────────────────
  const govDemand = clamp(e.spending * 2.2, 0, 110);
  const demand = (e.investment * 0.34 + e.consumption * 0.28 + e.exports * 0.22 + govDemand * 0.16) * 1.32;
  const potential = potentialOutput(state.date);
  const supplyShock = state.flags['ruhr_occupation'] ? -6 : 0;
  // 1933 年后的国家主导就业与军备动员：历史上确实带来 1933—1934 年的产出回升
  const reflation = state.activePolicies.filter(p => ['pol_public_works','pol_expansion','pol_industry_stimulus'].includes(p.policyId)).length * 1.5;
  const outputTarget = clamp(potential * (0.65 + cycle * 0.35) + (demand - 80) * 0.45 - Math.max(0, 45 - e.bankLiquidity) * 0.35 + supplyShock + reflation + strategy(state,'demand') + strategy(state,'cooperation') * 0.25 + strategy(state,'cohesion') * 0.15, 15, 115);
  const outputGrowth = (outputTarget - e.output) * 0.28 + rng.normal() * 0.4;
  e.output = clamp(e.output + outputGrowth, 15, 115);
  e.gdp = clamp(e.gdp + (e.output - e.gdp) * 0.3, 15, 125);

  // ── 6. 失业（回路A：产出—失业—消费） ──────────────────────
  const gap = potential - e.output;
  const equilibriumU =
    5.5 +
    0.4 * Math.max(0, gap) +
    Math.max(0, 1 - cycle) * 7 -
    reflation +
    Math.max(0, 50 - e.creditSupply) * 0.06;
  // 极端失业的自我限制：救济性就业、非正规经济、外流与统计口径
  const limitedU = equilibriumU - Math.max(0, equilibriumU - 32) * 0.35;
  const uSpeed = 0.2;
  const unemploymentDelta = (limitedU - e.unemployment) * uSpeed + rng.normal() * 0.08;
  e.unemployment = clamp(e.unemployment + unemploymentDelta, 0.5, 60);

  // ── 7. 物价与通胀 ────────────────────────────────────────
  const moneyGrowth =
    (e.moneySupply - 55) * 0.06 +
    Math.max(0, e.deficit) * 0.55 +
    Math.max(0, e.moneySupply - 70) * 3.2 +
    (e.moneySupply > 85 ? (e.moneySupply - 85) * 22 : 0);
  const demandPull = (e.output - potential) * 0.12;
  const foodPush = Math.max(0, e.foodPrices - 55) * 0.06;
  const inflationTarget = moneyGrowth + demandPull + foodPush - 2;
  e.inflation += (inflationTarget - e.inflation) * 0.28 + rng.normal() * 0.4;
  e.inflation = clamp(e.inflation, -25, 5000);
  e.priceLevel = clamp(e.priceLevel * (1 + e.inflation / 1200), 50, 100000);

  // 储蓄购买力：通胀的直接受害者
  e.savingsValue = clamp(e.savingsValue - Math.max(0, e.inflation) * 0.35 + (e.inflation < 0 ? 0.4 : 0), 0, 100);

  // ── 8. 财政（回路A后半段：税收下降、救济上升） ─────────────
  const taxTarget = clamp(9 + e.output * 0.09 - e.unemployment * 0.06 + e.taxRevenue * 0.3, 4, 42);
  e.taxRevenue += (taxTarget - e.taxRevenue) * 0.25;
  const welfarePressure = e.unemployment * 0.09 + Math.max(0, 50 - s.satisfaction) * 0.03;
  const fiscalPolicy = state.activePolicies.reduce((n,a) => n + (policyMap.get(a.policyId)?.fiscal_cost ?? 0) + (policyMap.get(a.policyId)?.monthly['economy.deficit'] ?? 0), 0);
  const spendingTarget = clamp(11 + welfarePressure + e.spending * 0.55 + fiscalPolicy, 4, 50);
  e.spending += (spendingTarget - e.spending) * 0.22;
  e.deficit = clamp(e.spending - e.taxRevenue, -15, 35);
  e.debt = clamp(e.debt + e.deficit / 12, 0, 400);

  // 赤字货币化：恶性通胀的制度通道
  if (e.deficit > 6 && e.inflation > 25) {
    e.moneySupply = clamp(e.moneySupply + e.deficit * 0.5, 0, 100);
  } else {
    e.moneySupply = clamp(e.moneySupply + (55 - e.moneySupply) * 0.05, 0, 100);
  }

  // ── 9. 企业与农业 ────────────────────────────────────────
  const failTarget = clamp(60 - e.output * 0.45 + e.debt * 0.06 + Math.max(0, -e.inflation) * 0.2, 0, 100);
  e.businessFailures += (failTarget - e.businessFailures) * 0.2;
  const agriTarget = clamp(70 - e.foodPrices * 0.5 + e.debt * 0.05, 0, 100);
  e.agriculturalDebt += (agriTarget - e.agriculturalDebt) * 0.12;

  // ── 10. 实际工资 ─────────────────────────────────────────
  const wageTarget = clamp(50 + (e.output - 60) * 0.35 - Math.max(0, e.inflation) * 0.25 - e.unemployment * 0.5 + e.realWages * 0.3, 10, 100);
  e.realWages += (wageTarget - e.realWages) * 0.18;

  // ── 11. 社会反馈 ─────────────────────────────────────────
  const hardship = (e.unemployment * 2.6 + Math.max(0, 60 - e.realWages) * 0.6 + Math.max(0, 50 - e.savingsValue) * 0.35) / 3;
  const satisfactionTarget = clamp(78 - hardship - s.polarization * 0.12 + s.optimism * 0.15, 0, 100);
  s.satisfaction += (satisfactionTarget - s.satisfaction) * 0.12;
  s.poverty = clamp(20 + e.unemployment * 1.3 + Math.max(0, 40 - e.realWages) * 0.4, 0, 100);
  s.youthUnemployment = clamp(e.unemployment * 1.35, 0, 80);

  // ── 12. 制度：财政压力 → 政府合法性 ───────────────────────
  inst.governmentLegitimacy += ((s.satisfaction - 50) * 0.04 - Math.max(0, e.deficit - 5) * 0.12) ;
  inst.governmentLegitimacy = clamp(inst.governmentLegitimacy, 0, 100);

  const note =
    e.unemployment > 20
      ? '失业处于危机水平，救济支出与税收下降形成恶性循环。'
      : e.inflation > 100
        ? '物价失控，货币职能受到严重侵蚀。'
        : e.output > potential - 5
          ? '产出接近潜在水平，经济处于景气区间。'
          : '经济低于潜在产出，需求不足。';

  return {
    outputGrowth,
    unemploymentDelta,
    inflationDelta: 0,
    note,
  };
}

export { potentialOutput };
