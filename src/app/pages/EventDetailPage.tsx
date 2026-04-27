import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../store/AppContext';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Edit, Trash2, Users, MapPin, Clock, Link2, Tag, Bell,
  CheckCircle, XCircle, HelpCircle, AlertCircle, UserCheck, Calendar,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: 'bg-blue-600',   text: 'text-white', border: 'border-blue-600',   dot: 'bg-blue-500' },
  green:  { bg: 'bg-green-600',  text: 'text-white', border: 'border-green-600',  dot: 'bg-green-500' },
  purple: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600', dot: 'bg-purple-500' },
  orange: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500', dot: 'bg-orange-500' },
  pink:   { bg: 'bg-pink-600',   text: 'text-white', border: 'border-pink-600',   dot: 'bg-pink-500' },
  cyan:   { bg: 'bg-cyan-600',   text: 'text-white', border: 'border-cyan-600',   dot: 'bg-cyan-500' },
  yellow: { bg: 'bg-yellow-500', text: 'text-white', border: 'border-yellow-500', dot: 'bg-yellow-500' },
  red:    { bg: 'bg-red-600',    text: 'text-white', border: 'border-red-600',    dot: 'bg-red-500' },
};
const STATUS_BADGE: Record<string, string> = {
  published: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700', completed: 'bg-slate-100 text-slate-600',
};
const CATEGORY_BADGE: Record<string, string> = {
  conference: 'bg-blue-100 text-blue-700', workshop: 'bg-green-100 text-green-700',
  meetup: 'bg-purple-100 text-purple-700', webinar: 'bg-orange-100 text-orange-700',
  social: 'bg-pink-100 text-pink-700', other: 'bg-slate-100 text-slate-600',
};
const REMINDER_LABELS: Record<number, string> = {
  15: '15 min', 30: '30 min', 60: '1 hour', 120: '2 hours', 1440: '1 day', 2880: '2 days',
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, getAttendeeStats, getEventAttendees, refreshEventAttendees } = useApp();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  // Refresh attendees from server on mount to pick up self-registrations
  useEffect(() => {
    if (id) refreshEventAttendees(id);
  }, [id]);

  const event = state.events.find(e => e.id === id);
  if (!event) return (
    <div className="p-6 text-center">
      <p className="text-slate-500">Event not found.</p>
      <button onClick={() => navigate('/events')} className="mt-4 text-indigo-600 hover:underline text-sm">Back to Events</button>
    </div>
  );

  const c = COLOR_MAP[event.color] || COLOR_MAP.blue;
  const stats = getAttendeeStats(event.id);
  const recentAttendees = getEventAttendees(event.id).slice(0, 8);
  const capacityPct = event.maxAttendees ? Math.round((stats.total / event.maxAttendees) * 100) : null;

  const handleDelete = () => {
    dispatch({ type: 'DELETE_EVENT', id: event.id });
    toast.success('Event deleted');
    navigate('/events');
  };

  const ATT_STATUS_BADGE: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700', waitlisted: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Top Nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/events')} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-slate-400">Events /</span>
        <span className="text-sm text-slate-600 font-medium truncate max-w-[300px]">{event.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => navigate(`/events/${event.id}/attendees`)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Users className="w-4 h-4" /> Attendees
          </button>
          <button onClick={() => navigate(`/events/${event.id}/analytics`)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>
          <button onClick={() => navigate(`/events/${event.id}/edit`)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className={`${c.bg} rounded-2xl p-6 mb-5 text-white`}>
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize bg-white/20 ${c.text}`}>{event.category}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize bg-white/20 ${c.text}`}>{event.status}</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 opacity-80 shrink-0" />
            <span>{format(parseISO(event.date), 'EEEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 opacity-80 shrink-0" />
            <span>{event.startTime} – {event.endTime}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 sm:col-span-2 lg:col-span-1">
            <MapPin className="w-4 h-4 opacity-80 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          {event.virtualLink && (
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
              <Link2 className="w-4 h-4 opacity-80 shrink-0" />
              <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="truncate underline underline-offset-2 hover:opacity-80">Virtual Link</a>
            </div>
          )}
        </div>
      </div>

      {/* Attendee Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{stats.confirmed.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Confirmed</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{stats.cancelled.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Cancelled</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-500">{stats.waitlisted.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Waitlisted</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-indigo-600">{stats.checkedIn.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Checked In</p>
        </div>
      </div>

      {/* Capacity bar */}
      {event.maxAttendees && (
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Capacity</span>
            <span className="text-sm text-slate-500">{stats.total.toLocaleString()} / {event.maxAttendees.toLocaleString()} ({capacityPct}%)</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${capacityPct! > 90 ? 'bg-red-500' : capacityPct! > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(capacityPct!, 100)}%` }}
            />
          </div>
          {capacityPct! >= 100 && <p className="text-xs text-red-500 mt-1 font-medium">Event is at full capacity</p>}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Description & Details */}
        <div className="lg:col-span-2 space-y-5">
          {event.description && (
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-3">About this Event</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Recent Attendees */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h3 className="font-semibold text-slate-700">Recent Attendees</h3>
              <button onClick={() => navigate(`/events/${event.id}/attendees`)} className="text-xs text-indigo-600 hover:underline">View all {stats.total.toLocaleString()} →</button>
            </div>
            {recentAttendees.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No attendees yet</p>
                <button onClick={() => navigate(`/events/${event.id}/attendees`)} className="mt-3 text-xs text-indigo-600 hover:underline">Add attendees</button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  {recentAttendees.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">{a.name.charAt(0)}</div>
                          <div>
                            <p className="font-medium text-slate-800 text-xs">{a.name}</p>
                            <p className="text-slate-400 text-[10px]">{a.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{a.email}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ATT_STATUS_BADGE[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {a.checkedIn && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">Checked In</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map(t => (
                  <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reminders */}
          {event.reminderMinutes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Bell className="w-4 h-4" />Reminders</h3>
              <div className="space-y-1.5">
                {event.reminderMinutes.map(m => (
                  <div key={m} className="flex items-center gap-2 text-xs text-slate-500">
                    <Bell className="w-3 h-3 text-indigo-400" />
                    <span>{REMINDER_LABELS[m] || `${m} min`} before event</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
            <button onClick={() => navigate(`/events/${event.id}/attendees`)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Users className="w-4 h-4 text-indigo-500" /> Manage Attendees
            </button>
            <button onClick={() => navigate(`/events/${event.id}/edit`)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Edit className="w-4 h-4 text-slate-400" /> Edit Event
            </button>
            <button onClick={() => navigate('/events/new')} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400" /> Duplicate Event
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-slate-800 mb-2">Delete Event</h3>
            <p className="text-sm text-slate-500 mb-5">Deleting "{event.title}" will also remove all {stats.total.toLocaleString()} attendee records. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}