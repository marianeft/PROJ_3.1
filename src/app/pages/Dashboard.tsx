import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../store/AppContext';
import {
  format, isToday, isFuture, isPast, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay,
} from 'date-fns';
import {
  CalendarDays, Users, Clock, TrendingUp, Plus, ArrowRight, MapPin,
  QrCode, Award, Activity, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { AppEvent } from '../types';
import { EventDetailModal } from '../components/modals/EventDetailModal';

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500',
  orange: 'bg-orange-500', pink: 'bg-pink-500', cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500', red: 'bg-red-500',
};

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
};

const CATEGORY_COLORS: Record<string, { bg: string; bar: string }> = {
  conference: { bg: 'rgba(55,138,221,0.15)', bar: '#378ADD' },
  workshop: { bg: 'rgba(29,158,117,0.15)', bar: '#1D9E75' },
  meetup: { bg: 'rgba(127,119,221,0.15)', bar: '#7F77DD' },
  webinar: { bg: 'rgba(239,159,39,0.15)', bar: '#EF9F27' },
  social: { bg: 'rgba(212,83,126,0.15)', bar: '#D4537E' },
  other: { bg: 'rgba(152,171,190,0.15)', bar: '#98ABBE' },
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Dashboard() {
  const { state, getAttendeeStats } = useApp();
  const navigate = useNavigate();
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const events = state.events;
  const totalAttendees = state.attendees.length;
  const todayEvents = events.filter(e => isToday(parseISO(e.date)));
  const upcomingEvents = events
    .filter(e => isFuture(parseISO(`${e.date}T${e.startTime}`)) && e.status === 'published')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const recentEvents = events
    .filter(e => isPast(parseISO(`${e.date}T${e.endTime}`)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    state.attendees.forEach(a => {
      const ev = events.find(e => e.id === a.eventId);
      if (ev) counts[ev.category] = (counts[ev.category] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({
      category: cat,
      count,
      pct: (count / max) * 100,
      ...CATEGORY_COLORS[cat] || CATEGORY_COLORS.other,
    }));
  }, [state.attendees, events]);

  // Activity feed from notifications
  const recentActivity = state.notifications.slice(0, 8);

  // Mini calendar data
  const calDays = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    return { days, startPad };
  }, [calMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    events.forEach(e => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const stats = [
    { label: 'Total Events', value: events.length, icon: CalendarDays, color: 'var(--ad-600)', lightBg: 'rgba(55,138,221,0.1)' },
    { label: "Today's Events", value: todayEvents.length, icon: Clock, color: 'var(--amber)', lightBg: 'rgba(239,159,39,0.1)' },
    { label: 'Total Participants', value: totalAttendees.toLocaleString(), icon: Users, color: 'var(--ad-400)', lightBg: 'rgba(29,158,117,0.1)' },
    { label: 'Upcoming', value: events.filter(e => isFuture(parseISO(e.date)) && e.status === 'published').length, icon: TrendingUp, color: 'var(--bs-600)', lightBg: 'rgba(127,119,221,0.1)' },
  ];

  const cardStyle = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-body)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => navigate('/events/new')}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
          style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {stats.map(({ label, value, icon: Icon, color, lightBg }, i) => (
          <div
            key={label}
            className="p-5 animate-fade-up"
            style={{ ...cardStyle, animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>{label}</p>
                <p className="text-[26px] font-extrabold mt-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: -0.5 }}>{value}</p>
              </div>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: lightBg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="mb-6 p-5 rounded-[var(--radius-lg)] animate-fade-up" style={{ background: 'linear-gradient(135deg, var(--bs-600), var(--ad-600))', boxShadow: 'var(--shadow-btn)' }}>
          <h2 className="text-[10px] font-bold uppercase tracking-[1px] text-white/70 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Today's Events</h2>
          <div className="space-y-2">
            {todayEvents.map(event => {
              const st = getAttendeeStats(event.id);
              return (
                <div
                  key={event.id}
                  onClick={() => { setSelectedEvent(event); setIsModalOpen(true); }}
                  className="bg-white/10 rounded-[10px] p-3 cursor-pointer hover:bg-white/20 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-[13px] text-white" style={{ fontFamily: 'var(--font-display)' }}>{event.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-white/70">
                      <span>{event.startTime} - {event.endTime}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location.split(',')[0]}</span>
                    </div>
                  </div>
                  <div className="text-right text-white/80">
                    <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>{st.total.toLocaleString()}</p>
                    <p className="text-[10px]">attendees</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column: Upcoming + Recent */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Upcoming */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Upcoming Events</h2>
            <button onClick={() => navigate('/events')} className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--bs-600)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {upcomingEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No upcoming events</p>
            ) : (
              upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => { setSelectedEvent(event); setIsModalOpen(true); }}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-all hover:bg-[rgba(127,119,221,0.025)]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className={`w-[3px] h-10 rounded-full shrink-0 ${COLOR_MAP[event.color] || 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>{format(parseISO(event.date), 'MMM d')} · {event.startTime}-{event.endTime}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full ${STATUS_BADGE[event.status]}`}>{event.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Recent Events</h2>
            <button onClick={() => navigate('/calendar')} className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--bs-600)' }}>
              Calendar <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {recentEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No past events</p>
            ) : (
              recentEvents.map(event => {
                const st = getAttendeeStats(event.id);
                return (
                  <div
                    key={event.id}
                    onClick={() => { setSelectedEvent(event); setIsModalOpen(true); }}
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-all hover:bg-[rgba(127,119,221,0.025)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <div className={`w-[3px] h-10 rounded-full shrink-0 ${COLOR_MAP[event.color] || 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>{format(parseISO(event.date), 'MMM d, yyyy')}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>·</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-sec)' }}>{st.total.toLocaleString()} attendees</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Three-column bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.2s' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              <Activity className="w-4 h-4" style={{ color: 'var(--bs-600)' }} /> Activity
            </h2>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No recent activity</p>
            ) : (
              recentActivity.map((n, i) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-5 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)', animationDelay: `${i * 0.03}s` }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--bs-600), var(--ad-600))' }}
                  >
                    AD
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-snug" style={{ color: 'var(--text-sec)' }}>{n.message}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{relativeTime(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registration Breakdown */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.25s' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Registrations by Category</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {catBreakdown.length === 0 ? (
              <p className="text-center text-[13px] py-6" style={{ color: 'var(--text-dim)' }}>No data yet</p>
            ) : (
              catBreakdown.map(({ category, count, pct, bg, bar }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold capitalize" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)' }}>{category}</span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--text)' }}>{count.toLocaleString()}</span>
                  </div>
                  <div className="h-[4px] rounded-full overflow-hidden" style={{ background: bg }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bar }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: QR Scanner shortcut + Mini Calendar */}
        <div className="space-y-4">
          {/* QR Scanner Card */}
          <div
            className="p-5 rounded-[var(--radius-lg)] cursor-pointer transition-all hover:-translate-y-px animate-fade-up"
            style={{
              background: 'linear-gradient(135deg, var(--ad-950), var(--ad-900))',
              boxShadow: 'var(--shadow-card)',
              animationDelay: '0.3s',
            }}
            onClick={() => navigate('/scanner')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(127,119,221,0.2)' }}>
                <QrCode className="w-5 h-5" style={{ color: 'var(--bs-600)' }} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>QR Scanner</p>
                <p className="text-[11px] text-white/50">Quick check-in attendees</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.35s' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--text-sec)' }} />
              </button>
              <span className="text-[12px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {format(calMonth, 'MMMM yyyy')}
              </span>
              <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-sec)' }} />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-bold uppercase" style={{ color: 'var(--text-dim)', letterSpacing: 0.5 }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: calDays.startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                {calDays.days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const isT = isToday(day);
                  return (
                    <div key={dateStr} className="text-center py-1 relative">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 text-[11px] font-medium rounded-full"
                        style={{
                          background: isT ? 'var(--bs-600)' : 'transparent',
                          color: isT ? '#fff' : 'var(--text-sec)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: isT ? 700 : 500,
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, ei) => (
                            <span
                              key={ei}
                              className="w-1 h-1 rounded-full"
                              style={{ background: CATEGORY_COLORS[ev.category]?.bar || 'var(--text-dim)' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Participant Overview Table */}
      <div className="mt-6 animate-fade-up" style={{ ...cardStyle, animationDelay: '0.4s' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Participant Overview by Event</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Event', 'Date', 'Total', 'Confirmed', 'Checked In', 'Capacity'].map(h => (
                  <th key={h} className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px] ${h === 'Event' || h === 'Date' || h === 'Capacity' ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => {
                const st = getAttendeeStats(event.id);
                const pct = event.maxAttendees ? Math.round((st.total / event.maxAttendees) * 100) : null;
                const barColor = pct && pct > 90 ? 'var(--coral)' : pct && pct > 70 ? 'var(--amber)' : 'var(--ad-400)';
                return (
                  <tr
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}/attendees`)}
                    className="cursor-pointer transition-all hover:bg-[rgba(127,119,221,0.025)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${COLOR_MAP[event.color] || 'bg-slate-400'}`} />
                        <span className="text-[13px] font-semibold truncate max-w-[200px]" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{event.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--text-sec)' }}>{format(parseISO(event.date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-right text-[13px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{st.total.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-[13px] font-semibold" style={{ color: 'var(--ad-400)' }}>{st.confirmed.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-[13px] font-semibold" style={{ color: 'var(--bs-600)' }}>{st.checkedIn.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden min-w-[60px]" style={{ background: 'var(--surface2)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="text-[11px] font-medium w-8" style={{ color: 'var(--text-sec)' }}>{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Unlimited</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
        onEdit={(event) => navigate(`/events/${event.id}/edit`)}
      />
    </div>
  );
}
