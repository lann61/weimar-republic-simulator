import { useEffect } from 'react';
import { useGame } from './store/useGame';
import { TopBar } from './components/TopBar';
import { SideNav } from './components/SideNav';
import { StatusRail } from './components/StatusRail';
import { EventModal } from './components/EventModal';
import { StartScreen } from './pages/StartScreen';
import { OverviewPage } from './pages/OverviewPage';
import { GovernmentPage } from './pages/GovernmentPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { PartiesPage } from './pages/PartiesPage';
import { ParliamentPage } from './pages/ParliamentPage';
import { EconomyPage } from './pages/EconomyPage';
import { SocietyPage } from './pages/SocietyPage';
import { DiplomacyPage } from './pages/DiplomacyPage';
import { EventsPage } from './pages/EventsPage';
import { MapPage } from './pages/MapPage';
import { ReportPage } from './pages/ReportPage';
import { partyMap } from './data/parties';
import { formatDate } from './simulation/engine/date';

const SPEED_MS: Record<number, number> = { 1: 1200, 4: 400, 12: 140 };

export default function App() {
  const { state, page, speed, advance, toast, setToast, showStart } = useGame();

  useEffect(() => {
    if (!state || speed === 0 || state.pendingEvent || state.meta.ended) return;
    const t = window.setInterval(() => advance(), SPEED_MS[speed] ?? 1200);
    return () => window.clearInterval(t);
  }, [state, speed, advance]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  if (showStart || !state) return <StartScreen />;

  return (
    <div className="app">
      <div className="brand-cell">
        <div className="mark">WEIMAR</div>
        <div className="sub">Republic · 1918—1934</div>
      </div>
      <TopBar />
      <SideNav />
      <main className="main">
        {page === 'overview' && <OverviewPage />}
        {page === 'government' && <GovernmentPage />}
        {page === 'elections' && <ElectionsPage />}
        {page === 'parties' && <PartiesPage />}
        {page === 'parliament' && <ParliamentPage />}
        {page === 'economy' && <EconomyPage />}
        {page === 'society' && <SocietyPage />}
        {page === 'diplomacy' && <DiplomacyPage />}
        {page === 'events' && <EventsPage />}
        {page === 'map' && <MapPage />}
        {page === 'report' && <ReportPage />}
      </main>
      <StatusRail />
      <footer className="ticker">
        <span className="tag">要闻</span>
        <span>
          {state.news.length > 0
            ? `${formatDate(state.date)} · ${state.news[state.news.length - 1].headline} — ${state.news[state.news.length - 1].body}`
            : '推进时间以生成月度要闻'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--brass)' }}>
          {state.government.parties.map((p) => partyMap.get(p)?.short_name).join(' / ') || '无党派政府'}
        </span>
      </footer>

      <EventModal />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
