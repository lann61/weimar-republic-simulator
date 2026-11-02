import { useState } from 'react';
import { useGame } from '../store/useGame';
import { Panel, Chip, Empty, Tabs } from '../components/ui';
import { governments } from '../data/governments';
import { personMap } from '../data/people';
import { partyMap } from '../data/parties';
import { formatDateFull } from '../simulation/engine/date';
import { govTypeLabel } from '../simulation/elections/run';
import { cabinetCounts } from '../utils/derive';

type Tab = 'archive' | 'run' | 'records';

export function ParliamentPage() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>('archive');
  const [openGov, setOpenGov] = useState<string | null>('gov_mueller2');
  if (!state) return null;
  const s = state;

  const gov = governments.find((g) => g.id === openGov);
  const govState = gov ? s.governmentHistory.find((g) => g.id === gov.id) : null;

  return (
    <>
      <h2 className="page-title">政府与议会</h2>
      <div className="page-sub">历届内阁档案 · 议会行为记录 · 第48条与信任关系</div>

      <Tabs
        tabs={[
          { id: 'archive', label: '内阁档案（史实）' },
          { id: 'run', label: '本局政府史' },
          { id: 'records', label: '议会行为记录' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'archive' && (
        <div className="grid" style={{ gridTemplateColumns: '300px 1fr' }}>
          <Panel title="历届内阁" sub={`${governments.length} 届（1918—1934）`}>
            <div style={{ maxHeight: 640, overflowY: 'auto' }}>
              {[...governments].reverse().map((g) => (
                <button
                  key={g.id}
                  onClick={() => setOpenGov(g.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 8px',
                    borderLeft: openGov === g.id ? '2px solid var(--brass)' : '2px solid transparent',
                    background: openGov === g.id ? 'rgba(185,154,98,0.08)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 12.5 }}>{g.name_zh}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--smoke)' }}>
                    {g.from} — {g.to ?? '现任'}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          {gov ? (
            <div>
              <Panel title={gov.name_zh} sub={`${formatDateFull(gov.from)} — ${gov.to ? formatDateFull(gov.to) : '现任'}`}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Chip tone="brass">{govTypeLabel(gov.type)}</Chip>
                  <Chip>总理 {personMap.get(gov.chancellor_id)?.name_zh}</Chip>
                  <Chip>
                    席位 {gov.seats_at_formation}/{gov.parliament_seats_total}
                  </Chip>
                  {gov.parties.map((p) => (
                    <Chip key={p} tone="forest">
                      {partyMap.get(p)?.short_name}
                    </Chip>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.9, color: 'var(--ivory-dim)' }}>{gov.historical_summary}</div>
                <div className="deco-divider" style={{ margin: '12px 0' }}>
                  <i />
                </div>
                <div className="grid g3" style={{ gap: 10, marginBottom: 14 }}>
                  <div className="metric">
                    <div className="label">内阁人数</div>
                    <div className="value sm">{new Set(gov.members.map((m) => m.person_id)).size}</div>
                  </div>
                  <div className="metric">
                    <div className="label">职务数量</div>
                    <div className="value sm">{gov.members.length}</div>
                  </div>
                  <div className="metric">
                    <div className="label">政党数</div>
                    <div className="value sm">{gov.parties.length}</div>
                  </div>
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th>职务</th>
                      <th>姓名</th>
                      <th>党派</th>
                      <th>任职</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gov.members.map((m, i) => (
                      <tr key={i}>
                        <td>{m.office_zh}</td>
                        <td>{personMap.get(m.person_id)?.name_zh ?? m.person_id}</td>
                        <td style={{ fontSize: 11.5 }}>
                          {m.party_id ? partyMap.get(m.party_id)?.short_name : <span className="muted">无党派</span>}
                        </td>
                        <td className="num" style={{ fontSize: 10.5 }}>
                          {m.from} — {m.to ?? '现任'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--smoke)' }}>
                  施政要点：{gov.program_zh}
                  {gov.end_reason && (
                    <>
                      <br />
                      终结原因：{gov.end_reason}
                    </>
                  )}
                </div>
                <div className="srcline" style={{ marginTop: 8 }}>
                  来源：LeMO 内阁条目、德国联邦议院总理展。内阁名单覆盖主要职务，未录入的次要部长不虚构补全。
                </div>
                {govState && (
                  <div style={{ marginTop: 8 }}>
                    <Chip tone="forest">本局曾以此为基础组建政府</Chip>
                  </div>
                )}
              </Panel>
            </div>
          ) : (
            <Empty text="请选择内阁" />
          )}
        </div>
      )}

      {tab === 'run' && (
        <Panel title="本局政府更迭" sub="含史实政府与推演政府">
          <div className="timeline">
            {[...s.governmentHistory].reverse().map((g) => {
              const c = cabinetCounts(g);
              return (
                <div key={g.id} className="timeline-item">
                  <div className="timeline-date">
                    {g.startDate} — {g.endDate ?? '现任'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {g.name_zh} <span style={{ fontSize: 11, color: 'var(--brass)' }}>{govTypeLabel(g.type)}</span>{' '}
                    {g.isSimulated && <Chip tone="wine">推演</Chip>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--smoke)', lineHeight: 1.7 }}>
                    总理 {personMap.get(g.chancellorId)?.name_zh} · {g.parties.map((p) => partyMap.get(p)?.short_name).join('、') || '无党派'} ·{' '}
                    {c.uniquePersons} 人内阁 · {g.seatsAtFormation}/{g.parliamentSeatsTotal} 席
                    {g.endReason && <div>终结：{g.endReason}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === 'records' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Panel title="议会与政府行为" sub="仅记录可证实或本局实际发生的行为">
            <div className="timeline">
              {s.log
                .filter((l) => ['government', 'institution', 'decision', 'article48'].includes(l.type))
                .slice(-14)
                .reverse()
                .map((l) => (
                  <div key={l.id} className="timeline-item">
                    <div className="timeline-date">{l.date}</div>
                    <div style={{ fontSize: 12.5 }}>{l.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--smoke)', lineHeight: 1.6 }}>{l.detail.slice(0, 180)}</div>
                  </div>
                ))}
            </div>
          </Panel>

          <Panel title="第48条与信任关系" sub="制度制衡的实际状态">
            <table className="data">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>事由</th>
                  <th>范围</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {[...s.article48].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="num" style={{ fontSize: 10.5 }}>
                      {r.date}
                    </td>
                    <td style={{ fontSize: 11 }}>{r.reason}</td>
                    <td style={{ fontSize: 11 }}>{r.scope}</td>
                    <td>{r.active ? <Chip tone="wine">生效</Chip> : <Chip>失效</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.article48.length === 0 && <Empty text="尚未使用第48条" />}

            <div className="deco-divider" style={{ margin: '14px 0 10px' }}>
              <i />
            </div>
            <div className="srcline" style={{ lineHeight: 1.8 }}>
              说明：多数历史国会投票的逐名记录无法完整取得，本系统只显示可证实的投票结果；
              本局发生的表决由模型推演，标记为“推演”，不冒充历史逐名记录（方案 §25.8）。
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
