import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../store/AppContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  parseISO, getHours, getMinutes
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { AppEvent } from '../types';
import { EventDetailModal } from '../components/modals/EventDetailModal';

type CalView = 'month' | 'week' | 'day';

const COLOR_MAP: Record<string, { bg: string; dot: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-50',   dot: 'bg-blue-500',   text: 'text-blue-700',   border: 'border-blue-300' },
  green:  { bg: 'bg-green-50',  dot: 'bg-green-500',  text: 'text-green-700',  border: 'border-green-300' },
  purple: { bg: 'bg-purple-50', dot: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-300' },
  orange: { bg: 'bg-orange-50', dot: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300' },
  pink:   { bg: 'bg-pink-50',   dot: 'bg-pink-500',   text: 'text-pink-700',   border: 'border-pink-300' },
  cyan:   { bg: 'bg-cyan-50',   dot: 'bg-cyan-500',   text: 'text-cyan-700',   border: 'border-cyan-300' },
  yellow: { bg: 'bg-yellow-50', dot: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-300' },
  red:    { bg: 'bg-red-50',    dot: 'bg-red-500',    text: 'text-red-700',    border: 'border-red-300' },
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am – 10pm
const HOUR_HEIGHT = 64; // px per hour

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function EventBlock({ event, onClickEvent }: { event: AppEvent; onClickEvent: (event: AppEvent) => void }) {
  const c = COLOR_MAP[event.color] || COLOR_MAP.blue;
  const start = parseTime(event.startTime);
  const end = parseTime(event.endTime);
  const top = ((start - 6 * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 24);
  return (
    <div
      onClick={() => onClickEvent(event)}
      className={`absolute left-0.5 right-0.5 rounded ${c.bg} border-l-2 ${c.border} px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
      style={{ top, height }}
    >
      <p className={`text-xs font-semibold truncate ${c.text}`}>{event.title}</p>
      {height > 30 && <p className={`text-[10px] ${c.text} opacity-70`}>{event.startTime}</p>}
    </div>
  );
}

export function CalendarPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<CalView>('month');
  const [current, setCurrent] = useState(new Date('2026-03-12'));
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const eventsOnDate = (date: Date) =>
    state.events.filter(e => isSameDay(parseISO(e.date), date));

  // Navigation
  const prev = () => {
    if (view === 'month') setCurrent(subMonths(current, 1));
    else if (view === 'week') setCurrent(subWeeks(current, 1));
    else setCurrent(subDays(current, 1));
  };
  const next = () => {
    if (view === 'month') setCurrent(addMonths(current, 1));
    else if (view === 'week') setCurrent(addWeeks(current, 1));
    else setCurrent(addDays(current, 1));
  };
  const goToday = () => setCurrent(new Date('2026-03-12'));

  const headerLabel = useMemo(() => {
    if (view === 'month') return format(current, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(current, { weekStartsOn: 0 });
      const we = endOfWeek(current, { weekStartsOn: 0 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(current, 'EEEE, MMMM d, yyyy');
  }, [view, current]);

  // Month grid
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  // Week grid
  const weekDays = useMemo(() => {
    const start = startOfWeek(current, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [current]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ color: 'var(--text)' }}>Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex p-1 rounded-[var(--radius-sm)] text-[13px]" style={{ background: 'var(--surface2)' }}>
            {(['month', 'week', 'day'] as CalView[]).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1 rounded-[6px] capitalize font-semibold transition-all" style={{
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text-sec)',
                boxShadow: view === v ? 'var(--shadow-card)' : 'none',
                fontFamily: 'var(--font-display)',
              }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center overflow-hidden rounded-[var(--radius-sm)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={prev} className="p-2 hover:opacity-70 transition-colors" style={{ color: 'var(--text-sec)' }}><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={goToday} className="px-3 py-1.5 text-[13px] font-semibold hover:opacity-70 transition-colors" style={{ color: 'var(--text)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontFamily: 'var(--font-display)' }}>Today</button>
            <button onClick={next} className="p-2 hover:opacity-70 transition-colors" style={{ color: 'var(--text-sec)' }}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <span className="text-[13px] font-bold min-w-[200px] text-center" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{headerLabel}</span>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map(day => {
              const dayEvents = eventsOnDate(day);
              const inMonth = isSameMonth(day, current);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { setCurrent(day); setView('day'); }}
                  className={`min-h-[100px] p-1.5 border-b border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!inMonth ? 'bg-slate-50/50' : ''}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium mb-1`} style={{
                    background: today ? 'var(--bs-600)' : 'transparent',
                    color: today ? '#fff' : inMonth ? 'var(--text-sec)' : 'var(--text-dim)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: today ? 700 : 500,
                  }}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(evt => {
                      const c = COLOR_MAP[evt.color] || COLOR_MAP.blue;
                      return (
                        <div
                          key={evt.id}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(evt); setIsModalOpen(true); }}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${c.bg} ${c.text} cursor-pointer`}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100">
            <div className="p-2" />
            {weekDays.map(day => (
              <div key={day.toISOString()} onClick={() => { setCurrent(day); setView('day'); }} className={`p-2 text-center cursor-pointer hover:bg-slate-50 border-l border-slate-100 ${isToday(day) ? 'bg-indigo-50' : ''}`}>
                <p className="text-xs text-slate-500">{format(day, 'EEE')}</p>
                <p className={`text-sm font-semibold mt-0.5 ${isToday(day) ? 'text-indigo-600' : 'text-slate-700'}`}>{format(day, 'd')}</p>
              </div>
            ))}
          </div>
          {/* Time grid */}
          <div className="overflow-y-auto max-h-[600px]">
            <div className="relative grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: HOURS.length * HOUR_HEIGHT }}>
              {/* Time labels */}
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="absolute right-2 text-[10px] text-slate-400 -translate-y-2" style={{ top: (h - 6) * HOUR_HEIGHT }}>
                    {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {weekDays.map(day => {
                const dayEvents = eventsOnDate(day);
                return (
                  <div key={day.toISOString()} className="relative border-l border-slate-100">
                    {HOURS.map(h => (
                      <div key={h} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
                    ))}
                    {dayEvents.map(evt => (
                      <EventBlock key={evt.id} event={evt} onClickEvent={(event) => { setSelectedEvent(event); setIsModalOpen(true); }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50">
            <h2 className="font-semibold text-indigo-800">{format(current, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-xs text-indigo-600 mt-0.5">{eventsOnDate(current).length} event(s) today</p>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            <div className="relative grid grid-cols-[60px_1fr]" style={{ height: HOURS.length * HOUR_HEIGHT }}>
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="absolute right-2 text-[10px] text-slate-400 -translate-y-2" style={{ top: (h - 6) * HOUR_HEIGHT }}>
                    {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                  </div>
                ))}
              </div>
              <div className="relative border-l border-slate-100">
                {HOURS.map(h => (
                  <div key={h} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
                ))}
                {eventsOnDate(current).map(evt => (
                  <EventBlock key={evt.id} event={evt} onClickEvent={(event) => { setSelectedEvent(event); setIsModalOpen(true); }} />
                ))}
              </div>
            </div>
          </div>

          {/* Event list for the day */}
          {eventsOnDate(current).length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Events</h3>
              <div className="space-y-2">
                {eventsOnDate(current).map(evt => {
                  const c = COLOR_MAP[evt.color] || COLOR_MAP.blue;
                  return (
                    <div key={evt.id} onClick={() => { setSelectedEvent(evt); setIsModalOpen(true); }} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className={`w-3 h-3 rounded-full ${c.dot} shrink-0`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{evt.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{evt.startTime} – {evt.endTime}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location.split(',')[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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