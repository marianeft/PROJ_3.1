import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../store/AppContext';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { Plus, Search, Trash2, Edit, Eye, Users, X, Copy, Upload, Loader2 } from 'lucide-react';
import type { AppEvent, EventCategory, EventStatus } from '../types';
import { toast } from 'sonner';
import { EventDetailModal } from '../components/modals/EventDetailModal';

const COLOR_DOT: Record<string, string> = {
  blue: '#378ADD', green: '#1D9E75', purple: '#7F77DD',
  orange: '#EF9F27', pink: '#D4537E', cyan: '#22D3EE',
  yellow: '#EAB308', red: '#EF4444',
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  conference: { bg: 'rgba(55,138,221,0.15)', color: '#1060A0' },
  workshop: { bg: 'rgba(29,158,117,0.15)', color: '#166B50' },
  meetup: { bg: 'rgba(127,119,221,0.15)', color: '#5A52B0' },
  webinar: { bg: 'rgba(239,159,39,0.15)', color: '#A06B10' },
  social: { bg: 'rgba(212,83,126,0.15)', color: '#A02E55' },
  other: { bg: 'rgba(152,171,190,0.15)', color: '#4A6080' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  published: { bg: 'rgba(29,158,117,0.12)', color: '#1D9E75' },
  draft: { bg: 'rgba(152,171,190,0.12)', color: '#4A6080' },
  cancelled: { bg: 'rgba(192,64,64,0.12)', color: '#C04040' },
  completed: { bg: 'rgba(152,171,190,0.12)', color: '#4A6080' },
};

const PAGE_SIZE = 20;

export function EventsPage() {
  const { state, dispatch, getAttendeeStats } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const [status, setStatus] = useState<EventStatus | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'title' | 'attendees'>('date-desc');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<AppEvent[]>([]);
  const [csvError, setCsvError] = useState('');
  const csvFileRef = useRef<HTMLInputElement>(null);
  
  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const parseCsvEvents = (text: string) => {
    setCsvError('');
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { setCsvError('CSV must have a header row and at least one data row.'); setCsvPreview([]); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const titleIdx = headers.findIndex(h => h.includes('title'));
    const dateIdx = headers.findIndex(h => h === 'date');
    if (titleIdx === -1 || dateIdx === -1) { setCsvError('CSV must have "title" and "date" columns.'); setCsvPreview([]); return; }
    const rows: AppEvent[] = lines.slice(1).map((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const cat = (cols[headers.findIndex(h => h.includes('category'))] || 'conference').toLowerCase() as EventCategory;
      const status = (cols[headers.findIndex(h => h.includes('status'))] || 'draft').toLowerCase() as EventStatus;
      const now = new Date().toISOString();
      return {
        id: `evt-import-${Date.now()}-${i}`,
        title: cols[titleIdx] || '',
        description: cols[headers.findIndex(h => h.includes('description'))] || '',
        date: cols[dateIdx] || '',
        startTime: cols[headers.findIndex(h => h.includes('start'))] || '09:00',
        endTime: cols[headers.findIndex(h => h.includes('end'))] || '17:00',
        location: cols[headers.findIndex(h => h.includes('location'))] || '',
        category: (['conference','workshop','meetup','webinar','social','other'].includes(cat) ? cat : 'conference') as EventCategory,
        color: 'blue',
        status: (['draft','published','cancelled','completed'].includes(status) ? status : 'draft') as EventStatus,
        maxAttendees: parseInt(cols[headers.findIndex(h => h.includes('capacity') || h.includes('max'))]) || undefined,
        reminderMinutes: [60],
        tags: (cols[headers.findIndex(h => h.includes('tags'))] || '').split(';').map(t => t.trim()).filter(Boolean),
        googleFormUrl: cols[headers.findIndex(h => h.includes('form_url') || h.includes('google_form'))] || undefined,
        createdAt: now,
        updatedAt: now,
      };
    }).filter(e => e.title && e.date);
    setCsvPreview(rows);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setCsvText(text); parseCsvEvents(text); };
    reader.readAsText(file);
  };

  const handleBulkEventImport = () => {
    csvPreview.forEach(ev => dispatch({ type: 'ADD_EVENT', event: ev }));
    toast.success(`${csvPreview.length} events imported`);
    setShowBulkImport(false);
    setCsvText('');
    setCsvPreview([]);
  };

  const filtered = useMemo(() => {
    let list = [...state.events];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)));
    }
    if (category !== 'all') list = list.filter(e => e.category === category);
    if (status !== 'all') list = list.filter(e => e.status === status);
    if (timeFilter === 'upcoming') list = list.filter(e => isFuture(parseISO(`${e.date}T${e.startTime}`)));
    else if (timeFilter === 'past') list = list.filter(e => isPast(parseISO(`${e.date}T${e.endTime}`)));
    else if (timeFilter === 'today') list = list.filter(e => isToday(parseISO(e.date)));
    list.sort((a, b) => {
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'attendees') return getAttendeeStats(b.id).total - getAttendeeStats(a.id).total;
      return 0;
    });
    return list;
  }, [state.events, search, category, status, timeFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_EVENT', id });
    toast.success('Event deleted');
    setDeleteId(null);
  };

  const handleDuplicate = (event: AppEvent) => {
    const newEvent: AppEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${event.title} (Copy)`,
      status: 'draft',
      googleFormUrl: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_EVENT', event: newEvent });
    toast.success(`Duplicated as "${newEvent.title}"`);
  };

  const clearFilters = () => { setSearch(''); setCategory('all'); setStatus('all'); setTimeFilter('all'); setPage(1); };
  const hasFilters = search || category !== 'all' || status !== 'all' || timeFilter !== 'all';

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', fontSize: 13, padding: '8px 12px', fontFamily: 'var(--font-body)',
  };

  const cardStyle = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 style={{ color: 'var(--text)' }}>Events</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-sec)' }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontFamily: 'var(--font-display)' }}
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => navigate('/events/new')}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px"
            style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 mb-4 animate-fade-up" style={{ ...cardStyle, animationDelay: '0.05s' }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search events..."
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-[var(--radius-sm)] focus:outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <select value={category} onChange={e => { setCategory(e.target.value as any); setPage(1); }} style={selectStyle} className="cursor-pointer">
            <option value="all">All Categories</option>
            {['conference','workshop','meetup','webinar','social','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1); }} style={selectStyle} className="cursor-pointer">
            <option value="all">All Statuses</option>
            {['published','draft','cancelled','completed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={timeFilter} onChange={e => { setTimeFilter(e.target.value as any); setPage(1); }} style={selectStyle} className="cursor-pointer">
            <option value="all">All Time</option>
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="past">Past</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={selectStyle} className="cursor-pointer">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title">A-Z</option>
            <option value="attendees">Most Attendees</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[12px] transition-colors" style={{ color: 'var(--text-sec)' }}>
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden animate-fade-up" style={{ ...cardStyle, animationDelay: '0.1s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Event', 'Date & Time', 'Location', 'Category', 'Attendees', 'Status', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[0.8px] ${
                      h === 'Attendees' || h === 'Actions' ? 'text-right' : 'text-left'
                    } ${h === 'Location' ? 'hidden md:table-cell' : ''}`}
                    style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No events found</td></tr>
              ) : paged.map((event, i) => {
                const st = getAttendeeStats(event.id);
                const pct = event.maxAttendees ? Math.round((st.total / event.maxAttendees) * 100) : null;
                const barColor = pct && pct > 90 ? 'var(--coral)' : pct && pct > 70 ? 'var(--amber)' : 'var(--ad-400)';
                const catS = CATEGORY_STYLE[event.category] || CATEGORY_STYLE.other;
                const statS = STATUS_STYLE[event.status] || STATUS_STYLE.draft;
                return (
                  <tr
                    key={event.id}
                    onClick={() => { setSelectedEvent(event); setIsModalOpen(true); }}
                    className="cursor-pointer transition-all hover:bg-[rgba(127,119,221,0.025)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR_DOT[event.color] || '#98ABBE' }} />
                        <div>
                          <p className="text-[13px] font-bold max-w-[220px] truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{event.title}</p>
                          {event.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {event.tags.slice(0, 2).map(t => (
                                <span key={t} className="text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{format(parseISO(event.date), 'MMM d, yyyy')}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{event.startTime} - {event.endTime}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-[160px]">
                      <span className="text-[13px] truncate block" style={{ color: 'var(--text-sec)' }}>{event.location.split(',')[0]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-[5px] capitalize"
                        style={{ background: catS.bg, color: catS.color }}
                      >
                        {event.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-[13px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{st.total.toLocaleString()}</p>
                      {pct !== null && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-[5px] capitalize"
                        style={{ background: statS.bg, color: statS.color }}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {[
                          { icon: Users, onClick: () => navigate(`/events/${event.id}/attendees`), title: 'Attendees', hoverColor: 'var(--bs-600)' },
                          { icon: Eye, onClick: () => navigate(`/events/${event.id}`), title: 'View', hoverColor: 'var(--text)' },
                          { icon: Edit, onClick: () => navigate(`/events/${event.id}/edit`), title: 'Edit', hoverColor: 'var(--text)' },
                          { icon: Copy, onClick: () => handleDuplicate(event), title: 'Duplicate', hoverColor: 'var(--ad-400)' },
                          { icon: Trash2, onClick: () => setDeleteId(event.id), title: 'Delete', hoverColor: 'var(--red-text)' },
                        ].map(({ icon: Icon, onClick, title, hoverColor }) => (
                          <button
                            key={title}
                            onClick={e => { e.stopPropagation(); onClick(); }}
                            title={title}
                            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all hover:opacity-80"
                            style={{ color: 'var(--text-dim)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-sec)' }}>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-[var(--radius-sm)] font-medium disabled:opacity-30 transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className="px-3 py-1 rounded-[var(--radius-sm)] font-medium transition-all" style={p === page ? { background: 'var(--bs-600)', color: '#fff', border: '1px solid var(--bs-600)' } : { border: '1px solid var(--border)', color: 'var(--text-sec)' }}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-[var(--radius-sm)] font-medium disabled:opacity-30 transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Event Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl overflow-hidden animate-fade-up" style={{ ...cardStyle, boxShadow: 'var(--shadow-float)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-[16px] font-extrabold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Bulk Import Events</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Upload a CSV file or paste data below</p>
              </div>
              <button onClick={() => { setShowBulkImport(false); setCsvText(''); setCsvPreview([]); setCsvError(''); }} style={{ color: 'var(--text-dim)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-[var(--radius-md)] text-[12px]" style={{ background: 'rgba(127,119,221,0.08)', color: 'var(--bs-600)', border: '1px solid rgba(127,119,221,0.18)' }}>
                <strong>CSV format:</strong> title, date (YYYY-MM-DD), start_time, end_time, location, category, status, capacity, tags (semicolon-separated), google_form_url
              </div>
              <div className="flex gap-3">
                <button onClick={() => csvFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-[var(--radius-md)] transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>
                  <Upload className="w-4 h-4" /> Upload CSV
                </button>
                <input ref={csvFileRef} type="file" accept=".csv,.txt" onChange={handleCsvFile} className="hidden" />
              </div>
              <textarea
                value={csvText}
                onChange={e => { setCsvText(e.target.value); parseCsvEvents(e.target.value); }}
                rows={6}
                className="w-full px-3 py-2 text-[11px] rounded-[var(--radius-md)] font-mono"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder={`title,date,start_time,end_time,location,category,status,capacity,tags\nTech Summit,2026-05-15,09:00,17:00,Convention Center,conference,published,500,tech;summit`}
              />
              {csvError && <p className="text-[12px]" style={{ color: 'var(--red-text)' }}>{csvError}</p>}
              {csvPreview.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{csvPreview.length} events ready to import</p>
                  <div className="overflow-hidden rounded-[var(--radius-md)] max-h-40 overflow-y-auto" style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full text-[11px]">
                      <thead><tr style={{ background: 'var(--surface2)' }}>
                        <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-dim)' }}>Title</th>
                        <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-dim)' }}>Date</th>
                        <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-dim)' }}>Category</th>
                        <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-dim)' }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {csvPreview.slice(0, 10).map((ev, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text)' }}>{ev.title}</td>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-sec)' }}>{ev.date}</td>
                            <td className="px-3 py-1.5 capitalize" style={{ color: 'var(--text-sec)' }}>{ev.category}</td>
                            <td className="px-3 py-1.5 capitalize" style={{ color: 'var(--text-sec)' }}>{ev.status}</td>
                          </tr>
                        ))}
                        {csvPreview.length > 10 && <tr><td colSpan={4} className="px-3 py-1.5 text-center" style={{ color: 'var(--text-dim)' }}>...and {csvPreview.length - 10} more</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <button onClick={() => { setShowBulkImport(false); setCsvText(''); setCsvPreview([]); setCsvError(''); }} className="px-4 py-2 text-[13px] rounded-[var(--radius-md)] font-medium transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>Cancel</button>
              <button
                disabled={csvPreview.length === 0}
                onClick={handleBulkEventImport}
                className="flex items-center gap-2 px-5 py-2 text-[13px] text-white rounded-[var(--radius-md)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-px"
                style={{ background: 'var(--bs-600)', fontFamily: 'var(--font-display)' }}
              >
                Import {csvPreview.length > 0 ? `${csvPreview.length} Events` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-sm w-full mx-4 p-6 animate-fade-up" style={{ ...cardStyle, boxShadow: 'var(--shadow-float)' }}>
            <h3 className="text-[18px] font-extrabold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Delete Event</h3>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text-sec)' }}>This will also delete all attendees. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-[13px] rounded-[var(--radius-md)] font-medium transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-[13px] text-white rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px" style={{ background: 'var(--red-text)' }}>Delete Event</button>
            </div>
          </div>
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