import { useGame, type PageId } from '../store/useGame';

const NAV: { section?: string; id?: PageId; zh?: string; en?: string }[] = [
  { section: '观察' },
  { id: 'overview', zh: '国家总览', en: 'Overview' },
  { id: 'government', zh: '政府与政党', en: 'Gov & Parties' },
  { id: 'elections', zh: '选举中心', en: 'Elections' },
  { section: '政治' },
  { id: 'parties', zh: '政党与人物', en: 'Parties' },
  { id: 'parliament', zh: '政府与议会', en: 'Parliament' },
  { section: '结构' },
  { id: 'economy', zh: '经济与财政', en: 'Economy' },
  { id: 'society', zh: '社会与秩序', en: 'Society' },
  { id: 'diplomacy', zh: '外交与国际', en: 'Diplomacy' },
  { id: 'map', zh: '历史地图', en: 'Map' },
  { section: '档案' },
  { id: 'events', zh: '事件档案', en: 'Archive' },
  { id: 'report', zh: '结局报告', en: 'Report' },
];

export function SideNav() {
  const { page, setPage } = useGame();
  let idx = 0;
  return (
    <nav className="sidenav">
      {NAV.map((n, i) => {
        if (n.section) return <div className="nav-section" key={`s${i}`}>{n.section}</div>;
        idx++;
        return (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id!)}>
            <span className="idx">{String(idx).padStart(2, '0')}</span>
            <span>{n.zh}</span>
            <span className="en">{n.en}</span>
          </button>
        );
      })}
      <div style={{ padding: '22px 18px 0' }}>
        <div className="srcline" style={{ lineHeight: 1.7 }}>
          © Eumenes
          <br />
          Weimar Republic — The Fall of Democracy.
          <br />
          Historical simulation and educational project.
        </div>
      </div>
    </nav>
  );
}
