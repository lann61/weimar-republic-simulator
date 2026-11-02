import { buildInitialState } from '../src/simulation/engine/state';
import { advanceMonth, resolvePending, openNextEvent } from '../src/simulation/engine/step';
import { RNG } from '../src/simulation/engine/random';
import type { GameState } from '../src/simulation/types';
import { eventMap } from '../src/data/events';

/** 基线推演：所有事件按史实选项处理，用于校准与回归测试 */
export function runBaseline(scenarioId = 'sc_historical', seed = 19181109, maxIter = 1200): GameState {
  const rng = new RNG(seed);
  let state = buildInitialState(scenarioId, seed);
  openNextEvent(state, rng);

  for (let i = 0; i < maxIter; i++) {
    if (state.date >= '1934-09-01') break;
    if (state.meta.ended) break;
    if (state.pendingEvent) {
      const ev = state.pendingEvent;
      const def = eventMap.get(ev.eventId);
      const choiceId = def?.historical_choice_id ?? def?.choices[0].id ?? ev.choices[0];
      resolvePending(state, choiceId, rng);
      continue;
    }
    advanceMonth(state, rng);
  }
  return state;
}

const state = runBaseline();
const rows: string[] = [];
let lastYear = '';
for (const snap of state.snapshots) {
  const year = snap.date.slice(0, 4);
  if (year !== lastYear) {
    lastYear = year;
    rows.push(
      [
        year,
        (snap.economy.output ?? 0).toFixed(0).padStart(4),
        (snap.economy.unemployment ?? 0).toFixed(1).padStart(6),
        (snap.economy.inflation ?? 0).toFixed(0).padStart(7),
        (snap.society.satisfaction ?? 0).toFixed(0).padStart(4),
        (snap.institutions.parliamentAuthority ?? 0).toFixed(0).padStart(4),
        (snap.institutions.democraticResilience ?? 0).toFixed(0).padStart(4),
        snap.governmentId.slice(0, 22).padEnd(24),
      ].join(' ')
    );
  }
}

console.log('year  out    unemp  infl  sat  parl  resil  government');
console.log(rows.join('\n'));
console.log('\n--- 选举 ---');
for (const e of state.elections) {
  const top = [...e.results].sort((a, b) => b.seats - a.seats).slice(0, 4);
  console.log(
    `${e.date} ${e.label.padEnd(10)} 席位${String(e.totalSeats).padStart(3)} 投票率${e.turnout.toFixed(1)}%  ${top
      .map((r) => `${r.partyId}:${r.share.toFixed(1)}%/${r.seats}`)
      .join('  ')}  → ${e.governmentFormed}`
  );
}
console.log('\n结局：', state.meta.ending, '| 结束日期', state.date);
console.log('政府更迭：', state.stats.governmentsFormed, '| 第48条：', state.stats.article48Count, '| 决策：', state.stats.decisionsMade);
