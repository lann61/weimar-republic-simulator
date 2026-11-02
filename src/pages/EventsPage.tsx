import { useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Chip, Empty } from '../components/ui';
import { events, eventMap } from '../data/events';
import { personMap } from '../data/people';
import { formatDateFull, PHASE_LABELS } from '../simulation/engine/date';

const CATEGORIES: Record<string, string> = {
  all: '全部',
  revolution: '革命',
  constitution: '宪法',
  election: '选举',
  government_crisis: '政府危机',
  economy: '经济',
  diplomacy: '外交',
  violence: '政治暴力',
  society: '社会',
  culture: '文化',
  institution: '制度',
  elite: '精英网络',
};

export function EventsPage() {
  const { state } = useGame();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(useGame.getState().archiveEventId);
  if (!state) return null;
  const s = state;
  const fired = new Set(s.firedEvents);

  const list = useMemo(() => {
    return events.filter((e) => {
      if (cat !== 'all' && e.category !== cat) return false;
      if (q && !e.title.includes(q)) return false;
      return true;
    });
  }, [cat, q]);

  const byYear = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const e of list) {
      const y = e.date.slice(0, 4);
      const arr = map.get(y) ?? [];
      arr.push(e);
      map.set(y, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [list]);

  const open = openId ? eventMap.get(openId) : null;
  const decision = openId ? s.decisions.slice().reverse().find((d) => d.eventId === openId) : null;

  return (
    <>
      <h2 className="page-title">事件档案</h2>
      <div className="page-sub">
        {events.length} 个历史节点与条件事件 · 已发生 {fired.size} 个 · 决策 {s.decisions.length} 次
      </div>

      <Panel
        title="档案检索"
        sub="按类别与关键词筛选"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ background: '#131211', border: '1px solid var(--line)', color: 'var(--ivory)', padding: '4px 8px', fontSize: 11 }}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索事件标题"
              style={{ background: '#131211', border: '1px solid var(--line)', color: 'var(--ivory)', padding: '4px 10px', fontSize: 11.5, width: 170, outline: 'none' }}
            />
          </div>
        }
      >
        <div style={{ maxHeight: 620, overflowY: 'auto' }}>
          {byYear.map(([year, evs]) => (
            <div key={year} style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {year} · {PHASE_LABELS[evs[0].phase]}
              </div>
              {evs.map((e) => {
                const isFired = fired.has(e.id);
                return (
                  <div
                    key={e.id}
                    onClick={() => setOpenId(e.id)}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'baseline',
                      padding: '7px 8px',
                      borderBottom: '1px solid rgba(185,154,98,0.07)',
                      cursor: 'pointer',
                      opacity: isFired ? 1 : 0.55,
                    }}
                  >
                    <span className="num" style={{ fontSize: 10.5, color: 'var(--brass)', width: 78 }}>
                      {e.date.slice(5)}
                    </span>
                    <span style={{ fontSize: 12.5, flex: 1 }}>{e.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--smoke)', width: 70 }}>{CATEGORIES[e.category]}</span>
                    {e.importance === 'critical' && <Chip tone="wine">关键</Chip>}
                    <span style={{ fontSize: 10, width: 46, textAlign: 'right', color: isFired ? 'var(--good)' : '#6f6a61' }}>
                      {isFired ? '已发生' : e.date > (s.cursorDate ?? s.date) ? '尚未到期' : s.flags['blocked_' + e.id] ? '条件不成立' : s.evaluatedEvents?.[e.id] ? '未触发' : '未发生'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {list.length === 0 && <Empty text="没有匹配的事件" />}
        </div>
      </Panel>

      {open && (
        <div className="overlay" onClick={() => setOpenId(null)}>
          <div className="event-card" onClick={(e) => e.stopPropagation()}>
            <div className="event-head">
              <div className="event-meta">
                <span>{formatDateFull(open.date)}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{CATEGORIES[open.category]}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{open.data_quality}</span>
              </div>
              <div className="event-title">{decision?.title ?? open.title}</div>
            </div>
            <div className="event-body">
              <p>{open.background}</p><p className="srcline">上方为原始史实背景或模型设定；本局实际结果见决策记录。</p>
              {open.participants.length > 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--smoke)' }}>
                  参与者：{open.participants.map((p) => personMap.get(p)?.name_zh ?? p).join('、')}
                </p>
              )}
              <div className="deco-divider">
                <i />
              </div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                史实结果
              </div>
              <p style={{ color: 'var(--ivory)' }}>{open.historical_outcome}</p>

              {decision && (
                <>
                  <div className="eyebrow" style={{ marginBottom: 6, marginTop: 14 }}>
                    本局决策
                  </div>
                  <p style={{ color: 'var(--brass)' }}>
                    {decision.label}
                    {decision.longTerm && <span style={{ display: 'block' }}>后续：{decision.longTerm}</span>}
                    {decision.causes?.map(c => <span key={c} style={{ display: 'block' }}>前因：{c}</span>)}
                    {open.historical_choice_id && decision.choiceId !== open.historical_choice_id ? '（偏离史实路径）' : '（与史实一致）'}
                  </p>
                </>
              )}

              <div className="eyebrow" style={{ marginBottom: 6, marginTop: 14 }}>
                选项结构
              </div>
              {open.choices.map((c) => (
                <div key={c.id} style={{ fontSize: 12, color: 'var(--ivory-dim)', marginBottom: 8 }}>
                  <b style={{ color: 'var(--ivory)' }}>{c.label}</b> — {c.short_term}
                </div>
              ))}
            </div>
            <div style={{ padding: '0 34px 24px' }}>
              <button className="btn sm" onClick={() => setOpenId(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
