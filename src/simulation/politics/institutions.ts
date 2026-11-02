import { strategy } from '../events/strategy';
import type { GameState } from '../types';
import { clamp } from '../engine/random';

/** 制度变量（方案 §3.2）。制度变化慢、有粘性，且存在路径依赖。 */
export function stepInstitutions(state: GameState) {
  const i = state.institutions;
  const s = state.society;
  const e = state.economy;
  const d = state.diplomacy;
  const gov = state.government;

  const isParliamentary = gov.type === 'coalition' || gov.type === 'parliamentary_majority';
  const hasMajority = gov.seatsAtFormation > Math.floor(gov.parliamentSeatsTotal / 2);

  // 议会权威：紧急法令与解散频率的直接受害者（回路D）
  const parliamentTarget = clamp(
    30 +
      (isParliamentary ? 22 : 4) +
      (hasMajority ? 12 : 0) -
      i.emergencyDependence * 0.55 -
      i.presidentialPowerUse * 0.3 +
      i.constitutionalCommitment * 0.25 + strategy(state,'accountability'),
    0,
    100
  );
  i.parliamentAuthority += (parliamentTarget - i.parliamentAuthority) * 0.06;

  // 总统权力使用：危机 + 国会僵局推动，制度认同制约
  const presTarget = clamp(
    10 + Math.max(0, s.polarization - 40) * 0.5 + Math.max(0, 45 - i.parliamentAuthority) * 0.6 - i.constitutionalCommitment * 0.2,
    0,
    100
  );
  i.presidentialPowerUse += (presTarget - i.presidentialPowerUse) * 0.05;

  // 紧急法令依赖度：一旦上升很难下降
  if (i.emergencyDependence > 30) {
    i.emergencyDependence += (presTarget * 0.6 - i.emergencyDependence) * 0.04;
  } else {
    i.emergencyDependence += (presTarget * 0.35 - i.emergencyDependence) * 0.03;
  }
  i.emergencyDependence = clamp(i.emergencyDependence, 0, 100);

  // 宪法认同：精英与公众对宪法秩序的接受
  const constTarget = clamp(
    35 + s.republicSupport * 0.3 + i.parliamentAuthority * 0.25 - s.polarization * 0.2 - i.emergencyDependence * 0.15,
    0,
    100
  );
  i.constitutionalCommitment += (constTarget - i.constitutionalCommitment) * 0.05;

  // 政府合法性
  const legitTarget = clamp(
    25 + s.satisfaction * 0.45 + (isParliamentary ? 12 : -8) + (hasMajority ? 8 : -4) - s.violence * 0.15,
    0,
    100
  );
  i.governmentLegitimacy += (legitTarget - i.governmentLegitimacy) * 0.08;

  // 司法独立与警察中立：政治压力下缓慢侵蚀
  const judicialTarget = clamp(70 - i.presidentialPowerUse * 0.3 - s.polarization * 0.2 - s.antisemitism * 0.1, 0, 100);
  i.judicialIndependence += (judicialTarget - i.judicialIndependence) * 0.03;
  const policeTarget = clamp(65 - s.violence * 0.3 + i.judicialIndependence * 0.2 - i.presidentialPowerUse * 0.15, 0, 100);
  i.policeNeutrality += (policeTarget - i.policeNeutrality) * 0.04;

  // 军队服从文官
  const militaryTarget = clamp(
    35 + i.constitutionalCommitment * 0.35 + i.parliamentAuthority * 0.2 - i.presidentialPowerUse * 0.2 + d.disarmamentConstraint * 0.05 - (state.flags.militaryBargain ? 6 : 0),
    0,
    100
  );
  i.militarySubordination += (militaryTarget - i.militarySubordination) * 0.03;

  // 联邦凝聚力
  const federalTarget = clamp(75 - i.presidentialPowerUse * 0.35 - s.polarization * 0.2 + i.constitutionalCommitment * 0.2, 0, 100);
  i.federalCohesion += (federalTarget - i.federalCohesion) * 0.04;

  // 政党妥协能力
  const compromiseTarget = clamp(75 - s.polarization * 0.5 - i.emergencyDependence * 0.2 + i.parliamentAuthority * 0.15, 0, 100);
  i.partyCompromise += (compromiseTarget - i.partyCompromise) * 0.05;

  // 政府持续性
  const durabilityTarget = clamp(
    30 + (hasMajority ? 25 : 0) + i.partyCompromise * 0.3 + gov.presidentialSupport * 20 - s.polarization * 0.2,
    0,
    100
  );
  i.governmentDurability += (durabilityTarget - i.governmentDurability) * 0.1;

  // 民主韧性：制度变量的综合（方案 §3.2）
  const resilience =
    i.constitutionalCommitment * 0.18 +
    i.parliamentAuthority * 0.16 +
    i.judicialIndependence * 0.1 +
    i.policeNeutrality * 0.1 +
    i.militarySubordination * 0.1 +
    i.federalCohesion * 0.08 +
    i.partyCompromise * 0.1 +
    i.governmentLegitimacy * 0.1 +
    (100 - i.emergencyDependence) * 0.08;
  i.democraticResilience += (resilience - i.democraticResilience) * 0.1;
  i.democraticResilience = clamp(i.democraticResilience, 0, 100);

  // 经济变量对制度的反馈
  if (e.deficit > 12) i.governmentLegitimacy -= 0.05;
}
