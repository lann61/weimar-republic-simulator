import { parseSave } from '../persistence/import';
import { enactPolicy } from '../simulation/politics/rules';
import { stepChallenge } from '../simulation/challenge/challenge';
import { create } from 'zustand';
import { buildInitialState } from '../simulation/engine/state';
import { advanceMonth, resolvePending, skipPending, openNextEvent } from '../simulation/engine/step';
import { RNG } from '../simulation/engine/random';
import type { GameState } from '../simulation/types';
import { saveGame, listSaves, loadSave, deleteSave, type SaveRecord } from '../persistence/db';
import { migrateState } from '../persistence/migrate';

export type PageId =
  | 'overview'
  | 'government'
  | 'elections'
  | 'parties'
  | 'parliament'
  | 'economy'
  | 'society'
  | 'diplomacy'
  | 'events'
  | 'map'
  | 'report';

interface Store {
  state: GameState | null;
  rng: RNG | null;
  page: PageId;
  archiveEventId: string | null;
  speed: 0 | 1 | 4 | 12;
  saves: SaveRecord[];
  toast: string | null;
  showStart: boolean;

  start: (scenarioId: string, seed?: number) => void;
  advance: () => void;
  resolve: (choiceId: string) => void;
  skip: () => void;
  setPage: (p: PageId) => void;
  setSpeed: (s: 0 | 1 | 4 | 12) => void;
  save: (name: string) => Promise<void>;
  refreshSaves: () => Promise<void>;
  load: (id: number) => Promise<void>;
  removeSave: (id: number) => Promise<void>;
  setToast: (t: string | null) => void;
  reset: () => void;
  applyPolicy: (policyId: string) => void;
  importGame: (text: string) => void;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const useGame = create<Store>((set, get) => ({
  state: null,
  rng: null,
  page: 'overview',
  archiveEventId: null,
  speed: 0,
  saves: [],
  toast: null,
  showStart: true,

  start: (scenarioId, seed = 19181109) => {
    const rng = new RNG(seed);
    const state = buildInitialState(scenarioId, seed);
    // 起始月份本身也可能有事件（1918 年 11 月），开局即结算，避免被跳过
    openNextEvent(state, rng);
    // 同步 RNG 调用计数，保证存档恢复可复现（WMR-020）
    state.meta.rngCalls = rng.calls;
    set({ state, rng, showStart: false, page: 'overview', speed: 0, toast: '模拟已开始' });
  },

  advance: () => {
    const { state, rng } = get();
    if (!state || !rng) return;
    if (state.pendingEvent) return;
    const next = clone(state);
    const res = advanceMonth(next, rng);
    set({ state: next, ...(next.meta.ended ? { page: 'report' as PageId, speed: 0 as const } : {}) });
    if (res.messages.length) set({ toast: res.messages.join(' ') });
  },

  resolve: (choiceId) => {
    const { state, rng } = get();
    if (!state || !rng || !state.pendingEvent) return;
    const next = clone(state);
    const msgs = resolvePending(next, choiceId, rng);
    next.meta.rngCalls = rng.calls;
    set({ state: next, ...(next.meta.ended ? { page: 'report' as PageId, speed: 0 as const } : {}), toast: msgs.length ? msgs.join(' ') : '决策已记录' });
  },

  skip: () => {
    const { state, rng } = get();
    if (!state || !rng || !state.pendingEvent) return;
    const next = clone(state);
    const msgs = skipPending(next, rng);
    next.meta.rngCalls = rng.calls;
    set({ state: next, ...(next.meta.ended ? { page: 'report' as PageId, speed: 0 as const } : {}), toast: msgs.join(' ') });
  },

  setPage: (page) => set({ page }),
  setSpeed: (speed) => set({ speed }),

  save: async (name) => {
    const { state } = get();
    if (!state) return;
    await saveGame(state, name);
    await get().refreshSaves();
    set({ toast: `已保存：${name}` });
  },

  refreshSaves: async () => {
    try {
      const saves = await listSaves();
      set({ saves });
    } catch {
      set({ saves: [] });
    }
  },

  load: async (id) => {
    const rec = await loadSave(id);
    if (!rec) return;
    // 旧存档迁移：补齐 cursorDate / electionSchedule / challenge 等字段
    const migrated = migrateState(rec.state);
    const rng = new RNG(migrated.meta.seed);
    rng.fastForward(migrated.meta.rngCalls ?? 0);
    set({ state: migrated, rng, showStart: false, page: migrated.meta.ended ? 'report' : 'overview', speed: 0, toast: `已载入：${rec.name}` });
  },

  removeSave: async (id) => {
    await deleteSave(id);
    await get().refreshSaves();
  },

  setToast: (toast) => set({ toast }),
  reset: () => set({ state: null, rng: null, showStart: true, speed: 0 }),

  importGame: (text) => {
    try {
      const state = parseSave(text);
      const rng = new RNG(state.meta.seed); rng.fastForward(state.meta.rngCalls);
      set({ state, rng, showStart: false, speed: 0, page: state.meta.ended ? 'report' : 'overview', toast: '存档已导入' });
    } catch (e) { set({ toast: '导入失败：' + (e instanceof Error ? e.message : '无效存档') }); }
  },
  applyPolicy: (policyId) => {
    const { state } = get();
    if (!state) return;
    if (state.meta.ended) { set({ toast: '模拟已结束，最终状态已冻结' }); return; }
    const next = clone(state);
    const message = enactPolicy(next, policyId);
    stepChallenge(next);
    set({ state: next, toast: message });
  },
}));
