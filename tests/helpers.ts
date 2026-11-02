import { buildInitialState } from '../src/simulation/engine/state';
import { advanceMonth, resolvePending, openNextEvent } from '../src/simulation/engine/step';
import { RNG } from '../src/simulation/engine/random';
import { eventMap } from '../src/data/events';
import type { GameState } from '../src/simulation/types';

export interface RunOptions {
  scenarioId?: string;
  seed?: number;
  endDate?: string;
  /** 允许玩家选择偏离史实的选项 */
  choiceOverride?: (eventId: string, defaultChoice: string) => string;
}

export function runSimulation(opts: RunOptions = {}): GameState {
  const { scenarioId = 'sc_historical', seed = 19181109, endDate = '1934-09-01', choiceOverride } = opts;
  const rng = new RNG(seed);
  const state = buildInitialState(scenarioId, seed);
  openNextEvent(state, rng);

  for (let i = 0; i < 2000; i++) {
    if (state.date >= endDate || state.meta.ended) break;
    if (state.pendingEvent) {
      const def = eventMap.get(state.pendingEvent.eventId);
      const defChoice = def?.historical_choice_id ?? def?.choices[0].id;
      const chosen = choiceOverride ? choiceOverride(state.pendingEvent.eventId, defChoice!) : defChoice!;
      resolvePending(state, chosen, rng);
      continue;
    }
    advanceMonth(state, rng);
  }
  return state;
}

export function summarize(s: GameState) {
  return {
    date: s.date,
    ending: s.meta.ending,
    unemployment: Number(s.economy.unemployment.toFixed(2)),
    output: Number(s.economy.output.toFixed(2)),
    inflation: Number(s.economy.inflation.toFixed(2)),
    parliamentAuthority: Number(s.institutions.parliamentAuthority.toFixed(2)),
    resilience: Number(s.institutions.democraticResilience.toFixed(2)),
    elections: s.elections.map((e) => `${e.date}:${e.totalSeats}`).join('|'),
    governments: s.governmentHistory.map((g) => g.id).join('|'),
    decisions: s.decisions.length,
    article48: s.stats.article48Count,
  };
}
