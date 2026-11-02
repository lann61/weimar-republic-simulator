import { useGame } from '../store/useGame';
import { Panel, Metric, Chip } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { foreignActors } from '../data/world';
import { sourceMap } from '../data/sources';

export function DiplomacyPage() {
  const { state } = useGame();
  if (!state) return null;
  const s = state;
  const snaps = s.snapshots.slice(-84);
  const hasDiplomacy = snaps.some((x) => x.diplomacy);

  const chart = {
    ...chartBase(),
    legend: { show: true, top: 0, textStyle: { color: '#8b877f', fontSize: 10 }, itemWidth: 10, itemHeight: 2 },
    grid: { left: 42, right: 12, top: 28, bottom: 24 },
    xAxis: { ...chartBase().xAxis, data: snaps.map((x) => x.date.slice(2, 7)) },
    yAxis: { ...chartBase().yAxis, max: 100 },
    series: [
      { name: '外交孤立', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.diplomacy?.isolation ?? null), lineStyle: { color: '#a24a55', width: 1.5 } },
      { name: '资本信心', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.diplomacy?.capitalConfidence ?? null), lineStyle: { color: '#b99a62', width: 1.5 } },
      { name: '赔款压力', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.diplomacy?.reparationsPressure ?? null), lineStyle: { color: '#c46a5f', width: 1.5 } },
      { name: '外交信誉', type: 'line', smooth: true, symbol: 'none', data: snaps.map((x) => x.diplomacy?.prestige ?? null), lineStyle: { color: '#6f9e7f', width: 1.5 } },
    ],
  };

  const rel = (v: number) => (v > 30 ? '友好' : v > 0 ? '缓和' : v > -30 ? '紧张' : v > -60 ? '对抗' : '敌对');

  return (
    <>
      <h2 className="page-title">外交与国际</h2>
      <div className="page-sub">赔款、安全、贷款与修订主义 · 德国的外交空间由外部约束与国内政治共同决定</div>

      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Metric label="外交孤立" value={s.diplomacy.isolation.toFixed(0)} bar={s.diplomacy.isolation} tone={s.diplomacy.isolation > 60 ? 'bad' : ''} />
        <Metric label="外交信誉" value={s.diplomacy.prestige.toFixed(0)} bar={s.diplomacy.prestige} />
        <Metric label="赔款压力" value={s.diplomacy.reparationsPressure.toFixed(0)} bar={s.diplomacy.reparationsPressure} />
        <Metric label="资本信心" value={s.diplomacy.capitalConfidence.toFixed(0)} bar={s.diplomacy.capitalConfidence} />
        <Metric label="条约约束" value={s.diplomacy.treatyConstraint.toFixed(0)} bar={s.diplomacy.treatyConstraint} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', marginBottom: 16 }}>
        <Panel title="外交环境轨迹" sub="近 84 个月">
          <Chart option={chart} height={260} />
          {!hasDiplomacy && (
            <div className="srcline" style={{ marginTop: 8 }}>
              旧版本存档缺少外交快照；本图从当前版本开始记录，不使用当前值伪造历史曲线。
            </div>
          )}
        </Panel>
        <Panel title="双边关系" sub="−100 敌对 · 0 中立 · +100 友好">
          {[
            { k: '法国', v: s.diplomacy.relationFrance },
            { k: '英国', v: s.diplomacy.relationBritain },
            { k: '美国', v: s.diplomacy.relationUSA },
            { k: '苏联', v: s.diplomacy.relationUSSR },
            { k: '波兰', v: s.diplomacy.relationPoland },
          ].map((r) => (
            <div key={r.k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>{r.k}</span>
                <span className="num" style={{ color: r.v > 0 ? 'var(--good)' : 'var(--bad)' }}>
                  {r.v.toFixed(0)} · {rel(r.v)}
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', position: 'relative', marginTop: 4 }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(185,154,98,0.25)' }} />
                <div
                  style={{
                    position: 'absolute',
                    left: r.v < 0 ? `${50 + (r.v / 100) * 50}%` : '50%',
                    width: `${Math.abs(r.v) / 2}%`,
                    height: '100%',
                    background: r.v > 0 ? 'var(--good)' : 'var(--bad)',
                  }}
                />
              </div>
            </div>
          ))}
          <div className="deco-divider" style={{ margin: '10px 0 6px' }}>
            <i />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.8 }}>
            国联参与度 {s.diplomacy.leagueParticipation.toFixed(0)} · 裁军约束 {s.diplomacy.disarmamentConstraint.toFixed(0)} · 边境压力{' '}
            {s.diplomacy.borderPressure.toFixed(0)}
          </div>
        </Panel>
      </div>

      <Panel title="国际行为体" sub="目标、依赖与压力结构">
        <table className="data">
          <thead>
            <tr>
              <th>国家/组织</th>
              <th>核心目标</th>
              <th className="num">对德关系</th>
              <th className="num">贸易依赖</th>
              <th className="num">金融敞口</th>
              <th className="num">军事压力</th>
            </tr>
          </thead>
          <tbody>
            {foreignActors.map((a) => (
              <tr key={a.id}>
                <td>{a.name_zh}</td>
                <td style={{ fontSize: 11, color: 'var(--ivory-dim)' }}>{a.goals.join('；')}</td>
                <td className="num">{(a.relation_to_germany * 100).toFixed(0)}</td>
                <td className="num">{(a.trade_dependence * 100).toFixed(0)}%</td>
                <td className="num">{(a.financial_exposure * 100).toFixed(0)}%</td>
                <td className="num">{(a.military_pressure * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="srcline" style={{ marginTop: 10 }}>
          参数为研究型设定（simulation_derived），用于表达外部约束结构，不是对各国政策的精确量化。
        </div>
      </Panel>

      <Panel title="关键条约与安排" sub="史实节点" style={{ marginTop: 16 }}>
        {[
          { d: '1919-06-28', t: '凡尔赛条约', s: '领土、赔款、裁军与战争责任条款；成为右翼宣传核心' },
          { d: '1922-04-16', t: '拉帕洛条约', s: '德苏关系正常化，突破外交孤立' },
          { d: '1924-08-16', t: '道威斯计划', s: '赔款重组与国际贷款，开启“黄金二十年代”' },
          { d: '1925-12-01', t: '洛迦诺公约', s: '承认西部边界，东部边界未获同等保证' },
          { d: '1926-04-24', t: '柏林条约', s: '德苏中立与互不侵犯' },
          { d: '1926-09-10', t: '加入国际联盟', s: '获得常任理事国席位' },
          { d: '1929-08-31', t: '青年计划', s: '赔款总额与期限确定，外国监督逐步结束' },
          { d: '1932-07-09', t: '洛桑会议', s: '赔款实际上被终止' },
        ].map((x) => (
          <div key={x.d} style={{ display: 'flex', gap: 16, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span className="num" style={{ fontSize: 11, color: 'var(--brass)', width: 84 }}>
              {x.d}
            </span>
            <span style={{ fontSize: 12.5, width: 140 }}>{x.t}</span>
            <span style={{ fontSize: 11.5, color: 'var(--smoke)', flex: 1 }}>{x.s}</span>
          </div>
        ))}
        <div className="srcline" style={{ marginTop: 10 }}>
          来源：{['source_bundestag_weimar', 'source_ghdi_dawes'].map((id) => sourceMap.get(id)?.publisher).join('；')}
        </div>
      </Panel>
    </>
  );
}
