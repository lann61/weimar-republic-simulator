import { useEffect, useState } from 'react';

const OWNER_KEY = 'weimar_owner';
const VISITED_KEY = 'weimar_visited';

/** 只有创作者可见：访问页时带 ?owner=1 一次，之后该浏览器记住 */
function resolveOwner(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('owner') === '1') {
      localStorage.setItem(OWNER_KEY, '1');
      return true;
    }
    return localStorage.getItem(OWNER_KEY) === '1';
  } catch {
    return false;
  }
}

let countedThisPage = false;

export function VisitCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    setOwner(resolveOwner());
    if (countedThisPage) return;
    countedThisPage = true;

    let seen = false;
    try {
      seen = localStorage.getItem(VISITED_KEY) === '1';
    } catch {
      /* 隐私模式下忽略 */
    }

    const params = new URLSearchParams(window.location.search);
    const sharecode = params.get('sharecode');
    const query = sharecode ? `?sharecode=${encodeURIComponent(sharecode)}` : '';
    const endpoint = (seen ? '/api/visits' : '/api/visit') + query;
    fetch(endpoint, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.count === 'number') {
          setCount(d.count);
          try {
            localStorage.setItem(VISITED_KEY, '1');
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* 开发环境无该接口时静默忽略 */
      });
  }, []);

  if (!owner) return null;

  return (
    <div
      title="仅创作者可见"
      style={{
        position: 'fixed',
        right: '12px',
        bottom: '12px',
        zIndex: 9999,
        padding: '4px 10px',
        borderRadius: '999px',
        background: 'rgba(20, 19, 18, 0.88)',
        border: '1px solid rgba(185, 154, 98, 0.45)',
        color: '#b99a62',
        fontSize: '12px',
        letterSpacing: '0.04em',
        pointerEvents: 'none',
        userSelect: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      访问 {count ?? '—'} 人次
    </div>
  );
}
