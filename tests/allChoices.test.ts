import { describe, expect, it } from 'vitest';
import { events } from '../src/data/events';
import { buildInitialState, getPath, defaultBoundsFor } from '../src/simulation/engine/state';
import { applyChoice } from '../src/simulation/events/engine';
import { RNG } from '../src/simulation/engine/random';

describe('全量事件/选项遍历（任务书 5.3）', () => {
  it('每个事件的每个选项都能应用，状态路径有效且不越界', () => {
    const rng = new RNG(1);
    let count = 0;
    for (const ev of events) {
      for (const choice of ev.choices) {
        const state = buildInitialState('sc_historical', 1);
        state.date = ev.date;
        state.cursorDate = ev.date;
        const res = applyChoice(state, ev.id, choice.id, rng);
        expect(res.ok, `${ev.id}/${choice.id} 未成功应用`).toBe(true);

        // vars/set 路径必须存在于 state（防止字段名拼写错误导致效果静默丢失）
        for (const path of [...Object.keys(choice.effects.vars ?? {}), ...Object.keys(choice.effects.set ?? {})]) {
          const [section, key] = path.split('.');
          const obj = (state as unknown as Record<string, Record<string, number>>)[section];
          expect(obj, `${ev.id}/${choice.id} 段 ${section} 不存在`).toBeTruthy();
          expect(obj[key], `${ev.id}/${choice.id} 路径 ${path} 不存在`).not.toBeUndefined();
        }

        // 应用后的值必须在合法范围内
        for (const path of Object.keys(choice.effects.vars ?? {})) {
          const v = getPath(state, path);
          const [lo, hi] = defaultBoundsFor(path);
          expect(Number.isFinite(v), `${ev.id}/${choice.id} ${path} 非数值`).toBe(true);
          expect(v, `${ev.id}/${choice.id} ${path}=${v} 低于 ${lo}`).toBeGreaterThanOrEqual(lo - 1e-6);
          expect(v, `${ev.id}/${choice.id} ${path}=${v} 高于 ${hi}`).toBeLessThanOrEqual(hi + 1e-6);
        }
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(372);
  });
});
