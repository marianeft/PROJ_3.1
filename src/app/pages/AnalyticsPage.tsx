import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../store/AppContext';
import { format, parseISO, differenceInDays, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import {
  ArrowLeft, Users, TrendingUp, Award, CheckCircle, Clock,
  BarChart3, PieChart, Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';

const SECTOR_COLORS = ['#7F77DD', '#378ADD', '#1D9E75', '#EF9F27', '#D4537E', '#E85D24', '#6EC9A8', '#2a2550'];

export function AnalyticsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { state, getEventAttendees, getAttendeeStats } = useApp();
  const navigate = useNavigate();

  const event = state.events.find(e => e.id === eventId);
  const attendees = getEventAttendees(eventId!);
  const stats = getAttendeeStats(eventId!);

  // Registration over time (last 30 days leading to event)
  const registrationTrend = useMemo(() => {
    if (!event || attendees.length === 0) return [];
    const sorted = [...attendees].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    const firstReg = parseISO(sorted[0].registeredAt);
    const lastReg = parseISO(sorted[sorted.length - 1].registeredAt);
    const start = startOfDay(firstReg);
    const end = startOfDay(lastReg);
    const days = eachDayOfInterval({ start, end });
    if (days.length > 60) {
      // Group by week
      const weekly: { date: string; count: number; cumulative: number }[] = [];
      let cum = 0;
      for (let i = 0; i < days.length; i += 7) {
        const weekEnd = days[Math.min(i + 6, days.length - 1)];
        const weekCount = attendees.filter(a => {
          const d = startOfDay(parseISO(a.registeredAt));
          return d >= days[i] && d <= weekEnd;
        }).length;
        cum += weekCount;
        weekly.push({ date: format(days[i], 'MMM d'), count: weekCount, cumulative: cum });
      }
      return weekly;
    }
    let cumulative = 0;
    return days.map(day => {
      const count = attendees.filter(a => format(parseISO(a.registeredAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length;
      cumulative += count;
      return { date: format(day, 'MMM d'), count, cumulative };
    });
  }, [event, attendees]);

  // Status breakdown
  const statusBreakdown = useMemo(() => [
    { name: 'Confirmed', value: stats.confirmed, color: '#1D9E75' },
    { name: 'Pending', value: stats.pending, color: '#EF9F27' },
    { name: 'Waitlisted', value: stats.waitlisted, color: '#E85D24' },
    { name: 'Cancelled', value: stats.cancelled, color: '#C04040' },
  ].filter(s => s.value > 0), [stats]);

  // Sector breakdown
  const sectorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    attendees.forEach(a => {
      const sector = a.sector || 'Unspecified';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }));
  }, [attendees]);

  // Certificate stats
  const certsSent = attendees.filter(a => a.certificateSentAt).length;
  const checkedIn = attendees.filter(a => a.checkedIn).length;
  const certRate = checkedIn > 0 ? Math.round((certsSent / checkedIn) * 100) : 0;

  const cardStyle: React.CSSProperties = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' };

  if (!event) return (
    <div className="p-6 text-center">
      <p style={{ color: 'var(--text-sec)' }}>Event not found.</p>
      <button onClick={() => navigate('/events')} className="mt-4 text-[13px] hover:underline" style={{ color: 'var(--bs-600)' }}>Back to Events</button>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 animate-fade-up">
        <button onClick={() => navigate(`/events/${eventId}`)} className="p-2 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-dim)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => navigate('/events')} className="text-[13px]" style={{ color: 'var(--text-dim)' }}>Events</button>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span className="text-[13px] truncate max-w-[200px]" style={{ color: 'var(--text-sec)' }}>{event.title}</span>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Analytics</span>
      </div>

      {/* Header */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <h1 style={{ color: 'var(--text)' }}>Event Analytics</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-sec)' }}>{event.title} — {format(parseISO(event.date), 'MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        {[
          { label: 'Total Registrations', value: stats.total.toLocaleString(), icon: Users, color: 'var(--ad-600)', bg: 'rgba(55,138,221,0.1)' },
          { label: 'Confirmed', value: stats.confirmed.toLocaleString(), icon: CheckCircle, color: 'var(--ad-400)', bg: 'rgba(29,158,117,0.1)' },
          { label: 'Checked In', value: checkedIn.toLocaleString(), icon: TrendingUp, color: 'var(--bs-600)', bg: 'rgba(127,119,221,0.1)' },
          { label: 'Certificates Sent', value: certsSent.toLocaleString(), icon: Award, color: 'var(--amber)', bg: 'rgba(239,159,39,0.1)' },
          { label: 'Cert Delivery Rate', value: `${certRate}%`, icon: BarChart3, color: 'var(--ad-400)', bg: 'rgba(29,158,117,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <div key={label} className="p-5 animate-fade-up" style={{ ...cardStyle, animationDelay: `${0.1 + i * 0.05}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>{label}</p>
                <p className="text-[22px] font-extrabold mt-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: -0.5 }}>{value}</p>
              </div>
              <div className="w-9 h-9 rounded-[8px] flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Registration Growth */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.35s' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--bs-600)' }} /> Registration Growth
            </h2>
          </div>
          <div className="p-5">
            {registrationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={registrationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="cumulative" stroke="#7F77DD" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="count" stroke="#378ADD" strokeWidth={1.5} dot={false} name="Daily" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-dim)' }}>No registration data yet</p>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.4s' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              <PieChart className="w-4 h-4" style={{ color: 'var(--ad-400)' }} /> Status Breakdown
            </h2>
          </div>
          <div className="p-5 flex items-center justify-center">
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-dim)' }}>No attendees yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Sector Distribution */}
      <div className="animate-fade-up" style={{ ...cardStyle, animationDelay: '0.45s' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--amber)' }} /> Sector Distribution
          </h2>
        </div>
        <div className="p-5">
          {sectorBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorBreakdown} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-sec)' }} width={80} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Attendees">
                  {sectorBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-dim)' }}>No sector data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
