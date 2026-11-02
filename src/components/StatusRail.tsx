import { useGame } from '../store/useGame';
import { personMap } from '../data/people';
import { partyMap } from '../data/parties';
import { governmentSeats, headOfState } from '../utils/derive';
import { formatDate } from '../simulation/engine/date';

function Mini({ label, value, unit, bar, tone }: { label: string; value: string; unit?: string; bar?: number; tone?: string }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10.5, color: 'var(--smoke)', letterSpacing: '0.06em' }}>{label}</span>
        <span className={`num ${tone ?? ''}`} style={{ fontSize: 14 }}>
          {value}
          {unit && <span style={{ fontSize: 9.5, color: 'var(--smoke)', marginLeft: 2 }}>{unit}</span>}
        </span>
      </div>
      {typeof bar === 'number' && (
        <div className="bar" style={{ marginTop: 4, height: 2 }}>
          <i style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </div>
      )}
    </div>
  );
}

export function StatusRail() {
  const { state, setPage } = useGame();
  if (!state) return null;
  const s = state;
  const seats = governmentSeats(s);
  const hos = headOfState(s);
  const chancellor = personMap.get(s.government.chancellorId);

  const nextElection =
    s.elections.length > 0
      ? '见选举中心'
      : '按历史日程';

  return (
    <aside className="rail">
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        国家状态
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--smoke)' }}>{hos.title}</div>
        <div className="linkish" style={{ fontSize: 13.5 }} onClick={() => setPage('parties')}>
          {hos.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--smoke)', marginTop: 6 }}>政府首脑</div>
        <div style={{ fontSize: 13.5 }}>{chancellor?.name_zh ?? '—'}</div>
        <div style={{ fontSize: 10.5, color: 'var(--brass)', marginTop: 4 }}>
          {s.government.name_zh} · {s.government.parties.map((p) => partyMap.get(p)?.short_name).join('/') || '无党派'}
        </div>
      </div>

      <div className="deco-divider" style={{ margin: '10px 0 12px' }}>
        <i />
      </div>

      <Mini label="政府稳定度" value={s.institutions.governmentDurability.toFixed(0)} bar={s.institutions.governmentDurability} />
      <Mini label="议会权威" value={s.institutions.parliamentAuthority.toFixed(0)} bar={s.institutions.parliamentAuthority} />
      <Mini
        label="失业率"
        value={s.economy.unemployment.toFixed(1)}
        unit="%"
        bar={s.economy.unemployment * 3}
        tone={s.economy.unemployment > 18 ? 'bad' : s.economy.unemployment > 10 ? 'warn' : 'good'}
      />
      <Mini
        label="通胀率"
        value={s.economy.inflation > 999 ? '失控' : s.economy.inflation.toFixed(1)}
        unit={s.economy.inflation > 999 ? '' : '%'}
        bar={Math.min(100, Math.abs(s.economy.inflation))}
        tone={s.economy.inflation > 25 ? 'bad' : s.economy.inflation > 8 ? 'warn' : 'good'}
      />
      <Mini label="社会信任" value={s.society.trust.toFixed(0)} bar={s.society.trust} />
      <Mini
        label="民主韧性"
        value={s.institutions.democraticResilience.toFixed(0)}
        bar={s.institutions.democraticResilience}
        tone={s.institutions.democraticResilience < 35 ? 'bad' : s.institutions.democraticResilience > 60 ? 'good' : 'warn'}
      />
      <Mini label="外交压力" value={s.diplomacy.isolation.toFixed(0)} bar={s.diplomacy.isolation} />
      <Mini
        label="财政赤字"
        value={s.economy.deficit.toFixed(1)}
        unit="%"
        bar={Math.abs(s.economy.deficit) * 4}
        tone={s.economy.deficit > 8 ? 'bad' : s.economy.deficit > 4 ? 'warn' : 'good'}
      />

      <div className="deco-divider" style={{ margin: '14px 0 10px' }}>
        <i />
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--smoke)', lineHeight: 1.9 }}>
        <div>
          国会席位 <span className="num">{s.parliamentSeatsTotal || '—'}</span> · 门槛{' '}
          <span className="num">{s.parliamentSeatsTotal ? seats.threshold : '—'}</span>
        </div>
        <div>
          执政联盟 <span className="num">{seats.coalition}</span> · 支持 <span className="num">{seats.support}</span>
        </div>
        <div>
          第48条 <span className="num">{s.stats.article48Count}</span> 次 · 依赖度{' '}
          <span className="num">{s.institutions.emergencyDependence.toFixed(0)}</span>
        </div>
        <div style={{ marginTop: 6, color: '#6f6a61' }}>下次选举：{nextElection}</div>
        <div style={{ color: '#6f6a61' }}>最近选举：{s.lastElectionDate ? formatDate(s.lastElectionDate) : '尚未举行'}</div>
      </div>
    </aside>
  );
}
