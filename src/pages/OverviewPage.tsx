import { strategy } from '../simulation/events/strategy';
import { useGame } from '../store/useGame';
import { Panel, Metric, SeatStrip, KV, Chip, Empty } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { partySeats, governmentSeats, cabinetCounts, headOfState, regimeId, headOfStateNoun } from '../utils/derive';
import { personMap } from '../data/people';
import { partyMap } from '../data/parties';
import { formatDate } from '../simulation/engine/date';
import { govTypeLabel } from '../simulation/elections/run';

export function OverviewPage() {
  const { state, setPage } = useGame();
  if (!state) return null;
  const s = state;
  const seats = partySeats(s);
  const gs = governmentSeats(s);
  const counts = cabinetCounts(s.government);
  const president = personMap.get(s.presidentId);
  const hos = headOfState(s);
  const chancellor = personMap.get(s.government.chancellorId);

  const recent = s.log.slice(-7).reverse();
  const snaps = s.snapshots.slice(-60);
  const dates = snaps.map((x) => x.date.slice(2, 7));

  const econOption = {
    ...chartBase(),
    grid: { left: 40, right: 12, top: 24, bottom: 22 },
    legend: {
      show: true,
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 2,
      textStyle: { color: '#8b877f', fontSize: 10 },
    },
    xAxis: { ...chartBase().xAxis, data: dates },
    yAxis: [
      { ...chartBase().yAxis, name: '', max: 100 },
      { ...chartBase().yAxis, max: 60, splitLine: { show: false }, position: 'right' },
    ],
    series: [
      {
        name: '工业生产',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: snaps.map((x) => x.economy.output ?? 0),
        lineStyle: { color: '#b99a62', width: 1.6 },
        areaStyle: { color: 'rgba(185,154,98,0.08)' },
      },
      {
        name: '失业率',
        type: 'line',
        smooth: true,
        symbol: 'none',
        yAxisIndex: 1,
        data: snaps.map((x) => x.economy.unemployment ?? 0),
        lineStyle: { color: '#a24a55', width: 1.6 },
      },
    ],
  };

  return (
    <>
      <h2 className="page-title">国家总览</h2>
      {s.flags.lastGovernmentFormation && <div className="page-sub">{String(s.flags.lastGovernmentFormation)}</div>}
      <Panel title="本局决策方向" sub="持续影响需求、资本信心、社会冲突与制度监督；中立为0，取向范围−20至20">
        <div className="grid g4">{[['demand','需求扩张'],['cooperation','外交合作'],['cohesion','社会协调'],['accountability','制度监督']].map(([key,label]) => <KV key={key} k={label} v={strategy(s,key).toFixed(1)} />)}</div>
        {s.decisions.length > 0 && <div className="srcline">最近决策：{s.decisions[s.decisions.length-1].label}。后续：{s.decisions[s.decisions.length-1].longTerm}</div>}
      </Panel>
      <div className="page-sub">
        {formatDate(s.cursorDate ?? s.date)} · 第 {s.phase} 阶段 · 已举行 {s.stats.electionsHeld} 次全国选举 · 政府更迭{' '}
        {s.stats.governmentsFormed} 次
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Metric
          label={hos.title}
          value={hos.name}
          small
          delta={hos.since ? `就任 ${formatDate(hos.since)}` : '革命过渡时期'}
          onClick={() => setPage('parties')}
        />
        <Metric label="政府首脑" value={chancellor?.name_zh ?? '—'} small delta={s.government.name_zh} onClick={() => setPage('government')} />
        <Metric label="政府类型" value={govTypeLabel(s.government.type)} small delta={`${s.government.parties.length} 个执政党`} />
        <Metric
          label="内阁规模"
          value={`${counts.uniquePersons} 人`}
          small
          delta={`${counts.ministers} 名部长 · ${counts.offices} 个职务`}
          onClick={() => setPage('government')}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', marginBottom: 16, alignItems: 'start' }}>
        <Panel
          title="议会构成"
          sub={`总席位 ${s.parliamentSeatsTotal} · 多数门槛 ${gs.threshold} · 执政联盟 ${gs.coalition} 席`}
          right={
            <button className="btn sm" onClick={() => setPage('elections')}>
              选举中心
            </button>
          }
        >
          {s.parliamentSeatsTotal > 0 ? (
            <>
              <SeatStrip
                segments={seats.map((p) => ({ color: p.color, value: p.seats, label: p.short }))}
                total={s.parliamentSeatsTotal}
                threshold={gs.threshold}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                {seats.slice(0, 9).map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                    <span className="dot" style={{ background: p.color }} />
                    <span style={{ color: 'var(--ivory-dim)' }}>{p.short}</span>
                    <span className="num" style={{ color: 'var(--ivory)' }}>
                      {p.seats}
                    </span>
                    {p.inGovernment && <Chip tone="brass">执政</Chip>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '18px 0' }}>
              <Empty text="国会尚未选举产生" />
              <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.8, maxWidth: 460, margin: '0 auto' }}>
                {regimeId(s) === 'constitutional_monarchy'
                  ? '1918年11月至1919年1月为君主立宪过渡期：皇帝任命议会制政府，国家权力由皇帝、内阁与工兵代表会共同行使，制宪国民议会将于1919年1月19日选举产生。'
                  : regimeId(s) === 'council_republic'
                    ? '1918年11月至1919年1月为苏维埃过渡期：国家权力由工兵代表会掌握，制宪安排取决于革命机构。'
                    : '1918年11月至1919年1月为革命过渡期：国家权力由人民代表委员会与工兵代表会共同行使，制宪国民议会将于1919年1月19日选举产生。此期间的政府不是议会政府，而是革命临时政府。'}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="政府稳定与支持" sub="模拟模型状态，非历史机构评分">
          <KV k="执政联盟席位" v={s.parliamentSeatsTotal > 0 ? `${gs.coalition} / ${gs.threshold}` : '国会尚未产生'} />
          <KV k="外部支持席位" v={`${gs.support}`} />
          <KV k="反对派席位" v={`${gs.opposition}`} />
          <KV k="政府稳定度" v={s.institutions.governmentDurability.toFixed(0)} />
          <KV k="国会支持程度" v={s.institutions.governmentLegitimacy.toFixed(0)} />
          <KV k={`${headOfStateNoun(s)}支持`} v={`${(s.government.presidentialSupport * 100).toFixed(0)}%`} />
          <KV k="在任时长" v={`${Math.max(0, monthsBetween(s.government.startDate, s.date))} 个月`} />
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16, alignItems: 'start' }}>
        <Panel title="经济轨迹" sub="近 60 个月 · 工业生产（金）与失业率（酒红）">
          <Chart option={econOption} height={220} />
        </Panel>
        <Panel title="重点事件" sub="由模拟状态生成的动态报道">
          {s.news.length > 0 ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, lineHeight: 1.45, marginBottom: 8 }}>
                {s.news[s.news.length - 1].headline}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ivory-dim)', lineHeight: 1.8 }}>{s.news[s.news.length - 1].body}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                {s.news[s.news.length - 1].tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </>
          ) : (
            <Empty text="推进时间以生成月度报道" />
          )}
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <Panel title="近期大事" sub="按重要性记录的政治与制度变化">
          <div className="timeline">
            {recent.map((l) => (
              <div key={l.id} className="timeline-item">
                <div className="timeline-date">{l.date}</div>
                <div style={{ fontSize: 13, color: 'var(--ivory)' }}>{l.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.7 }}>{l.detail.slice(0, 150)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="结构指标" sub="制度与社会的慢性变量">
          <div className="grid g2" style={{ gap: 10 }}>
            <Metric label="民主韧性" value={s.institutions.democraticResilience.toFixed(0)} bar={s.institutions.democraticResilience} />
            <Metric label="议会权威" value={s.institutions.parliamentAuthority.toFixed(0)} bar={s.institutions.parliamentAuthority} />
            <Metric label="社会极化" value={s.society.polarization.toFixed(0)} bar={s.society.polarization} />
            <Metric label="政治暴力" value={s.society.violence.toFixed(0)} bar={s.society.violence} />
            <Metric label="新闻自由" value={s.society.mediaFreedom.toFixed(0)} bar={s.society.mediaFreedom} />
            <Metric
              label="紧急法令依赖"
              value={s.institutions.emergencyDependence.toFixed(0)}
              bar={s.institutions.emergencyDependence}
            />
          </div>
          <div className="deco-divider" style={{ margin: '14px 0 8px' }}>
            <i />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.85 }}>
            当前执政：{s.government.parties.map((p) => partyMap.get(p)?.name_zh).join('、') || '无党派'}。
            {s.institutions.emergencyDependence > 50
              ? '政府已高度依赖总统紧急权力，国会立法功能被绕过。'
              : s.institutions.parliamentAuthority < 40
                ? '议会权威持续下降，组阁与立法都越来越依赖总统府。'
                : '议会仍在立法过程中保持核心地位。'}
          </div>
        </Panel>
      </div>
    </>
  );
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}
