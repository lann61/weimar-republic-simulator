import { useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Metric, Chip, Tabs } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { policies } from '../data/policies';
import { explainMetric, type CauseItem } from '../simulation/explainability/causes';

export function EconomyPage() {
  const { state, applyPolicy } = useGame();
  const [cause, setCause] = useState<{ title: string; items: CauseItem[] } | null>(null);
  const [tab, setTab] = useState<'overview' | 'fiscal' | 'policy'>('overview');
  if (!state) return null;
  const s = state;
  const snaps = s.snapshots.slice(-84);
  const dates = snaps.map((x) => x.date.slice(2, 7));

  const line = (name: string, data: number[], color: string, yIndex = 0) => ({
    name,
    type: 'line',
    smooth: true,
    symbol: 'none',
    yAxisIndex: yIndex,
    data,
    lineStyle: { color, width: 1.6 },
    itemStyle: { color },
  });

  const mainChart = {
    ...chartBase(),
    legend: { show: true, top: 0, textStyle: { color: '#8b877f', fontSize: 10 }, itemWidth: 10, itemHeight: 2 },
    grid: { left: 42, right: 44, top: 30, bottom: 24 },
    xAxis: { ...chartBase().xAxis, data: dates },
    yAxis: [
      { ...chartBase().yAxis, max: 110, name: '指数', nameTextStyle: { color: '#8b877f', fontSize: 10 } },
      { ...chartBase().yAxis, max: 60, position: 'right', splitLine: { show: false } },
    ],
    series: [
      line('工业生产', snaps.map((x) => x.economy.output ?? 0), '#b99a62'),
      line('实际工资', snaps.map((x) => x.economy.realWages ?? 0), '#6f9e7f'),
      line('失业率', snaps.map((x) => x.economy.unemployment ?? 0), '#a24a55', 1),
    ],
  };

  const priceChart = {
    ...chartBase(),
    grid: { left: 46, right: 14, top: 20, bottom: 24 },
    xAxis: { ...chartBase().xAxis, data: dates },
    yAxis: { ...chartBase().yAxis, name: '年化 %', nameTextStyle: { color: '#8b877f', fontSize: 10 } },
    series: [line('通胀率', snaps.map((x) => Math.max(-10, Math.min(400, x.economy.inflation ?? 0))), '#c46a5f')],
  };

  const openCause = (path: string, title: string) => {
    setCause({ title, items: explainMetric(s, path) });
  };

  return (
    <>
      <h2 className="page-title">经济与财政</h2>
      <div className="page-sub">产出、失业、物价、财政与政策的相互反馈 · 点击指标查看因果构成</div>

      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Metric
          label="工业生产指数"
          value={s.economy.output.toFixed(0)}
          delta="1928≈100"
          bar={s.economy.output}
          onClick={() => openCause('economy.output', '工业生产')}
        />
        <Metric
          label="失业率"
          value={s.economy.unemployment.toFixed(1)}
          unit="%"
          bar={s.economy.unemployment * 3}
          tone={s.economy.unemployment > 18 ? 'bad' : s.economy.unemployment > 10 ? 'warn' : 'good'}
          onClick={() => openCause('economy.unemployment', '失业率')}
        />
        <Metric
          label="通胀率"
          value={s.economy.inflation > 999 ? '失控' : s.economy.inflation.toFixed(1)}
          unit={s.economy.inflation > 999 ? '' : '%'}
          bar={Math.min(100, Math.abs(s.economy.inflation))}
          tone={s.economy.inflation > 25 ? 'bad' : s.economy.inflation > 8 ? 'warn' : 'good'}
          onClick={() => openCause('economy.inflation', '通胀率')}
        />
        <Metric
          label="财政赤字"
          value={s.economy.deficit.toFixed(1)}
          unit="% GDP"
          bar={Math.abs(s.economy.deficit) * 4}
          tone={s.economy.deficit > 8 ? 'bad' : s.economy.deficit > 4 ? 'warn' : 'good'}
        />
        <Metric label="公共债务" value={s.economy.debt.toFixed(0)} unit="% GDP" bar={s.economy.debt / 2} />
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: '经济轨迹' },
          { id: 'fiscal', label: '财政与金融' },
          { id: 'policy', label: '政策工具箱' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <Panel title="产出、工资与失业" sub="近 84 个月">
            <Chart option={mainChart} height={300} />
          </Panel>
          <Panel title="物价" sub="通胀率（年化，截断显示）">
            <Chart option={priceChart} height={140} />
            <div className="deco-divider" style={{ margin: '8px 0' }}>
              <i />
            </div>
            <div className="grid g2" style={{ gap: 10 }}>
              <Metric label="储蓄购买力" value={s.economy.savingsValue.toFixed(0)} bar={s.economy.savingsValue} />
              <Metric label="食品价格" value={s.economy.foodPrices.toFixed(0)} bar={s.economy.foodPrices} />
              <Metric label="企业破产" value={s.economy.businessFailures.toFixed(0)} bar={s.economy.businessFailures} />
              <Metric label="农业债务" value={s.economy.agriculturalDebt.toFixed(0)} bar={s.economy.agriculturalDebt} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'fiscal' && (
        <div className="grid g3">
          <Panel title="财政收支" sub="% GDP">
            <div className="kv">
              <span className="k">税收</span>
              <span className="v">{s.economy.taxRevenue.toFixed(1)}%</span>
            </div>
            <div className="kv">
              <span className="k">支出</span>
              <span className="v">{s.economy.spending.toFixed(1)}%</span>
            </div>
            <div className="kv">
              <span className="k">赤字</span>
              <span className={`v ${s.economy.deficit > 6 ? 'bad' : 'good'}`}>{s.economy.deficit.toFixed(1)}%</span>
            </div>
            <div className="kv">
              <span className="k">债务</span>
              <span className="v">{s.economy.debt.toFixed(0)}%</span>
            </div>
            <div className="kv">
              <span className="k">货币供应指数</span>
              <span className="v">{s.economy.moneySupply.toFixed(0)}</span>
            </div>
          </Panel>

          <Panel title="金融体系" sub="信贷—投资—产出">
            <div className="kv">
              <span className="k">银行流动性</span>
              <span className="v">{s.economy.bankLiquidity.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">信贷供给</span>
              <span className="v">{s.economy.creditSupply.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">外资依赖</span>
              <span className="v">{s.economy.foreignCapital.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">资本流入</span>
              <span className="v">{s.economy.capitalInflow.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">投资</span>
              <span className="v">{s.economy.investment.toFixed(0)}</span>
            </div>
          </Panel>

          <Panel title="对外经济" sub="出口、进口与国际信心">
            <div className="kv">
              <span className="k">出口</span>
              <span className="v">{s.economy.exports.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">进口</span>
              <span className="v">{s.economy.imports.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">国际资本信心</span>
              <span className="v">{s.diplomacy.capitalConfidence.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">赔款压力</span>
              <span className="v">{s.diplomacy.reparationsPressure.toFixed(0)}</span>
            </div>
            <div className="kv">
              <span className="k">实际工资</span>
              <span className="v">{s.economy.realWages.toFixed(0)}</span>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'policy' && (
        <>
          <Panel title="政策工具箱" sub="每个政策都有代价；不存在无条件改善所有指标的选项">
            <div className="grid g3" style={{ gap: 12 }}>
              {policies.map((p) => {
                const active = s.activePolicies.some((a) => a.policyId === p.id);
                return (
                  <div
                    key={p.id}
                    style={{
                      border: `1px solid ${active ? 'var(--brass)' : 'var(--line-soft)'}`,
                      padding: '12px 14px',
                      background: active ? 'rgba(185,154,98,0.06)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: 13, color: 'var(--ivory)' }}>{p.name_zh}</div>
                      <span className="num" style={{ fontSize: 10.5, color: p.fiscal_cost > 0 ? 'var(--bad)' : 'var(--good)' }}>
                        {p.fiscal_cost > 0 ? '+' : ''}
                        {p.fiscal_cost}% GDP
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--smoke)', lineHeight: 1.65, margin: '6px 0 10px', minHeight: 54 }}>
                      {p.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#6f6a61' }}>{p.duration_months} 个月</span>
                      <button className="btn sm" onClick={() => applyPolicy(p.id)} disabled={active || s.meta.ended}>
                        {s.meta.ended ? '已结束' : active ? '生效中' : '实施'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {s.activePolicies.length > 0 && (
            <Panel title="生效中的政策" sub="按月产生持续影响" style={{ marginTop: 16 }}>
              {s.activePolicies.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span>{a.note}</span>
                  <span className="num" style={{ color: 'var(--brass)' }}>
                    剩余 {a.monthsLeft} 个月
                  </span>
                </div>
              ))}
            </Panel>
          )}
        </>
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
              <p className="srcline">有记录时展示实际增减；机制说明为定性解释，不代表实际贡献比例。</p>
              {cause.items.map((c) => (
                <div key={c.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{c.label}</span>
                    <span className="num">
                      {c.measured ? (c.delta! > 0 ? '+' : '') + c.delta!.toFixed(3) : '机制说明'}
                    </span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', margin: '5px 0' }}>
                    <div style={{ width: `${c.measured ? c.weight * 100 : 0}%`, height: '100%', background: 'var(--brass)' }} />
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
