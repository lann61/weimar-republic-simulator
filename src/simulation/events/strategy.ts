import type { GameState } from '../types';
import type { EventChoiceEffect } from '../../data/types';
import { clamp } from '../engine/random';

export function strategy(s: GameState, key: string): number {
  return Number(s.flags[`strategy_${key}`] ?? 0);
}

/** 政策取向改变月度模型的目标值，不会被下月的均值回归清除。 */
export function recordStrategy(s: GameState, e: EventChoiceEffect) {
  if (s.meta.mode === 'historical' && s.meta.divergence === 0) return;
  const v=e.vars ?? {}, get=(k:string)=>v[k]??0;
  const changes = {
    demand: get('economy.output')*.2 + get('economy.spending')*.8 + get('economy.investment')*.3 + get('economy.consumption')*.3 - get('economy.unemployment')*.4,
    cooperation: (get('diplomacy.relationFrance')+get('diplomacy.relationBritain')+get('diplomacy.relationUSA'))*.12 - get('diplomacy.isolation')*.2 + get('diplomacy.capitalConfidence')*.2,
    cohesion: get('society.satisfaction')*.25 + get('society.socialTrust')*.3 + get('society.trust')*.2 - get('society.violence')*.3 - get('society.polarization')*.3,
    accountability: get('institutions.parliamentAuthority')*.2 + get('institutions.militarySubordination')*.15 + get('institutions.judicialIndependence')*.2 - get('institutions.emergencyDependence')*.2 - get('institutions.presidentialPowerUse')*.2,
  };
  for(const [key,delta] of Object.entries(changes)) s.flags[`strategy_${key}`]=clamp(strategy(s,key)+delta,-20,20);
}
