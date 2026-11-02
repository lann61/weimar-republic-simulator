import { useGame } from '../store/useGame';
import { formatDate, phaseLabel } from '../simulation/engine/date';
import { anchorWeight } from '../simulation/elections/run';
import { personMap } from '../data/people';
import { APP_VERSION } from '../version';

export function TopBar() {
  const { state, speed, setSpeed, advance, save } = useGame();
  if (!state) return null;

  const anchor = anchorWeight(state);
  const chancellor = personMap.get(state.government.chancellorId);

  return (
    <header className="topbar">
      <div className="date-block">
        <div>
          <div className="eyebrow" style={{ fontSize: 9 }}>
            {state.meta.mode === 'historical'
              ? '历史观察模式'
              : state.meta.mode === 'intervention'
                ? '历史干预模式'
                : state.meta.mode === 'free'
                  ? '自由模拟模式'
                  : '情景挑战模式'}
          </div>
          <div className="date">{formatDate(state.cursorDate ?? state.date)}</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
          <div className="phase">{phaseLabel(state.date)}</div>
          <div style={{ fontSize: 11, color: 'var(--smoke)', marginTop: 1 }}>
            总理 {chancellor?.name_zh ?? '—'} · 史实锚定 {(anchor * 100).toFixed(0)}% · v{APP_VERSION}
          </div>
        </div>
      </div>

      <div className="speed-group">
        <button className={`speed-btn step`} onClick={advance} disabled={state.meta.ended || !!state.pendingEvent} title="推进一个月">
          ▶ 月
        </button>
        <button className={`speed-btn ${speed === 0 ? 'active' : ''}`} onClick={() => setSpeed(0)}>
          暂停
        </button>
        <button className={`speed-btn ${speed === 1 ? 'active' : ''}`} disabled={state.meta.ended} onClick={() => setSpeed(1)}>
          1×
        </button>
        <button className={`speed-btn ${speed === 4 ? 'active' : ''}`} disabled={state.meta.ended} onClick={() => setSpeed(4)}>
          4×
        </button>
        <button className={`speed-btn ${speed === 12 ? 'active' : ''}`} disabled={state.meta.ended} onClick={() => setSpeed(12)}>
          12×
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 6px' }} />
        <button className="speed-btn" onClick={() => save(`${formatDate(state.date)} 存档`)} title="保存到本地">
          存档
        </button>
      </div>
    </header>
  );
}
