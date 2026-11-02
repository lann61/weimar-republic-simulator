import { strategy } from '../events/strategy';
import type { GameState } from '../types';
import type { RNG } from '../engine/random';
import { clamp } from '../engine/random';
import { voterGroups } from '../../data/voterGroups';

/** 社会结构与情绪（方案 §7） */
export function stepSociety(state: GameState, rng: RNG) {
  const s = state.society;
  const e = state.economy;
  const inst = state.institutions;

  // 极化：失业、不平等、暴力、媒体封闭相互强化（回路C）
  const polarizationTarget = clamp(
    25 +
      e.unemployment * 0.8 +
      s.inequality * 0.2 +
      s.violence * 0.25 +
      (100 - s.mediaFreedom) * 0.15 -
      s.socialTrust * 0.25 - strategy(state,'cohesion') * 1.5 - strategy(state,'accountability') * 0.3,
    0,
    100
  );
  s.polarization += (polarizationTarget - s.polarization) * 0.1 + rng.normal() * 0.25;

  // 政治暴力：组织化程度、执法中立性、极化共同决定
  const violenceTarget = clamp(
    s.polarization * 0.42 + (100 - inst.policeNeutrality) * 0.25 + (100 - inst.judicialIndependence) * 0.1 - 12 - strategy(state,'cohesion') * 0.6,
    0,
    100
  );
  s.violence += (violenceTarget - s.violence) * 0.12 + rng.normal() * 0.6;
  s.violenceDeaths += Math.max(0, s.violence - 40) * rng.range(0.3, 1.4);

  // 罢工：实际工资与失业
  const strikeTarget = clamp(15 + Math.max(0, 55 - e.realWages) * 0.9 + e.unemployment * 0.4 - s.socialTrust * 0.15, 0, 100);
  s.strikes += (strikeTarget - s.strikes) * 0.15;

  // 社会信任
  const trustTarget = clamp(70 - s.polarization * 0.45 - s.violence * 0.25 + inst.governmentLegitimacy * 0.2, 0, 100);
  s.socialTrust += (trustTarget - s.socialTrust) * 0.1;

  // 对政府的信任
  const trustGovTarget = clamp(35 + (s.satisfaction - 45) * 0.7 - s.violence * 0.2 + inst.governmentLegitimacy * 0.25, 0, 100);
  s.trust += (trustGovTarget - s.trust) * 0.12;

  // 共和国认同：绩效 + 精英承诺 + 暴力
  const republicTarget = clamp(
    30 + s.satisfaction * 0.35 + inst.constitutionalCommitment * 0.35 - s.violence * 0.2 - (100 - inst.parliamentAuthority) * 0.15,
    0,
    100
  );
  s.republicSupport += (republicTarget - s.republicSupport) * 0.07;

  // 新闻自由：紧急权力与政治压力的直接函数
  const mediaTarget = clamp(85 - inst.emergencyDependence * 0.5 - inst.presidentialPowerUse * 0.25 - s.violence * 0.1, 0, 100);
  s.mediaFreedom += (mediaTarget - s.mediaFreedom) * 0.15;

  // 排外与反犹主义传播：危机 + 极化 + 仇恨宣传
  const hateTarget = clamp(20 + s.polarization * 0.4 + e.unemployment * 0.4 - s.mediaFreedom * 0.1, 0, 100);
  s.antisemitism += (hateTarget - s.antisemitism) * 0.08;

  // 不平等、住房、文化自由
  s.inequality = clamp(s.inequality + (e.unemployment * 0.02 - e.realWages * 0.01) + rng.normal() * 0.1, 0, 100);
  s.housing = clamp(s.housing + (50 - s.housing) * 0.03 - Math.max(0, e.deficit - 8) * 0.05, 0, 100);
  s.culturalFreedom = clamp(70 - inst.emergencyDependence * 0.4 - s.polarization * 0.15, 0, 100);

  // 抗议与政治谋杀
  s.protests = clamp(s.polarization * 0.6 + e.unemployment * 0.5 - 20, 0, 100);
  s.politicalMurders = clamp(s.violence * 0.25 + s.antisemitism * 0.08, 0, 100);

  // 乐观程度
  const optimismTarget = clamp(30 + (e.output - 55) * 0.5 + s.satisfaction * 0.25 - s.polarization * 0.15, 0, 100);
  s.optimism += (optimismTarget - s.optimism) * 0.12;
}


/** 各选民群体的状态：由全国状况 + 群体敏感度共同决定，避免所有群体同值 */
export function stepVoterGroups(state: GameState) {
  const e = state.economy;
  const s = state.society;

  for (const g of voterGroups) {
    const gs = state.voterGroups[g.id];
    if (!gs) continue;
    const sens = g.sensitivity;

    const unemploymentHit = Math.max(0, e.unemployment - 8) * (sens.unemployment - 0.6) * 0.8;
    const inflationHit = Math.max(0, e.inflation - 6) * (sens.inflation - 0.5) * 0.25;
    const wageEffect = (e.realWages - 58) * (sens.wages - 0.5) * 0.18;
    const securityHit = Math.max(0, s.violence - 40) * (sens.security - 0.5) * 0.15;

    gs.satisfaction = clamp(s.satisfaction - unemploymentHit - inflationHit + wageEffect - securityHit, 0, 100);
    gs.trust = clamp(s.trust - unemploymentHit * 0.8 + wageEffect * 0.5, 0, 100);
    gs.republicSupport = clamp(s.republicSupport - Math.max(0, unemploymentHit) * 0.4, 0, 100);
    gs.economicOutlook = clamp(50 + (e.output - 70) * 0.7 - Math.max(0, e.unemployment - 8) * 0.8, 0, 100);
    gs.alienation = clamp(18 + (100 - gs.satisfaction) * 0.35 + s.polarization * 0.2 - s.socialTrust * 0.1, 0, 100);
    gs.turnout = clamp(g.turnout_base * 100 + (gs.satisfaction - 50) * 0.25 - gs.alienation * 0.1, 45, 96);
  }
}
