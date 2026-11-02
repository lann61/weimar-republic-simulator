import { useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Chip, Empty, Tabs, KV } from '../components/ui';
import { Chart, chartBase } from '../components/Chart';
import { parties, partyMap } from '../data/parties';
import { people, personMap } from '../data/people';
import { governments } from '../data/governments';
import { sourceMap } from '../data/sources';
import { explainPartySupport } from '../simulation/explainability/causes';

type Tab = 'parties' | 'people';

const ROLE_LABELS: Record<string, string> = {
  president: '总统',
  chancellor: '总理',
  vice_chancellor: '副总理',
  minister: '部长',
  foreign_minister: '外交部长',
  finance_minister: '财政部长',
  party_leader: '政党领袖',
  member_of_parliament: '国会议员',
  military_leader: '军事领袖',
  union_leader: '工会领袖',
  industrialist: '工业家',
  banker: '银行家',
  central_banker: '央行行长',
  theorist: '理论家',
  writer: '作家',
  artist: '艺术家',
  journalist: '记者',
  diplomat: '外交官',
  head_of_state: '国家元首',
  head_of_government: '政府首脑',
  state_premier: '邦总理',
  social_reformer: '社会改革者',
  women_rights_activist: '妇女权利活动者',
  putschist: '政变者',
  paramilitary_leader: '准军事组织领袖',
  propagandist: '宣传家',
  ideologue: '意识形态理论家',
  civil_servant: '文官',
  legal_scholar: '法学家',
  constitutional_lawyer: '宪法学者',
  educator: '教育家',
  mayor: '市长',
  speaker: '议长',
  veteran_leader: '退伍军人组织领袖',
  revolutionary: '革命者',
  composer: '作曲家',
  actor: '演员',
  film_director: '导演',
  architect: '建筑师',
  scholar: '学者',
  publicist: '政论作家',
  pacifist: '和平主义者',
  agricultural_leader: '农业领袖',
  state_minister: '邦部长',
  military_administrator: '军事行政官',
  international_lawyer: '国际法学者',
  state_official: '邦官员',
  philanthropist: '慈善家',
  satirist: '讽刺作家',
  theatre: '剧场',
};

export function PartiesPage() {
  const { state, setPage } = useGame();
  const [tab, setTab] = useState<Tab>('parties');
  const [selectedParty, setSelectedParty] = useState('spd');
  const [q, setQ] = useState('');
  const [filterParty, setFilterParty] = useState<string>('all');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  if (!state) return null;
  const s = state;

  const party = partyMap.get(selectedParty);
  const ps = s.parties[selectedParty];
  const causes = explainPartySupport(s, selectedParty);

  const chart = useMemo(() => {
    const snaps = s.snapshots.slice(-60);
    return {
      ...chartBase(),
      grid: { left: 40, right: 12, top: 18, bottom: 24 },
      xAxis: { ...chartBase().xAxis, data: snaps.map((x) => x.date.slice(2, 7)) },
      yAxis: { ...chartBase().yAxis, max: 45 },
      series: [
        {
          name: party?.short_name,
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: snaps.map((x) => x.parties[selectedParty] ?? 0),
          lineStyle: { color: party?.color, width: 1.8 },
          areaStyle: { color: party?.color, opacity: 0.12 },
        },
      ],
    };
  }, [s.snapshots, selectedParty, party]);

  const filteredPeople = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people.filter((p) => {
      if (filterParty !== 'all') {
        const has = p.party_memberships.some((m) => m.party_id === filterParty);
        if (!has) return false;
      }
      if (!needle) return true;
      return (
        p.name_zh.includes(needle) ||
        p.name_de.toLowerCase().includes(needle) ||
        (p.name_en ?? '').toLowerCase().includes(needle)
      );
    });
  }, [q, filterParty]);

  const person = selectedPerson ? personMap.get(selectedPerson) : null;
  const personGovs = useMemo(() => {
    if (!selectedPerson) return [];
    return governments
      .flatMap((g) => g.members.filter((m) => m.person_id === selectedPerson).map((m) => ({ gov: g, m })))
      .sort((a, b) => (a.gov.from < b.gov.from ? 1 : -1));
  }, [selectedPerson]);

  return (
    <>
      <h2 className="page-title">政党与人物</h2>
      <div className="page-sub">
        15 个政党 · {people.length} 名经来源核验的真实历史人物 · 党籍与职务按时间记录
      </div>

      <Tabs
        tabs={[
          { id: 'parties', label: '政党档案' },
          { id: 'people', label: `人物数据库（${people.length}）` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'parties' && (
        <div className="grid" style={{ gridTemplateColumns: '250px 1fr' }}>
          <Panel title="政党列表" sub="按当前席位排序">
            {parties
              .filter((p) => p.active_from <= s.date && (!p.active_to || p.active_to >= s.date || s.parties[p.id]?.seats > 0))
              .sort((a, b) => (s.parties[b.id]?.seats ?? 0) - (s.parties[a.id]?.seats ?? 0))
              .map((p) => {
                const st = s.parties[p.id];
                const dissolved = p.active_to && p.active_to < s.date;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedParty(p.id)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 6px',
                      borderLeft: selectedParty === p.id ? '2px solid var(--brass)' : '2px solid transparent',
                      background: selectedParty === p.id ? 'rgba(185,154,98,0.08)' : 'transparent',
                      textAlign: 'left',
                      opacity: dissolved ? 0.45 : 1,
                    }}
                  >
                    <span className="dot" style={{ background: p.color }} />
                    <span style={{ fontSize: 12.5, flex: 1 }}>
                      {p.short_name}
                      {dissolved && <span style={{ fontSize: 9, color: 'var(--smoke)', marginLeft: 5 }}>已解散</span>}
                    </span>
                    <span className="num" style={{ fontSize: 11, color: 'var(--smoke)' }}>
                      {st?.seats ?? 0}
                    </span>
                  </button>
                );
              })}
          </Panel>

          <div>
            {party && ps ? (
              <>
                <Panel title={party.name_zh} sub={`${party.name_de} · ${party.active_from} 起`}>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
                    <Chip tone="brass">席位 {ps.seats}</Chip>
                    <Chip>模型支持度 {ps.support.toFixed(1)}%</Chip>
                    <Chip>上次选举 {ps.supportLastElection.toFixed(1)}%</Chip>
                    <Chip tone={ps.inGovernment ? 'forest' : undefined}>{ps.inGovernment ? '执政党' : '在野'}</Chip>
                    <Chip>反体制程度 {(party.anti_system * 100).toFixed(0)}</Chip>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ivory-dim)' }}>{party.summary_zh}</div>
                  <div className="deco-divider" style={{ margin: '14px 0' }}>
                    <i />
                  </div>
                  <div className="grid g2" style={{ gap: 18 }}>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 8 }}>政策立场</div>
                      {Object.entries(party.policy).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ width: 52, fontSize: 11, color: 'var(--smoke)' }}>{policyLabel(k)}</span>
                          <div style={{ flex: 1, height: 5, background: 'rgba(185,154,98,0.14)', position: 'relative' }}>
                            <div
                              style={{
                                position: 'absolute',
                                left: v < 0 ? `${50 + v * 50}%` : '50%',
                                width: `${Math.abs(v) * 50}%`,
                                height: '100%',
                                background: v > 0 ? 'var(--brass)' : 'var(--steel)',
                              }}
                            />
                            <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'rgba(240,232,216,0.35)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 8 }}>组织与联盟</div>
                      <KV k="组织密度" v={party.organization.toFixed(2)} />
                      <KV k="动员能力" v={party.mobilization.toFixed(2)} />
                      <KV k="党内纪律" v={party.discipline.toFixed(2)} />
                      <KV k="倾向联合" v={party.coalition_preferences.map((p) => partyMap.get(p)?.short_name).join('、') || '—'} />
                      <KV k="绝不联合" v={party.red_lines.map((p) => partyMap.get(p)?.short_name).join('、') || '—'} />
                    </div>
                  </div>
                </Panel>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
                  <Panel title="支持度轨迹" sub="模型估算值（非历史民调）">
                    <Chart option={chart} height={190} />
                  </Panel>
                  <Panel title="支持度构成解释" sub="以下为定性机制说明，不是本局实际贡献比例">
                    {causes.map((c) => (
                      <div key={c.label} style={{ marginBottom: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--ivory-dim)' }}>{c.label}</span>
                          <span className={`num ${c.direction === 'up' ? 'good' : c.direction === 'down' ? 'bad' : 'muted'}`}>
                            机制说明
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--smoke)', lineHeight: 1.6 }}>{c.detail}</div>
                      </div>
                    ))}
                  </Panel>
                </div>
              </>
            ) : (
              <Empty text="请选择政党" />
            )}
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div className="grid" style={{ gridTemplateColumns: person ? '1fr 420px' : '1fr' }}>
          <Panel
            title="历史人物数据库"
            sub="所有条目为真实历史人物；反事实模式中如使用虚构人物会单独标记"
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={filterParty}
                  onChange={(e) => setFilterParty(e.target.value)}
                  style={{ background: '#131211', border: '1px solid var(--line)', color: 'var(--ivory)', padding: '4px 8px', fontSize: 11 }}
                >
                  <option value="all">全部党派</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short_name}
                    </option>
                  ))}
                </select>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索姓名（中文/德文）"
                  style={{
                    background: '#131211',
                    border: '1px solid var(--line)',
                    color: 'var(--ivory)',
                    padding: '4px 10px',
                    fontSize: 11.5,
                    width: 190,
                    outline: 'none',
                  }}
                />
              </div>
            }
          >
            <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>德文原名</th>
                    <th>生卒</th>
                    <th>身份</th>
                    <th>党籍</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((p) => (
                    <tr key={p.id} onClick={() => setSelectedPerson(p.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: selectedPerson === p.id ? 'var(--brass)' : 'var(--ivory)' }}>{p.name_zh}</td>
                      <td style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--smoke)' }}>{p.name_de}</td>
                      <td className="num" style={{ fontSize: 10.5 }}>
                        {p.birth_date.slice(0, 4)}–{p.death_date.slice(0, 4)}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {p.roles.slice(0, 3).map((r) => ROLE_LABELS[r] ?? r).join('、')}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {p.party_memberships.map((m) => (m.party_id ? partyMap.get(m.party_id)?.short_name : '无党派')).join(' → ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="srcline" style={{ marginTop: 8 }}>
              显示 {filteredPeople.length} / {people.length} 人。来源：Weimar Republic Who's Who、德国议会人物数据库、联邦议院总理展。
            </div>
          </Panel>

          {person && (
            <Panel title={person.name_zh} sub={person.name_de}>
              <div
                style={{
                  height: 120,
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  background: 'repeating-linear-gradient(45deg, rgba(185,154,98,0.04) 0 8px, transparent 8px 16px)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--brass-dim)' }}>◈</div>
                  <div style={{ fontSize: 9.5, color: '#6f6a61', letterSpacing: '0.14em' }}>无授权肖像 · 使用中性剪影</div>
                </div>
              </div>

              <KV k="生卒" v={`${person.birth_date} — ${person.death_date}`} />
              <KV k="身份" v={person.roles.map((r) => ROLE_LABELS[r] ?? r).join('、')} />
              <KV
                k="党籍"
                v={
                  person.party_memberships
                    .map((m) => {
                      const name = m.party_id ? partyMap.get(m.party_id)?.short_name : '无党派';
                      const range = m.from ? `${m.from}${m.to ? `—${m.to}` : ''}` : '日期未核实';
                      return `${name}（${range}）`;
                    })
                    .join(' → ') || '无党派'
                }
              />

              <div style={{ fontSize: 12, lineHeight: 1.85, color: 'var(--ivory-dim)', margin: '12px 0' }}>{person.historical_summary}</div>

              {personGovs.length > 0 && (
                <>
                  <div className="eyebrow" style={{ margin: '10px 0 6px' }}>任职记录</div>
                  {personGovs.slice(0, 8).map(({ gov, m }, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: 'var(--ivory-dim)', marginBottom: 4 }}>
                      <span style={{ color: 'var(--brass)' }}>{m.from}</span> — {m.to ?? '现任'} · {m.office_zh} · {gov.name_zh}
                    </div>
                  ))}
                </>
              )}

              <div className="deco-divider" style={{ margin: '12px 0 8px' }}>
                <i />
              </div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>来源与数据等级</div>
              <div className="srcline" style={{ lineHeight: 1.8 }}>
                {person.source_ids.map((id) => sourceMap.get(id)?.publisher ?? id).join('；')}
                <br />
                数据等级：{person.data_quality}
                <br />
                模拟参数：{person.simulation_parameters?.notes}
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setPage('government')}>
                  查看当前内阁
                </button>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function policyLabel(k: string): string {
  const map: Record<string, string> = {
    welfare: '福利',
    fiscal: '财政',
    labor: '劳工',
    foreign: '外交',
    federal: '联邦',
    religion: '宗教',
    rearmament: '军备',
  };
  return map[k] ?? k;
}
