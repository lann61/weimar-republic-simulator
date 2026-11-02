import { strategy } from '../events/strategy';
import { foreignActors } from '../../data/world';
import type { GameState } from '../types';
import { clamp } from '../engine/random';

/** 外交与国际环境（方案 §8） */
export function stepDiplomacy(state: GameState) {
  const d = state.diplomacy;
  const e = state.economy;

  // 赔款压力：条约约束与经济能力
  d.reparationsPressure = clamp(d.reparationsPressure + (d.treatyConstraint * 0.5 - d.reparationsPressure) * 0.03, 0, 100);

  // 国际资本信心：财政纪律、通胀、政治稳定
  const confidenceTarget = clamp(
    25 + (100 - Math.max(0, e.inflation) * 2) * 0.25 + (e.deficit < 5 ? 12 : -Math.min(20, e.deficit)) + state.institutions.governmentLegitimacy * 0.15 - state.society.violence * 0.1 + strategy(state,'cooperation') * 0.8 + strategy(state,'cohesion') * 0.3,
    0,
    100
  );
  d.capitalConfidence += (confidenceTarget - d.capitalConfidence) * 0.12;

  // 孤立程度：与主要国家关系
  const relationAvg = (d.relationFrance + d.relationBritain + d.relationUSA) / 3;
  const isolationTarget = clamp(60 - relationAvg * 0.5 - d.prestige * 0.3 - d.leagueParticipation * 0.2, 0, 100);
  d.isolation += (isolationTarget - d.isolation) * 0.05;

  // 外交信誉
  d.prestige = clamp(d.prestige + (d.capitalConfidence * 0.02 - state.society.polarization * 0.01), 0, 100);

  // 关系自然回归（事件推动为主）
  for (const a of foreignActors) {
    if (a.id === 'france') d.relationFrance = clamp(d.relationFrance + (a.relation_to_germany * 40 + strategy(state,'cooperation') * 2 - d.relationFrance) * 0.01, -100, 100);
    if (a.id === 'britain') d.relationBritain = clamp(d.relationBritain + (a.relation_to_germany * 40 - d.relationBritain) * 0.012, -100, 100);
    if (a.id === 'usa') d.relationUSA = clamp(d.relationUSA + (a.relation_to_germany * 40 - d.relationUSA) * 0.015, -100, 100);
    if (a.id === 'ussr') d.relationUSSR = clamp(d.relationUSSR + (a.relation_to_germany * 40 - d.relationUSSR) * 0.012, -100, 100);
    if (a.id === 'poland') d.relationPoland = clamp(d.relationPoland + (a.relation_to_germany * 40 - d.relationPoland) * 0.01, -100, 100);
  }

  // 边境压力
  d.borderPressure = clamp(d.borderPressure + (d.relationPoland < -50 ? 0.05 : -0.05), 0, 100);
}
