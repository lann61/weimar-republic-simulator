import { useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Metric, SeatStrip, Chip, KV, Empty, Tabs } from '../components/ui';
import { partySeats, governmentSeats, cabinetCounts, headOfState, regimeId, headOfStateNoun } from '../utils/derive';
import { personMap } from '../data/people';
import { partyMap } from '../data/parties';
import { formatDate, formatDateFull, monthsBetween } from '../simulation/engine/date';
import { govTypeLabel } from '../simulation/elections/run';
import { governmentMap, OFFICE_LABELS } from '../data/governments';

type Tab = 'cabinet' | 'seats' | 'election' | 'power' | 'notes';

export function GovernmentPage() {
  const { state, setPage } = useGame();
  const [tab, setTab] = useState<Tab>('cabinet');
  if (!state) return null;
  const s = state;
  const seats = partySeats(s);
  const gs = governmentSeats(s);
  const counts = cabinetCounts(s.government);
  const hos = headOfState(s);
  const chancellor = personMap.get(s.government.chancellorId);
  const lastElection = s.elections[s.elections.length - 1];

  const months = Math.max(0, monthsBetween(s.government.startDate, s.date));

  return (
    <>
      <h2 className="page-title">政府与政党</h2>
      <div className="page-sub">实时政务总览 · 谁在执政、谁在反对、谁拥有多少议席、政府依靠谁维持</div>

      {/* 首屏摘要 */}
      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Metric label="当前日期" value={formatDate(s.cursorDate ?? s.date)} small />
        <Metric label={hos.title} value={hos.name} small delta={hos.since ? `自 ${formatDate(hos.since)}` : '革命过渡时期'} />
        <Metric label="政府首脑" value={chancellor?.name_zh ?? '—'} small delta={s.government.name_zh} />
        <Metric label="内阁名称" value={s.government.name_zh} small delta={s.government.isHistorical ? '史实内阁' : '推演内阁'} />
        <Metric label="政府类型" value={govTypeLabel(s.government.type)} small delta={`在任 ${months} 个月`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16, alignItems: 'start' }}>
        <Panel title="议会力量对比" sub={`总席位 ${s.parliamentSeatsTotal} · 多数门槛 ${gs.threshold}`}>
          {s.parliamentSeatsTotal > 0 ? (
            <>
              <SeatStrip
                segments={seats.map((p) => ({ color: p.color, value: p.seats, label: p.short }))}
                total={s.parliamentSeatsTotal}
                threshold={gs.threshold}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px', marginTop: 16 }}>
                {seats.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                    <span className="dot" style={{ background: p.color }} />
                    <span style={{ width: 42, color: 'var(--ivory-dim)' }}>{p.short}</span>
                    <span className="num" style={{ width: 34, textAlign: 'right' }}>
                      {p.seats}
                    </span>
                    <span className="num" style={{ width: 46, textAlign: 'right', color: 'var(--smoke)', fontSize: 10.5 }}>
                      {p.share.toFixed(1)}%
                    </span>
                    {p.inGovernment && <span style={{ fontSize: 9, color: 'var(--brass)' }}>执政</span>}
                    {!p.inGovernment && p.supportsGovernment && <span style={{ fontSize: 9, color: 'var(--smoke)' }}>支持</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              text={
                regimeId(s) === 'constitutional_monarchy'
                  ? '国会尚未产生：当前为皇帝任命的君主立宪政府，其合法性来自皇帝任命而非议会多数'
                  : regimeId(s) === 'council_republic'
                    ? '国会尚未产生：当前为苏维埃共和政府，其合法性来自工兵代表会而非议会多数'
                    : '国会尚未产生：当前为革命过渡政府，其合法性来自人民代表委员会而非议会多数'
              }
            />
          )}
        </Panel>

        <Panel title="多数算术" sub="正式联盟、外部支持与反对派的区分">
          <div className="grid g2" style={{ gap: 10, marginBottom: 12 }}>
            <Metric label="正式执政联盟" value={gs.coalition} bar={(gs.coalition / Math.max(1, s.parliamentSeatsTotal)) * 100} />
            <Metric label="外部支持" value={gs.support} bar={(gs.support / Math.max(1, s.parliamentSeatsTotal)) * 100} />
            <Metric label="反对派" value={gs.opposition} bar={(gs.opposition / Math.max(1, s.parliamentSeatsTotal)) * 100} />
            <Metric label="多数门槛" value={s.parliamentSeatsTotal > 0 ? gs.threshold : '—'} bar={s.parliamentSeatsTotal > 0 ? 100 : 0} />
          </div>
          <KV k="是否拥有正式多数" v={s.parliamentSeatsTotal > 0 ? (gs.hasMajority ? '是' : '否') : '国会尚未产生'} />
          <KV k="是否拥有有效多数" v={gs.hasEffectiveMajority ? '是（含外部支持）' : '否'} />
          <KV k="国会信任状态" v={trustLabel(s.government.trustStatus, regimeId(s))} />
          <KV k={`${headOfStateNoun(s)}支持度`} v={`${(s.government.presidentialSupport * 100).toFixed(0)}%`} />
        </Panel>
      </div>

      <Tabs
        tabs={[
          { id: 'cabinet', label: '内阁成员' },
          { id: 'seats', label: '席位与政党' },
          { id: 'election', label: '最近选举' },
          { id: 'power', label: '总统权力与投票规则' },
          { id: 'notes', label: '数据说明' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'cabinet' && (
        <>
          <div className="grid g4" style={{ marginBottom: 16 }}>
            <Metric label="内阁唯一人数" value={counts.uniquePersons} small hint="同一人兼任多个职务只计一次" />
            <Metric label="部长人数" value={counts.ministers} small hint="不含总理" />
            <Metric label="部门/职务数量" value={counts.offices} small hint="兼任分别计数" />
            <Metric label="无任所部长" value={counts.withoutPortfolio} small />
          </div>

          <Panel
            title={`${s.government.name_zh} · 内阁名单`}
            sub={`${formatDateFull(s.government.startDate)} 起 · ${s.government.endDate ? '至 ' + formatDateFull(s.government.endDate) : '现任'} · ${s.government.isHistorical ? '史实内阁' : '模型推演内阁（职务分配非史实）'}`}
            right={
              s.government.parties.length > 0 ? (
                <div style={{ display: 'flex', gap: 5 }}>
                  {counts.byParty.map((p) => (
                    <Chip key={p.label} tone={p.partyId ? 'brass' : undefined}>
                      {p.label} {p.count}
                    </Chip>
                  ))}
                </div>
              ) : null
            }
          >
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr>
                    <th>职务</th>
                    <th>姓名</th>
                    <th>党派</th>
                    <th>身份</th>
                    <th>任职起</th>
                    <th>任职止</th>
                  </tr>
                </thead>
                <tbody>
                  {[...s.government.members]
                    .sort((a, b) => officeRank(a.office_id) - officeRank(b.office_id))
                    .map((m, i) => {
                      const p = personMap.get(m.person_id);
                      const party = m.party_id ? partyMap.get(m.party_id) : null;
                      return (
                        <tr key={`${m.person_id}_${m.office_id}_${i}`}>
                          <td>{m.office_zh}</td>
                          <td>
                            <span className="linkish" onClick={() => setPage('parties')}>
                              {p?.name_zh ?? m.person_id}
                            </span>
                            {p?.name_de && (
                              <div style={{ fontSize: 10, color: '#6f6a61', fontStyle: 'italic' }}>{p.name_de}</div>
                            )}
                          </td>
                          <td>
                            {party ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span className="dot" style={{ background: party.color }} />
                                {party.short_name}
                              </span>
                            ) : (
                              <span className="muted">无党派</span>
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--smoke)' }}>{identityLabel(m.political_identity)}</td>
                          <td className="num" style={{ fontSize: 11 }}>
                            {m.from}
                          </td>
                          <td className="num" style={{ fontSize: 11 }}>
                            {m.to ?? '现任'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="srcline" style={{ marginTop: 10 }}>
              来源：德国历史博物馆 LeMO 内阁条目、德国联邦议院总理展；个别次要部长与兼任关系待档案逐项核验，未录入者不虚构补全。
            </div>
          </Panel>

          <Panel title="政府更迭史" sub="1918—1934 全部内阁（含推演政府）" style={{ marginTop: 16 }}>
            <div className="timeline">
              {[...s.governmentHistory].reverse().map((g) => (
                <div key={g.id} className="timeline-item">
                  <div className="timeline-date">
                    {g.startDate} — {g.endDate ?? '现任'}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {g.name_zh}{' '}
                    <span style={{ fontSize: 11, color: 'var(--brass)' }}>
                      {govTypeLabel(g.type)}
                      {g.isSimulated ? ' · 推演' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--smoke)' }}>
                    {personMap.get(g.chancellorId)?.name_zh} · {g.parties.map((p) => partyMap.get(p)?.short_name).join('/') || '无党派'} ·{' '}
                    {g.seatsAtFormation}/{g.parliamentSeatsTotal} 席
                    {g.endReason ? ` · ${g.endReason}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {tab === 'seats' && (
        <Panel title="当前议会席位与政党" sub="议员转党与补选会改变当前席位，但不改写原始选举结果">
          <div className="scroll-x">
            <table className="data">
              <thead>
                <tr>
                  <th>政党</th>
                  <th>全称</th>
                  <th className="num">当前席位</th>
                  <th className="num">席位占比</th>
                  <th className="num">模型支持度</th>
                  <th className="num">上次选举得票</th>
                  <th>政府角色</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((p) => {
                  const party = partyMap.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className="dot" style={{ background: p.color }} />
                          {p.short}
                        </span>
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--ivory-dim)' }}>{party?.name_de}</td>
                      <td className="num">{p.seats}</td>
                      <td className="num">{p.share.toFixed(1)}%</td>
                      <td className="num">{p.support.toFixed(1)}%</td>
                      <td className="num">{s.parties[p.id]?.supportLastElection.toFixed(1)}%</td>
                      <td style={{ fontSize: 11.5 }}>
                        {p.inGovernment ? (
                          <Chip tone="brass">执政</Chip>
                        ) : p.supportsGovernment ? (
                          <Chip>外部支持</Chip>
                        ) : (
                          <span className="muted">反对</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11 }}>{p.banned ? <Chip tone="wine">被禁</Chip> : '合法'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="srcline" style={{ marginTop: 10 }}>
            “模型支持度”为模拟引擎估算值（simulation_derived），不是历史民调；1920 年代不存在现代民意调查。
          </div>
        </Panel>
      )}

      {tab === 'election' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Panel title="最近一次全国选举" sub={lastElection ? `${lastElection.label} · ${lastElection.date}` : '尚未举行'}>
            {lastElection ? (
              <>
                <div className="grid g3" style={{ gap: 10, marginBottom: 14 }}>
                  <Metric label="投票率" value={`${lastElection.turnout.toFixed(1)}%`} small />
                  <Metric label="总席位" value={lastElection.totalSeats} small />
                  <Metric label="公平性" value={`${(lastElection.fairness * 100).toFixed(0)}%`} small />
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th>政党</th>
                      <th className="num">得票率</th>
                      <th className="num">席位</th>
                      <th className="num">票数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastElection.results.slice(0, 10).map((r) => (
                      <tr key={r.partyId}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span className="dot" style={{ background: partyMap.get(r.partyId)?.color ?? '#888' }} />
                            {partyMap.get(r.partyId)?.short_name ?? r.partyId}
                          </span>
                        </td>
                        <td className="num">{r.share.toFixed(1)}%</td>
                        <td className="num">{r.seats}</td>
                        <td className="num" style={{ fontSize: 11 }}>
                          {r.votes ? r.votes.toLocaleString('zh-CN') : '史料未提供'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 10 }}>
                  <Chip tone={lastElection.isHistorical ? 'brass' : 'wine'}>
                    {lastElection.isHistorical ? '史实基线结果' : '模型推演结果（模拟值）'}
                  </Chip>
                </div>
              </>
            ) : (
              <Empty text="尚未举行全国选举" />
            )}
          </Panel>

          <Panel title="选举史" sub="史实结果与推演结果分开保存">
            <table className="data">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th className="num">投票率</th>
                  <th>第一大党</th>
                  <th>性质</th>
                </tr>
              </thead>
              <tbody>
                {[...s.elections].reverse().map((e) => {
                  const top = [...e.results].sort((a, b) => b.seats - a.seats)[0];
                  return (
                    <tr key={e.id + e.date}>
                      <td className="num" style={{ fontSize: 11 }}>
                        {e.date}
                      </td>
                      <td style={{ fontSize: 11.5 }}>{e.label}</td>
                      <td className="num">{e.turnout.toFixed(1)}%</td>
                      <td style={{ fontSize: 11.5 }}>
                        {partyMap.get(top?.partyId)?.short_name} {top?.seats}席
                      </td>
                      <td>
                        <Chip tone={e.isHistorical ? 'brass' : 'wine'}>{e.isHistorical ? '史实' : '推演'}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {tab === 'power' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', marginBottom: 16 }}>
            <Panel title={`${headOfStateNoun(s)}与紧急权力`} sub={`${hos.name} · 自 ${hos.since ? formatDate(hos.since) : '革命过渡时期'}`}>
              <KV k="总统权力使用指数" v={s.institutions.presidentialPowerUse.toFixed(0)} />
              <KV k="紧急法令依赖度" v={s.institutions.emergencyDependence.toFixed(0)} />
              <KV k="第48条使用次数" v={s.stats.article48Count} />
              <KV k="国会对法令的制衡" v={s.institutions.parliamentAuthority > 50 ? '有效' : '弱化'} />
              <KV k="政府依赖总统任命的程度" v={`${(s.government.presidentialSupport * 100).toFixed(0)}%`} />
              <KV k="政府对议会多数的依赖" v={gs.hasMajority ? '高' : '低'} />
              <div className="deco-divider" style={{ margin: '12px 0 8px' }}>
                <i />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.8 }}>
                第48条原本是应对紧急状态的例外工具。当政府无法获得议会多数时，它会从例外变成常规，
                国会的立法功能随之空心化。
              </div>
            </Panel>

            <Panel title="不同议案的投票规则" sub="多数门槛相同，但通过条件不同">
              <table className="data">
                <thead>
                  <tr>
                    <th>议案类型</th>
                    <th>通过条件</th>
                    <th className="num">所需席位</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {votingRules(s.parliamentSeatsTotal).map((r) => (
                    <tr key={r.type}>
                      <td>{r.type}</td>
                      <td style={{ fontSize: 11.5 }}>{r.rule}</td>
                      <td className="num">{r.seats}</td>
                      <td style={{ fontSize: 11, color: 'var(--smoke)' }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel title="第48条使用记录" sub="法令、总统、总理、国会反应与制度影响">
            {s.article48.length === 0 ? (
              <Empty text="尚未使用第48条紧急权力" />
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>事由</th>
                    <th>范围</th>
                    <th>总统</th>
                    <th>总理</th>
                    <th>国会反应</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {[...s.article48].reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="num" style={{ fontSize: 11 }}>
                        {r.date}
                      </td>
                      <td style={{ fontSize: 11.5 }}>{r.reason}</td>
                      <td style={{ fontSize: 11.5 }}>{r.scope}</td>
                      <td style={{ fontSize: 11.5 }}>{personMap.get(r.presidentId)?.name_zh}</td>
                      <td style={{ fontSize: 11.5 }}>{personMap.get(r.chancellorId)?.name_zh}</td>
                      <td style={{ fontSize: 11, color: 'var(--smoke)' }}>{r.parliamentaryReaction}</td>
                      <td>{r.active ? <Chip tone="wine">生效中</Chip> : <Chip>已失效</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}

      {tab === 'notes' && (
        <Panel title="数据说明与标签" sub="史实、估算与模拟值严格分开">
          <div style={{ fontSize: 12.5, lineHeight: 1.9, color: 'var(--ivory-dim)' }}>
            <p>
              <b style={{ color: 'var(--brass)' }}>史实内阁</b>：来自 LeMO 与联邦议院的内阁名单，主要职务经过交叉核验；未录入的次要部长不虚构补全。
            </p>
            <p>
              <b style={{ color: 'var(--brass)' }}>推演内阁</b>：当玩家改变历史路径、或选举结果偏离史实时，系统按政党席位与意识形态距离组建政府，
              部长职务由真实历史人物按党派归属分配——<b>职务分配本身是模型推演，不是史实</b>。
            </p>
            <p>
              <b style={{ color: 'var(--brass)' }}>当前席位 vs 选举结果</b>：当前席位会因转党、补选、取缔而变化；原始选举结果保存在选举记录中，不会被改写。
            </p>
            <p>
              <b style={{ color: 'var(--brass)' }}>模型支持度</b>：每月由选民群体效用模型计算，属于 simulation_derived。1920 年代没有现代民调，
              因此界面以虚线与“模型估算”标签区分。
            </p>
            <p>
              <b style={{ color: 'var(--brass)' }}>史实锚定</b>：历史观察/干预模式下，选举结果会向史实基线加权；玩家偏离越多，锚定越弱，
              最终转为纯推演。顶栏实时显示锚定强度。
            </p>
            <p className="srcline">
              已知数据差异：1919年国民议会选举存在 421/423 席、SPD 163/165 席的不同记录，本项目采用 423 席口径并保留说明，
              不做静默拼接。
            </p>
          </div>
        </Panel>
      )}
    </>
  );
}

function officeRank(id: string): number {
  const order = Object.keys(OFFICE_LABELS);
  const i = order.indexOf(id);
  return i === -1 ? 99 : i;
}

function identityLabel(id: string): string {
  const map: Record<string, string> = {
    party: '政党代表',
    independent_official: '无党派官员',
    military: '军方',
    professional_civil_servant: '职业文官',
  };
  return map[id] ?? id;
}

function trustLabel(t: string, regime = 'republic'): string {
  if (t === 'not_required') {
    if (regime === 'constitutional_monarchy') return '无需国会信任（皇帝任命）';
    if (regime === 'council_republic') return '无需国会信任（代表会任命）';
    return '无需国会信任（总统内阁）';
  }
  const map: Record<string, string> = {
    confirmed: '国会确认',
    tolerated: '国会容忍',
    unclear: '不明确',
    opposed: '国会反对',
  };
  return map[t] ?? t;
}

function votingRules(total: number) {
  const half = Math.floor(total / 2) + 1;
  const twoThirds = Math.ceil(total * 2 / 3);
  return [
    { type: '普通法律', rule: '出席议员过半数', seats: half, note: '预算、行政法案、社会保障法案' },
    { type: '不信任案', rule: '过半数', seats: half, note: '通过即迫使总理辞职或解散国会' },
    { type: '宪法修正', rule: '三分之二出席且达到法定人数', seats: twoThirds, note: '改变联邦结构、总统权力等' },
    { type: '授权法类', rule: '三分之二 + 修宪法定人数', seats: twoThirds, note: '1933年3月《授权法》即依此门槛' },
    { type: '撤销紧急法令', rule: '过半数', seats: half, note: '国会可要求政府撤销第48条法令' },
    { type: '总统选举（国会轮）', rule: '过半数', seats: half, note: '仅在总统选举进入国会环节时适用' },
  ];
}
