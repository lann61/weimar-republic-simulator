import { useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Metric, Chip, Tabs } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { voterGroups } from '../data/voterGroups';
import { organizations } from '../data/world';
import { partyMap } from '../data/parties';
import { explainMetric, type CauseItem } from '../simulation/explainability/causes';

export function SocietyPage() {
  const { state } = useGame();
  const [tab, setTab] = useState<'groups' | 'order' | 'orgs'>('groups');
  const [cause, setCause] = useState<{ title: string; items: CauseItem[] } | null>(null);
  if (!state) return null;
  const s = state;
  const snaps = s.snapshots.slice(-84);

  const chart = {
    ...chartBase(),
    legend: { show: true, top: 0, textStyle: { color: '#8b877f', fontSize: 10 }, itemWidth: 10, itemHeight: 2 },
    grid: { left: 40, right: 12, top: 28, bottom: 24 },
    xAxis: { ...chartBase().xAxis, data: snaps.map((x) => x.date.slice(2, 7)) },
    yAxis: { ...chartBase().yAxis, max: 100 },
    series: [
      { name: '社会极化', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.society.polarization ?? 0), lineStyle: { color: '#a24a55', width: 1.6 } },
      { name: '政治暴力', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.society.violence ?? 0), lineStyle: { color: '#c46a5f', width: 1.4 } },
      { name: '社会信任', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.society.socialTrust ?? 0), lineStyle: { color: '#6f9e7f', width: 1.6 } },
      { name: '共和国认同', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.society.republicSupport ?? 0), lineStyle: { color: '#b99a62', width: 1.6 } },
    ],
  };

  const topPartyOf = (gid: string) => {
    const gs = s.voterGroups[gid];
    if (!gs) return null;
    const entries = Object.entries(gs.affinity).sort((a, b) => b[1] - a[1]);
    return entries[0] ? partyMap.get(entries[0][0]) : null;
  };

  return (
    <>
      <h2 className="page-title">社会与秩序</h2>
      <div className="page-sub">16 个选民群体 · 极化、暴力、信任与文化 · 组织化社会</div>

      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Metric label="生活满意度" value={s.society.satisfaction.toFixed(0)} bar={s.society.satisfaction} />
        <Metric
          label="社会极化"
          value={s.society.polarization.toFixed(0)}
          bar={s.society.polarization}
          tone={s.society.polarization > 65 ? 'bad' : ''}
          onClick={() => setCause({ title: '社会极化', items: explainMetric(s, 'society.polarization') })}
        />
        <Metric
          label="政治暴力"
          value={s.society.violence.toFixed(0)}
          bar={s.society.violence}
          tone={s.society.violence > 60 ? 'bad' : ''}
          onClick={() => setCause({ title: '政治暴力', items: explainMetric(s, 'society.violence') })}
        />
        <Metric label="新闻自由" value={s.society.mediaFreedom.toFixed(0)} bar={s.society.mediaFreedom} />
        <Metric label="贫困率" value={s.society.poverty.toFixed(0)} bar={s.society.poverty} />
      </div>

      <Tabs
        tabs={[
          { id: 'groups', label: '选民群体' },
          { id: 'order', label: '秩序与情绪' },
          { id: 'orgs', label: '社会组织' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'groups' && (
        <Panel title="选民群体与党派亲和" sub="群体权重 × 投票率决定选举结果；亲和度为模型参数">
          <table className="data">
            <thead>
              <tr>
                <th>群体</th>
                <th className="num">选民占比</th>
                <th className="num">投票率</th>
                <th className="num">满意度</th>
                <th className="num">疏离感</th>
                <th>最强亲和政党</th>
                <th>核心诉求</th>
              </tr>
            </thead>
            <tbody>
              {voterGroups.map((g) => {
                const gs = s.voterGroups[g.id];
                const top = topPartyOf(g.id);
                return (
                  <tr key={g.id}>
                    <td>{g.name_zh}</td>
                    <td className="num">{(g.weight * 100).toFixed(0)}%</td>
                    <td className="num">{gs ? gs.turnout.toFixed(0) : '—'}%</td>
                    <td className="num">{gs ? gs.satisfaction.toFixed(0) : '—'}</td>
                    <td className="num">{gs ? gs.alienation.toFixed(0) : '—'}</td>
                    <td>
                      {top && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className="dot" style={{ background: top.color }} />
                          {top.short_name}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 10.5, color: 'var(--smoke)' }}>{topIssue(g.sensitivity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === 'order' && (
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
          <Panel title="社会情绪轨迹" sub="近 84 个月">
            <Chart option={chart} height={300} />
          </Panel>
          <Panel title="秩序指标" sub="政治暴力与国家能力">
            <div className="grid g2" style={{ gap: 10 }}>
              <Metric label="罢工频率" value={s.society.strikes.toFixed(0)} bar={s.society.strikes} />
              <Metric label="抗议频率" value={s.society.protests.toFixed(0)} bar={s.society.protests} />
              <Metric label="政治谋杀风险" value={s.society.politicalMurders.toFixed(0)} bar={s.society.politicalMurders} />
              <Metric label="排外与反犹传播" value={s.society.antisemitism.toFixed(0)} bar={s.society.antisemitism} />
              <Metric label="女性社会参与" value={s.society.womenParticipation.toFixed(0)} bar={s.society.womenParticipation} />
              <Metric label="文化自由" value={s.society.culturalFreedom.toFixed(0)} bar={s.society.culturalFreedom} />
            </div>
            <div className="deco-divider" style={{ margin: '12px 0 8px' }}>
              <i />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.8 }}>
              累计暴力死亡（模型估算）：<span className="num" style={{ color: 'var(--ivory)' }}>{Math.round(s.society.violenceDeaths)}</span> 人。
              <br />
              该数字为模型推演值，不是史料统计。
            </div>
          </Panel>
        </div>
      )}

      {tab === 'orgs' && (
        <Panel title="社会组织与准军事团体" sub="组织化社会是共和国韧性与暴力的双重来源">
          <table className="data">
            <thead>
              <tr>
                <th>组织</th>
                <th>类型</th>
                <th>政治归属</th>
                <th className="num">估算成员</th>
                <th className="num">暴力参与</th>
                <th className="num">影响力</th>
                <th>存续</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.name_zh}
                    <div style={{ fontSize: 10, color: '#6f6a61', fontStyle: 'italic' }}>{o.name_de}</div>
                  </td>
                  <td style={{ fontSize: 11 }}>{orgType(o.type)}</td>
                  <td style={{ fontSize: 11.5 }}>
                    {o.alignment === 'neutral' ? '中立' : partyMap.get(o.alignment)?.short_name ?? o.alignment}
                  </td>
                  <td className="num">{o.members_estimate ? o.members_estimate.toLocaleString('zh-CN') : '—'}</td>
                  <td className="num">{(o.violence_participation * 100).toFixed(0)}%</td>
                  <td className="num">{(o.influence * 100).toFixed(0)}</td>
                  <td style={{ fontSize: 10.5, color: 'var(--smoke)' }}>
                    {o.active_from.slice(0, 4)}–{o.active_to?.slice(0, 4) ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="srcline" style={{ marginTop: 10 }}>
            成员数为历史研究估算（historical_estimate），不是精确统计。
          </div>
        </Panel>
      )}

      {cause && (
        <div className="overlay" onClick={() => setCause(null)}>
          <div className="event-card" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="event-head">
              <div className="event-meta">指标变化追踪 · 模拟模型</div>
              <div className="event-title" style={{ fontSize: 22 }}>
                {cause.title}
              </div>
            </div>
            <div style={{ padding: '18px 34px 26px' }}>
              {cause.items.map((c) => (
                <div key={c.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{c.label}</span>
                    <span className="num">{c.measured ? (c.delta! > 0 ? '+' : '') + c.delta!.toFixed(3) : '机制说明'}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.7 }}>{c.detail}</div>
                </div>
              ))}
              <button className="btn sm" onClick={() => setCause(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function topIssue(s: { unemployment: number; inflation: number; wages: number; security: number; welfare: number; nationalism: number; religion: number }) {
  const entries = Object.entries(s).sort((a, b) => b[1] - a[1]);
  const map: Record<string, string> = {
    unemployment: '就业',
    inflation: '物价稳定',
    wages: '工资',
    security: '安全与秩序',
    welfare: '社会保障',
    nationalism: '民族地位',
    religion: '宗教与传统',
  };
  return entries.slice(0, 2).map(([k]) => map[k]).join(' · ');
}

function orgType(t: string) {
  const map: Record<string, string> = {
    union: '工会',
    employer: '雇主组织',
    veteran: '退伍军人',
    paramilitary: '准军事',
    religious: '宗教',
    youth: '青年',
    women: '妇女',
    press: '报业',
    culture: '文化',
    agriculture: '农业',
  };
  return map[t] ?? t;
}
