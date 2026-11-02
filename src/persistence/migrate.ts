import type { GameState } from '../simulation/types';
import { DATA_VERSION } from '../simulation/engine/state';
import { scenarioMap } from '../data/scenarios';
import { eventMap } from '../data/events';
import { prohibitParty, enforceInstitutions } from '../simulation/politics/rules';
import { recordStrategy } from '../simulation/events/strategy';
import { ensureWorldEvents } from '../simulation/events/world';

/**
 * 旧存档迁移（V2.1 第 4 章 / WMR-020 配套）。
 * 1.1.0 存档缺少 cursorDate、electionSchedule、challenge 等字段；
 * 这里补齐默认值，不伪造历史数据。
 */
export function migrateState(input: GameState): GameState {
  const state = input;
  ensureWorldEvents(state);

  if (!state.cursorDate) state.cursorDate = state.date;
  if (state.meta.ended && state.date > '1934-08-31') state.date = state.cursorDate = '1934-08-31';
  if (!state.electionSchedule) state.electionSchedule = [];
  if (!state.flags) state.flags = {};
  state.evaluatedEvents ??= {};
  state.decisionMemory ??= [];
  state.metricChanges ??= {};
  if (state.government.isSimulated) state.flags.playerGovernment = 1;
  if (state.flags.strategy_demand === undefined) {
    for (const d of state.decisions) {
      const effect = eventMap.get(d.eventId)?.choices.find(c => c.id === d.choiceId)?.effects;
      if (effect) recordStrategy(state,effect);
    }
  }
  for (const d of state.decisions) {
    state.flags[`choice_${d.eventId}_${d.choiceId}`] = 1;
    d.title ??= eventMap.get(d.eventId)?.title;
    d.longTerm ??= eventMap.get(d.eventId)?.choices.find(c => c.id === d.choiceId)?.long_term;
  }
  const cutoff = String(state.flags.scenarioArchive ?? state.meta.startDate);
  state.firedEvents = state.firedEvents.filter(id => {
    const e = eventMap.get(id);
    return !e || e.trigger.type === 'historical_date' || e.date < cutoff || state.decisions.some(d => d.eventId === id);
  });
  const outcomes: Record<string, [string, string[]]> = {
    civilRightsSuspended: ['ev_reichstag_fire', ['emergency_decree']], enablingActPassed: ['ev_enabling_act_debate', ['approve','abstain']],
    onePartyState: ['ev_parties_banned', ['one_party']], kpdMandatesRemoved: ['ev_kpd_mandates', ['annul']],
    judiciaryPurged: ['ev_civil_service_purge', ['purge']], unionsBanned: ['ev_union_dissolved', ['dissolve_unions']],
    officesMerged: ['ev_hindenburg_death', ['merge_offices']], personalArmyOath: ['ev_army_oath', ['personal_oath']],
  };
  for (const [flag, [id, choices]] of Object.entries(outcomes)) if (state.flags[flag] === undefined) {
    const decision = state.decisions.find(d => d.eventId === id);
    if (decision) state.flags[flag] = choices.includes(decision.choiceId) ? 1 : 0;
  }
  if (state.flags.kpdMandatesRemoved) prohibitParty(state, 'kpd');
  if (state.flags.onePartyState) for (const id of Object.keys(state.parties)) if (id !== 'nsdap') prohibitParty(state, id);
  enforceInstitutions(state);

  // 挑战情景：旧存档缺少 challenge 时按场景定义重建
  if (!state.challenge) {
    const sc = scenarioMap.get(state.meta.scenarioId);
    if (sc?.mode === 'challenge' && sc.challenge) {
      state.challenge = {
        scenarioId: sc.id,
        objectives: sc.challenge.objectives,
        constraints: sc.challenge.constraints,
        progress: [],
        status: 'active',
      };
    }
  }

  // 旧快照缺少 diplomacy 时保持 undefined，界面会提示“旧存档缺少外交快照”，不用当前值伪造
  if (state.meta.dataVersion !== DATA_VERSION) {
    state.meta.dataVersion = DATA_VERSION;
  }

  return state;
}
