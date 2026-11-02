import type { ReactNode } from 'react';

export function Panel({
  title,
  sub,
  right,
  children,
  style,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className="panel" style={style}>
      {(title || right) && (
        <div className="panel-head">
          <div>
            {title && <div className="panel-title">{title}</div>}
            {sub && <div className="panel-sub">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  unit,
  delta,
  tone,
  small,
  bar,
  hint,
  onClick,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  tone?: 'good' | 'bad' | 'warn' | '';
  small?: boolean;
  bar?: number;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <div className="metric" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined} title={hint}>
      <div className="label">
        <span>{label}</span>
        {delta && <span className={`num ${tone}`}>{delta}</span>}
      </div>
      <div className={`value ${small ? 'sm' : ''} ${tone ?? ''}`}>
        {value}
        {unit && <span style={{ fontSize: 12, color: 'var(--smoke)', marginLeft: 3 }}>{unit}</span>}
      </div>
      {typeof bar === 'number' && (
        <div className="bar">
          <i style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </div>
      )}
    </div>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'wine' | 'forest' | 'brass' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}

export function SeatStrip({
  segments,
  total,
  threshold,
}: {
  segments: { color: string; value: number; label?: string }[];
  total: number;
  threshold?: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="seat-strip">
        {segments.map((s, i) => (
          <i key={i} style={{ width: `${(s.value / Math.max(1, total)) * 100}%`, background: s.color }} title={`${s.label ?? ''} ${s.value}`} />
        ))}
      </div>
      {threshold !== undefined && total > 0 && (
        <div
          style={{
            position: 'absolute',
            left: `${(threshold / total) * 100}%`,
            top: -6,
            bottom: -6,
            width: 1,
            background: 'var(--brass)',
            opacity: 0.9,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: -15,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 8.5,
              color: 'var(--brass)',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            多数 {threshold}
          </span>
        </div>
      )}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function KV({ k, v, note }: { k: string; v: ReactNode; note?: string }) {
  return (
    <div className="kv">
      <span className="k">
        {k}
        {note && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>{note}</span>}
      </span>
      <span className="v">{v}</span>
    </div>
  );
}

export function Divider() {
  return (
    <div className="deco-divider">
      <i />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '26px 0', textAlign: 'center', color: 'var(--smoke)', fontSize: 12.5, letterSpacing: '0.05em' }}>{text}</div>
  );
}
