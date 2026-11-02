import { useGame } from '../store/useGame';
import { eventMap } from '../data/events';
import { personMap } from '../data/people';
import { formatDateFull } from '../simulation/engine/date';
import { adaptEventText } from '../simulation/events/adapter';
import { deltaTone, VAR_LABELS } from '../utils/labels';

const CATEGORY_LABELS: Record<string, string> = {
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

export function EventModal() {
  const { state, resolve, skip } = useGame();
  if (!state || !state.pendingEvent) return null;
  const event = eventMap.get(state.pendingEvent.eventId);
  if (!event) return null;
  // 按当前政权/元首/总理/政府改写叙述与选项（WMR-029）
  const adapted = adaptEventText(state, event);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={adapted.title}>
      <div className="event-card">
        <div className="event-head">
          <div className="event-meta">
            <span>{formatDateFull(state.pendingEvent.openedAt)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{CATEGORY_LABELS[event.category] ?? event.category}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{event.importance === 'critical' ? '关键节点' : event.importance === 'major' ? '重要事件' : '一般事件'}</span>
            {event.data_quality !== 'historical_secondary' && event.data_quality !== 'historical_verified' && (
              <span style={{ color: 'var(--smoke)' }}>· 模型推演</span>
            )}
          </div>
          <div className="event-title">{adapted.title}</div>
        </div>

        <div className="event-body">
          <p className="srcline">当前决策将保留结果标记，三个月后结算后续落实；制度变更持续生效，直到被明确改革。</p>
          <p style={{ margin: '0 0 14px' }}>{adapted.background}</p>
          {event.data_quality === 'simulation_derived' && <p className="srcline">由本局状态或此前选择产生的模型事件。</p>}
          {adapted.participants.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--smoke)', marginBottom: 4 }}>
              参与者：
              {adapted.participants.map((p) => personMap.get(p)?.name_zh ?? p).join('、')}
            </div>
          )}
        </div>

        <div style={{ padding: '6px 34px 26px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            你的选择
          </div>
          {adapted.choices.map((c, i) => {
            const isHistorical = !adapted.contextual && event.data_quality !== 'simulation_derived' && c.id === (event.historical_choice_id ?? event.choices[0].id);
            return (
            <button key={c.id} className="choice" onClick={() => resolve(c.id)}>
              <div className="clabel">
                <span className="cnum">{i + 1}</span>
                <span style={{ flex: 1 }}>{c.label}</span>
                {isHistorical && (
                  <span style={{ fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--brass)', border: '1px solid var(--brass-dim)', padding: '0 5px', flex: 'none' }}>
                    史实路径
                  </span>
                )}
              </div>
              <div className="ceffect">
                <b>即时</b>：{c.short_term}
                <br />
                <b>长期</b>：{c.long_term}
              </div>
              {c.vars && Object.keys(c.vars).length > 0 && (
                <div className="ceffect" style={{ paddingLeft: 28, marginTop: 4 }}>
                  {Object.entries(c.vars)
                    .filter(([, v]) => Math.abs(v) >= 1)
                    .slice(0, 5)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          marginRight: 10,
                          color: deltaTone(k,v),
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {VAR_LABELS[k] ?? k} {v > 0 ? '+' : ''}
                        {v}
                      </span>
                    ))}
                </div>
              )}
            </button>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <button className="btn sm" onClick={skip}>
              暂不干预
            </button>
            <span style={{ fontSize: 10.5, color: '#6f6a61' }}>
              {event.allows_counterfactual ? '此节点允许反事实分支' : '此节点为史实固定项，选项仅影响叙述'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
