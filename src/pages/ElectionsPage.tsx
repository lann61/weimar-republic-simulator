import { useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Metric, Chip, Empty, Tabs } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { elections as historicalElections } from '../data/elections';
import { partyMap, parties } from '../data/parties';
import { personMap } from '../data/people';
import { formatDateFull } from '../simulation/engine/date';

type Tab = 'current' | 'history' | 'presidential';

export function ElectionsPage() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>('current');
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;
  const s = state;

  const all = useMemo(() => {
    const map = new Map<string, (typeof historicalElections)[number] & { played?: boolean }>();
    for (const e of historicalElections) map.set(e.id, { ...e, played: false });
    for (const e of s.elections) {
      map.set(e.id, {
        id: e.id,
        date: e.date,
        type: e.type as 'reichstag' | 'national_assembly' | 'presidential' | 'referendum',
        label_zh: e.label,
        total_seats: e.totalSeats,
        turnout_rate: e.turnout,
        fairness: e.fairness,
        results: e.results.map((r) => ({
          party_id: r.partyId,
          party_name_at_election: partyMap.get(r.partyId)?.short_name ?? r.partyId,
          votes: r.votes,
          vote_share: r.share,
          seats: r.seats,
          data_quality: r.isSimulated ? 'simulation_derived' as const : 'historical_secondary' as const,
        })),
        environment_note: e.note,
        other_seats: e.otherSeats,
        other_vote_share: e.otherVoteShare,
        historical_outcome: '',
        source_ids: [],
        data_quality: 'historical_secondary' as const,
        played: true,
      });
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [s.elections]);

  const active = all.find((e) => e.id === selected) ?? all.find((e) => e.played) ?? all.filter(e => e.date <= (s.cursorDate ?? s.date))[0];

  const chartOption = useMemo(() => {
    const played = [...s.elections].sort((a, b) => (a.date < b.date ? -1 : 1));
    const dates = played.map((e) => e.date.slice(2, 7));
    const major = ['spd', 'nsdap', 'kpd', 'zentrum', 'dnvp', 'dvp', 'ddp', 'dstp'];
    return {
      ...chartBase(),
      legend: { show: true, top: 0, textStyle: { color: '#8b877f', fontSize: 10 }, itemWidth: 10, itemHeight: 2 },
      grid: { left: 40, right: 12, top: 40, bottom: 24 },
      xAxis: { ...chartBase().xAxis, data: dates },
      yAxis: { ...chartBase().yAxis, max: 45, name: '得票率 %', nameTextStyle: { color: '#8b877f', fontSize: 10 } },
      series: major
        .filter((p) => played.some((e) => e.results.some((r) => r.partyId === p && r.share > 0.3)))
        .map((p) => ({
          name: partyMap.get(p)?.short_name,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          data: played.map((e) => e.results.find((r) => r.partyId === p)?.share ?? 0),
          lineStyle: { width: 1.5, color: partyMap.get(p)?.color },
          itemStyle: { color: partyMap.get(p)?.color },
        })),
    };
  }, [s.elections]);

  return (
    <>
      <h2 className="page-title">选举中心</h2>
      <div className="page-sub">史实选举结果与反事实模拟结果严格分开 · 比例代表制与两级席位分配</div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Metric label="已举行全国选举" value={s.stats.electionsHeld} small />
        <Metric label="最近选举" value={s.lastElectionDate ?? '—'} small />
        <Metric label="当前国会席位" value={s.parliamentSeatsTotal} small />
        <Metric label="史实锚定强度" value={`${(anchorPct(s) * 100).toFixed(0)}%`} small delta={s.meta.mode === 'free' ? '自由模拟：无锚定' : '偏离越大锚定越弱'} />
      </div>

      <Tabs
        tabs={[
          { id: 'current', label: '选举详情' },
          { id: 'history', label: '历次选举' },
          { id: 'presidential', label: '总统选举与公投' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'current' && (
        <>
        {s.elections.length === 0 && (
          <div
            style={{
              border: '1px solid var(--line)',
              borderLeft: '2px solid var(--brass)',
              padding: '10px 16px',
              marginBottom: 14,
              fontSize: 12,
              color: 'var(--ivory-dim)',
              background: 'rgba(185,154,98,0.05)',
            }}
          >
            本局尚未举行全国选举。下方显示的是当前日期之前的史实选举记录（标记为“史实记录”），用于对照；推进时间至选举月份后，本局结果会另行记录。
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
          <Panel
            title={active ? `${active.label_zh} · ${formatDateFull(active.date)}` : '无选举'}
            sub={active ? `总席位 ${active.total_seats} · 投票率 ${active.turnout_rate.toFixed(1)}%` : ''}
            right={active ? <Chip tone={active.played ? 'brass' : undefined}>{active.played ? '本局已发生' : '史实记录'}</Chip> : null}
          >
            {active ? (
              <>
                <table className="data">
                  <thead>
                    <tr>
                      <th>政党</th>
                      <th className="num">得票率</th>
                      <th className="num">席位</th>
                      <th className="num">票数</th>
                      <th className="num">较上次</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...active.results]
                      .sort((a, b) => b.seats - a.seats)
                      .map((r) => {
                        const prev = previousResult(all, active.date, r.party_id);
                        const diff = prev !== null ? r.vote_share - prev : null;
                        return (
                          <tr key={r.party_id}>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span className="dot" style={{ background: partyMap.get(r.party_id)?.color ?? '#888' }} />
                                {partyMap.get(r.party_id)?.short_name ?? r.party_id}
                              </span>
                            </td>
                            <td className="num">{r.vote_share.toFixed(1)}%</td>
                            <td className="num">{r.seats}</td>
                            <td className="num" style={{ fontSize: 11 }}>
                              {r.votes ? r.votes.toLocaleString('zh-CN') : '史料未提供'}
                            </td>
                            <td className="num" style={{ fontSize: 11, color: diff === null ? '#6f6a61' : diff > 0 ? 'var(--good)' : 'var(--bad)' }}>
                              {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {active.other_seats ? (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--smoke)' }}>
                    其他政党/独立议员：{active.other_seats} 席
                    {active.other_vote_share != null ? `（${active.other_vote_share.toFixed(1)}%）` : ''}
                  </div>
                ) : null}
                <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.8 }}>
                  {active.environment_note}
                </div>
              </>
            ) : (
              <Empty text="尚未举行选举" />
            )}
          </Panel>

          <Panel title="得票率演变" sub="仅显示本局已发生的选举">
            {s.elections.length > 1 ? <Chart option={chartOption} height={300} /> : <Empty text="至少需要两次选举才能显示趋势" />}
          </Panel>
        </div>
        </>
      )}

      {tab === 'history' && (
        <Panel title="全国选举史" sub="点击查看详情">
          <table className="data">
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th className="num">总席位</th>
                <th className="num">投票率</th>
                <th className="num">公平性</th>
                <th>第一大党</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {all
                .filter((e) => e.type !== 'presidential' && e.type !== 'referendum')
                .map((e) => {
                  const top = [...e.results].sort((a, b) => b.seats - a.seats)[0];
                  return (
                    <tr key={e.id} onClick={() => setSelected(e.id)} style={{ cursor: 'pointer' }}>
                      <td className="num" style={{ fontSize: 11 }}>
                        {e.date}
                      </td>
                      <td>{e.label_zh}</td>
                      <td className="num">{e.total_seats}</td>
                      <td className="num">{e.turnout_rate.toFixed(1)}%</td>
                      <td className="num">{(e.fairness * 100).toFixed(0)}%</td>
                      <td style={{ fontSize: 11.5 }}>
                        {partyMap.get(top?.party_id ?? '')?.short_name} {top?.seats}席
                      </td>
                      <td>
                        {e.played ? <Chip tone="brass">本局</Chip> : <Chip>史实</Chip>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <div className="srcline" style={{ marginTop: 10 }}>
            数据来源：Konrad-Adenauer-Stiftung 选举统计、德国联邦档案馆魏玛选举展、GHDI 选举地图；1919年席位口径差异见说明。
          </div>
        </Panel>
      )}

      {tab === 'presidential' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Panel title="总统选举" sub="1925 与 1932">
            {historicalElections
              .filter((e) => e.type === 'presidential')
              .map((e) => (
                <div key={e.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, color: 'var(--ivory)' }}>
                    {formatDateFull(e.date)} · 投票率 {e.turnout_rate}%
                  </div>
                  <table className="data" style={{ marginTop: 6 }}>
                    <thead>
                      <tr>
                        <th>候选人</th>
                        <th>党派</th>
                        <th className="num">第一轮</th>
                        <th className="num">第二轮</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.presidential?.candidates.map((c) => (
                        <tr key={c.person_id}>
                          <td>{personMap.get(c.person_id)?.name_zh ?? c.name_zh}</td>
                          <td style={{ fontSize: 11.5 }}>{c.party_id ? partyMap.get(c.party_id)?.short_name : '无党派'}</td>
                          <td className="num">{c.round1 ? `${c.round1}%` : '—'}</td>
                          <td className="num">{c.round2 ? `${c.round2}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 11.5, color: 'var(--smoke)', marginTop: 6, lineHeight: 1.7 }}>{e.environment_note}</div>
                </div>
              ))}
          </Panel>

          <Panel title="全民公投" sub="1926 王室财产 · 1929 反对青年计划">
            {historicalElections
              .filter((e) => e.type === 'referendum')
              .map((e) => (
                <div key={e.id} style={{ marginBottom: 16, borderBottom: '1px solid var(--line-soft)', paddingBottom: 12 }}>
                  <div style={{ fontSize: 13 }}>{e.label_zh}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--brass)' }}>{formatDateFull(e.date)} · 投票率 {e.turnout_rate}%</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ivory-dim)', marginTop: 4, lineHeight: 1.7 }}>{e.historical_outcome}</div>
                </div>
              ))}
            <div className="srcline">公投结果不改变国会席位，但会改变政党声望与政治议程。</div>
          </Panel>
        </div>
      )}
    </>
  );
}

function previousResult(all: { date: string; results: { party_id: string; vote_share: number }[] }[], date: string, partyId: string): number | null {
  const prior = all
    .filter((e) => e.date < date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!prior) return null;
  const r = prior.results.find((x) => x.party_id === partyId);
  return r ? r.vote_share : null;
}

function anchorPct(s: { meta: { mode: string; divergence: number } }) {
  if (s.meta.mode === 'free' || s.meta.mode === 'challenge') return 0;
  const base = s.meta.mode === 'historical' ? 0.92 : 0.85;
  return Math.max(0, Math.min(base, base - s.meta.divergence * 1.3));
}
