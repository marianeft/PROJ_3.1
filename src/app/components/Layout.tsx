import { Outlet, NavLink, useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Calendar, CalendarDays, Bell, Settings, Plus, Search,
  ChevronLeft, X, Download, CheckSquare, Wifi, WifiOff, RefreshCw,
  LogOut, QrCode, Moon, Sun, Award,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';
import { LoadingScreen } from './LoadingScreen';
import { EventDetailModal } from './modals/EventDetailModal';
import type { AppEvent } from '../types';

const NAV_LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/events', icon: CalendarDays, label: 'Events', badge: 'events' as const },
  { to: '/scanner', icon: QrCode, label: 'QR Scanner' },
  { to: '/certificates', icon: Award, label: 'Certificates' },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('em_theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('em_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(d => !d)] as const;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { state, dispatch, isOnline, isSyncing } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!state.initialized) return <LoadingScreen />;

  const unread = state.notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const markAllRead = () => dispatch({ type: 'CLEAR_NOTIFICATIONS' });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300 flex flex-col shrink-0 z-30 relative`}
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(55,138,221,0.08)' }}
      >
        {/* Atmospheric glow */}
        <div
          className="absolute top-0 left-0 right-0 h-44 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(127,119,221,0.18) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--bs-600), var(--ad-600))' }}
          >
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#E8F4FF', letterSpacing: -0.3 }}>
              EventsManager
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-2 py-4 space-y-1">
          {NAV_LINKS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-all duration-170 ${
                  isActive
                    ? 'text-white font-bold'
                    : 'font-medium hover:bg-white/[0.06] hover:text-white'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--bs-600)', color: '#fff', boxShadow: 'var(--shadow-nav)' }
                  : { color: 'var(--sidebar-text)' }
              }
            >
              <Icon className="w-4 h-4 shrink-0" style={{ opacity: 0.85 }} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && badge === 'events' && (
                <span
                  className="ml-auto text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--bs-400)' }}
                >
                  {state.events.length}
                </span>
              )}
            </NavLink>
          ))}

          {/* Separator */}
          <div className="pt-3 pb-1 px-3">
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
            {sidebarOpen && (
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[1px]" style={{ color: 'var(--sidebar-dim)' }}>
                Quick Actions
              </p>
            )}
          </div>

          {/* New Event */}
          <button
            onClick={() => navigate('/events/new')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-all duration-170 font-medium"
            style={{ background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.18)', color: 'var(--ad-100)' }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>New Event</span>}
          </button>
        </nav>

        {/* Bottom */}
        <div className="relative px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {(isInstallable || isIOS) && !isInstalled && (
            <button
              onClick={() => setShowInstallModal(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] text-indigo-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Download className="w-4 h-4 shrink-0" />
              {sidebarOpen && (
                <span className="flex items-center gap-2">
                  Install App
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bs-600)' }}>NEW</span>
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-all hover:bg-white/[0.06] hover:text-white"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-all hover:bg-white/[0.06] hover:text-white"
            style={{ color: 'var(--sidebar-text)', opacity: 0.6 }}
          >
            <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            {sidebarOpen && <span>Collapse</span>}
          </button>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-all hover:bg-[rgba(224,96,96,0.1)]"
            style={{ color: '#E06060' }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-4 px-6 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 58 }}
        >
          <form onSubmit={handleSearch} className="flex-1 max-w-[380px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-9 pr-4 py-2 text-[13px] rounded-[9px] border focus:outline-none transition-all"
              style={{
                background: 'var(--surface2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--bs-600)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(127,119,221,0.1)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </form>

          <div className="flex items-center gap-3 ml-auto">
            {/* Sync pill */}
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={
                isSyncing
                  ? { background: 'rgba(239,159,39,0.08)', border: '1px solid rgba(239,159,39,0.18)', color: 'var(--amber)' }
                  : isOnline
                  ? { background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.18)', color: 'var(--ad-400)' }
                  : { background: 'rgba(239,159,39,0.08)', border: '1px solid rgba(239,159,39,0.18)', color: 'var(--amber)' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: isSyncing ? 'var(--amber)' : isOnline ? 'var(--ad-400)' : 'var(--amber)' }}
              />
              {isSyncing ? 'Saving...' : isOnline ? 'Synced' : 'Offline'}
            </span>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--text-sec)' }}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--text-sec)' }}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--bs-400)' }} />
              )}
            </button>

            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--bs-800), var(--bs-600))', border: '2px solid var(--bs-600)' }}
              title="Admin"
            >
              AD
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>

      {/* Notifications Panel */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div
            className="fixed z-50 rounded-xl overflow-hidden animate-fade-down"
            style={{
              top: 62, right: 16, width: 320,
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-float)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Notifications</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-medium hover:underline" style={{ color: 'var(--bs-600)' }}>
                    Mark all read
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} style={{ color: 'var(--text-dim)' }} className="hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {state.notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No notifications</div>
              ) : (
                state.notifications.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    onClick={() => { dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id }); const event = state.events.find(e => e.id === n.eventId); if (event) { setSelectedEvent(event); setIsModalOpen(true); } setNotifOpen(false); }}
                    className="px-4 py-3 cursor-pointer transition-colors hover:opacity-90"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      borderLeft: !n.read ? '3px solid var(--bs-600)' : '3px solid transparent',
                      background: !n.read ? 'var(--bs-50)' : 'transparent',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: !n.read ? 'rgba(127,119,221,0.12)' : 'var(--surface2)',
                        }}
                      >
                        <Bell className="w-3.5 h-3.5" style={{ color: !n.read ? 'var(--bs-600)' : 'var(--text-dim)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] leading-snug" style={{ color: 'var(--text-sec)' }}>{n.message}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{relativeTime(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-[7px] h-[7px] rounded-full mt-1.5 shrink-0" style={{ background: 'var(--bs-600)' }} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <InstallModal
          isIOS={isIOS}
          onInstall={install}
          onClose={() => setShowInstallModal(false)}
        />
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={(event) => navigate(`/events/${event.id}/edit`)}
      />
    </div>
  );
}
