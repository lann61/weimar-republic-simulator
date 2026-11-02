import { eventMap } from '../data/events';
import { useGame } from '../store/useGame';
import { Panel, Metric, Chip, Empty } from '../components/ui';
import { buildReport } from '../simulation/engine/ending';
import { partyMap } from '../data/parties';
import { personMap } from '../data/people';
import { headOfState } from '../utils/derive';
import { formatDateFull } from '../simulation/engine/date';
import { downloadSave } from '../persistence/db';
import { ReportSynthesis, ReportHistory } from '../components/ReportAnalysis';

export function ReportPage() {
  const { state, reset } = useGame();
  if (!state) return null;
  const s = state;
  const report = buildReport(s);
  const ended = s.meta.ended;

  return (
    <>
      <h2 className="page-title">结局报告</h2>
      <div className="page-sub">{report.period} · 数据版本 {s.meta.dataVersion} · 种子 {s.meta.seed}</div>

      {report.challenge && (
        <Panel
          title="情景挑战"
          sub={
            report.challenge.status === 'passed'
              ? '挑战达成'
              : report.challenge.status === 'failed'
                ? '挑战失败'
                : '挑战进行中'
          }
          style={{ marginBottom: 16 }}
        >
          {report.challenge.progress.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
              <span>{p.label}</span>
              <span className="num" style={{ color: p.met ? 'var(--good)' : 'var(--bad)' }}>
                {Number.isInteger(p.current) ? p.current : p.current.toFixed(2)} · {p.met ? '已达成' : '未达成'}
              </span>
            </div>
          ))}
          {report.challenge.constraints.length > 0 && (
            <div className="srcline" style={{ marginTop: 8 }}>
              约束：{report.challenge.constraints.map((c) => c.label).join('；')}
            </div>
          )}
          {report.challenge.note && <div className="srcline">{report.challenge.note}</div>}
        </Panel>
      )}

      <Panel
        title={ended ? report.ending.title : '推演进行中：当前制度评估'}
        sub={ended ? '本局最终结局' : '尚未到达时间边界，以下为当前状态评估'}
        right={
          <Chip tone={report.ending.tone === 'positive' ? 'forest' : report.ending.tone === 'negative' ? 'wine' : 'brass'}>
            {ended ? '已终结' : '进行中'}
          </Chip>
        }
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1.6, marginBottom: 10 }}>
          {report.ending.summary}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Chip tone="brass">史实偏离度 {(report.divergence * 100).toFixed(0)}%</Chip>
          <Chip>政府更迭 {s.stats.governmentsFormed} 次</Chip>
          <Chip>第48条 {s.stats.article48Count} 次</Chip>
          <Chip>决策 {s.stats.decisionsMade} 次</Chip>
        </div>
      </Panel>

      <ReportSynthesis analysis={report.analysis}/>

      <div className="grid g3" style={{ marginTop: 16 }}>
        {report.sections.map((sec) => (
          <Panel key={sec.title} title={sec.title}>
            {sec.rows.map((r) => (
              <div key={r.label} className="kv">
                <span className="k">
                  {r.label}
                  {r.note && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 5 }}>{r.note}</span>}
                </span>
                <span className="v">{r.value}</span>
              </div>
            ))}
          </Panel>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
        <Panel title="选举年表" sub="史实基线与推演结果">
          {report.elections.length === 0 ? (
            <Empty text="尚未举行选举" />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>日期</th>
                  <th className="num">投票率</th>
                  <th>前四党</th>
                  <th>组阁</th>
                </tr>
              </thead>
              <tbody>
                {report.elections.map((e) => (
                  <tr key={e.date}>
                    <td className="num" style={{ fontSize: 10.5 }}>
                      {e.date}
                    </td>
                    <td className="num">{e.turnout.toFixed(1)}%</td>
                    <td style={{ fontSize: 10.5, color: 'var(--ivory-dim)' }}>{e.top.join(' · ')}</td>
                    <td style={{ fontSize: 10.5 }}>{e.governmentFormed ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="关键转折" sub="按重要性筛选">
          <div className="timeline">
            {report.keyTurns
              .slice()
              .reverse()
              .map((t, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-date">{t.date}</div>
                  <div style={{ fontSize: 12.5 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--smoke)', lineHeight: 1.6 }}>{t.detail.slice(0, 160)}</div>
                </div>
              ))}
          </div>
        </Panel>
      </div>

      <ReportHistory analysis={report.analysis}/>

      <Panel title="决策记录" sub="本局全部选择与系统处理记录" style={{ marginTop: 16 }}>
        {report.decisions.length === 0 ? (
          <Empty text="尚无决策" />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>日期</th>
                <th>事件</th>
                <th>选择</th>
              </tr>
            </thead>
            <tbody>
              {[...report.decisions].reverse().map((d, i) => (
                <tr key={i}>
                  <td className="num" style={{ fontSize: 10.5 }}>
                    {d.date}
                  </td>
                  <td style={{ fontSize: 11.5 }}><button className="linkish" onClick={() => { useGame.setState({ archiveEventId: d.eventId, page: 'events' }); }}>{d.title === d.eventId ? eventMap.get(d.eventId)?.title ?? d.title : d.title}</button></td>
                  <td style={{ fontSize: 11.5, color: 'var(--brass)' }}>{d.label}{d.automatic ? '（系统处理）' : '（玩家选择）'}{d.longTerm && <div className="srcline">后续：{d.longTerm}</div>}{d.causes?.length ? <div className="srcline">前因：{d.causes.join('；')}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button className="btn" onClick={() => downloadSave(s)}>
          导出本局存档（JSON）
        </button>
        <button className="btn" onClick={reset}>
          返回开始界面
        </button>
      </div>

      <div className="srcline" style={{ marginTop: 24, lineHeight: 1.9 }}>
        本报告中的制度与社会指标为模拟模型输出（simulation_derived），不是历史机构评分。
        史实数据（选举结果、内阁名单、人物生平）均标注来源；模型推演结果不冒充史料。
        <br />
        当前{headOfState(s).title}：{headOfState(s).name} · 末任总理：{personMap.get(s.government.chancellorId)?.name_zh} · 末届国会第一大党：
        {(() => {
          const top = Object.entries(s.parties).sort((a, b) => b[1].seats - a[1].seats)[0];
          return top ? `${partyMap.get(top[0])?.short_name}（${top[1].seats} 席）` : '—';
        })()}
        <br />
        © Eumenes — Weimar Republic: The Fall of Democracy. {ended ? '模拟结束于' : '当前推演至'} {formatDateFull(s.cursorDate ?? s.date)}。
      </div>
    </>
  );
}
