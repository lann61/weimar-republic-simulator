import { useEffect, useState } from 'react';
import { useGame } from '../store/useGame';
import { scenarios } from '../data/scenarios';
import { formatDateFull } from '../simulation/engine/date';
import { eventCount } from '../data/events';
import { people } from '../data/people';
import { APP_VERSION } from '../version';

export function StartScreen() {
  const { start, saves, refreshSaves, load, importGame } = useGame();
  const [selected, setSelected] = useState('sc_intervention');
  const [seed, setSeed] = useState('19181109');

  useEffect(() => {
    refreshSaves();
  }, [refreshSaves]);

  return (
    <div className="start-screen">
      <div className="start-left">
        <div className="eyebrow" style={{ letterSpacing: '0.34em' }}>
          A POLITICAL CIVILIZATION SIMULATOR
        </div>
        <div style={{ fontSize: 10, color: 'var(--smoke)', marginTop: 4, letterSpacing: '0.12em' }}>
          构建 {APP_VERSION}
        </div>
        <h1 className="start-title">
          魏玛共和国
          <br />
          <span>民主的兴衰</span>
        </h1>
        <div style={{ fontSize: 13, color: 'var(--smoke)', maxWidth: 520, lineHeight: 1.9, marginTop: 8 }}>
          1918年11月，帝国崩溃。一个国家在革命的废墟上建立起当时最先进的民主宪法，
          十四年后，这套制度被它自己的法律程序、精英交易与街头暴力逐条拆除。
          <br />
          <br />
          你不是某一位领袖。你是这个共和国的政治观察者与国家治理协调者：
          在关键节点选择政策、妥协与联盟，其余的一切由选民、政党、军队、资本与国际环境自行演化。
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 34 }}>
          <div>
            <div className="num" style={{ fontSize: 26, color: 'var(--brass)' }}>
              {eventCount}
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--smoke)' }}>历史事件与决策节点</div>
          </div>
          <div>
            <div className="num" style={{ fontSize: 26, color: 'var(--brass)' }}>
              {people.length}
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--smoke)' }}>真实历史人物</div>
          </div>
          <div>
            <div className="num" style={{ fontSize: 26, color: 'var(--brass)' }}>
              1918—1934
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--smoke)' }}>月度模拟周期</div>
          </div>
        </div>

        <button
          className="btn sm"
          style={{ marginTop: 30 }}
          onClick={() => {
            try {
              localStorage.removeItem('weimar_prologue_seen');
            } catch {
              /* ignore */
            }
            window.dispatchEvent(new Event('weimar:show-prologue'));
          }}
        >
          ↺ 回到序章（历史重新）
        </button>

        <div className="srcline" style={{ marginTop: 44, maxWidth: 520, lineHeight: 1.8 }}>
          © Eumenes. Weimar Republic — The Fall of Democracy.
          <br />
          Historical simulation and educational project.
        </div>
      </div>

      <div className="start-right">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          选择模式与起始局势
        </div>
        {scenarios.map((s) => (
          <div key={s.id} className={`scenario ${selected === s.id ? 'selected' : ''}`} onClick={() => setSelected(s.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div className="sname">{s.name_zh}</div>
              <div style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--brass)' }}>
                {formatDateFull(s.start_date)}
              </div>
            </div>
            <div className="sdesc">{s.description}</div>
            {s.objective && (
              <div className="sdesc" style={{ color: 'var(--warn)', marginTop: 6 }}>
                目标：{s.objective}
              </div>
            )}
          </div>
        ))}

        <div style={{ height: 72 }} />
        <div className="start-action">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--smoke)', marginBottom: 4 }}>随机种子（可复现）</div>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
              className="num"
              style={{
                width: '100%',
                background: '#131211',
                border: '1px solid var(--line)',
                color: 'var(--ivory)',
                padding: '9px 12px',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
          <button
            className="btn solid"
            onClick={() => start(selected, Number(seed) || 19181109)}
          >
            开始历史进程
          </button>
        </div>

        <label className="btn sm" style={{ display: 'inline-block', marginTop: 18, cursor: 'pointer' }}>
          导入 JSON 存档
          <input aria-label="导入 JSON 存档" type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={async e => {
            const file = e.target.files?.[0];
            if (file) { try { importGame(await file.text()); } catch { useGame.getState().setToast('无法读取存档文件'); } }
            e.target.value = '';
          }} />
        </label>
        {saves.length > 0 && (
          <>
            <div className="deco-divider" style={{ margin: '24px 0 14px' }}>
              <i />
            </div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              本地存档
            </div>
            {saves.map((s) => (
              <div
                key={s.id}
                className="scenario"
                onClick={() => s.id && load(s.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div className="sname" style={{ fontSize: 13 }}>
                    {s.name}
                  </div>
                  <div className="sdesc">
                    {formatDateFull(s.date)} · {s.mode} · 数据版本 {s.dataVersion}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--brass)' }}>载入 →</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
