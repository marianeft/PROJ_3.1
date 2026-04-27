import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../store/AppContext';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Search, Plus, Download, Upload, Trash2, Edit, CheckSquare,
  Square, UserCheck, X, Filter, Users, CheckCircle, Clock, XCircle,
  AlertCircle, Award, Copy, Check, Loader2, Tag, ChevronDown, FileImage, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Attendee, AttendeeStatus, SECTORS, GENDERS } from '../types';
import * as api from '../lib/api';


// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const STATUS_STYLES: Record<AttendeeStatus, { badge: string; icon: React.ReactNode }> = {
  confirmed:  { badge: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
  pending:    { badge: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  cancelled:  { badge: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> },
  waitlisted: { badge: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
};

// ─── Sector Combobox ──────────────────────────────────────────────────────────
interface SectorComboboxProps {
  value: string;
  onChange: (val: string) => void;
  recentSectors: string[];
}

function SectorCombobox({ value, onChange, recentSectors }: SectorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const query = inputVal.toLowerCase().trim();
  const filteredRecent = [...new Set(recentSectors)].filter(s => !query || s.toLowerCase().includes(query));
  const hasOptions = filteredRecent.length > 0 || !!inputVal.trim();

  const select = (val: string) => {
    setInputVal(val);
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
          placeholder="Type or select a sector…"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && hasOptions && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filteredRecent.length > 0 && (
              <>
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Recently Used</span>
                </div>
                {filteredRecent.map(s => (
                  <button
                    key={`r-${s}`}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => select(s)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${value === s ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {s}
                  </button>
                ))}
              </>
            )}
          </div>
          {inputVal.trim() &&
            !filteredRecent.some(s => s.toLowerCase() === query) && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => select(inputVal.trim())}
                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                Use "<span className="font-medium">{inputVal.trim()}</span>"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attendee Form Modal ───────────────────────────────────────────────────────
interface AttendeeFormProps {
  eventId: string;
  attendee?: Attendee;
  recentSectors: string[];
  onClose: () => void;
  onSave: (data: Omit<Attendee, 'id' | 'eventId' | 'registeredAt'>) => void;
}

function AttendeeForm({ attendee, recentSectors, onClose, onSave }: AttendeeFormProps) {
  const [form, setForm] = useState({
    name: attendee?.name || '',
    email: attendee?.email || '',
    phone: attendee?.phone || '',
    company: attendee?.company || '',
    role: attendee?.role || '',
    sector: attendee?.sector || '',
    gender: attendee?.gender || '',
    status: (attendee?.status || 'pending') as AttendeeStatus,
    checkedIn: attendee?.checkedIn || false,
    checkedInAt: attendee?.checkedInAt,
    notes: attendee?.notes || '',
    certificateNumber: attendee?.certificateNumber || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${err ? 'border-red-300' : 'border-slate-200'} bg-white`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{attendee ? 'Edit Attendee' : 'Add Attendee'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls(errors.name)} placeholder="Jane Smith" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls(errors.email)} placeholder="jane@example.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} placeholder="+1 555-000-0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls()} placeholder="Acme Corp" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role / Title</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls()} placeholder="Software Engineer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputCls() + ' cursor-pointer'}>
                <option value="">Select gender...</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sector</label>
              <SectorCombobox
                value={form.sector}
                onChange={val => setForm(f => ({ ...f, sector: val }))}
                recentSectors={recentSectors}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AttendeeStatus }))} className={inputCls() + ' cursor-pointer'}>
              {(['confirmed','pending','waitlisted','cancelled'] as AttendeeStatus[]).map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls()} placeholder="VIP guest, dietary restrictions, etc." style={{ resize: 'vertical' }} />
          </div>
          {form.certificateNumber && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Certificate Number</label>
              <input value={form.certificateNumber} readOnly className={inputCls() + ' bg-slate-50 cursor-default text-slate-500'} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="checkin" checked={form.checkedIn} onChange={e => setForm(f => ({ ...f, checkedIn: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
            <label htmlFor="checkin" className="text-sm text-slate-700">Checked In</label>
          </div>
        </form>
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit as any} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            {attendee ? 'Update Attendee' : 'Add Attendee'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import Modal ─────────────────────────────────────────────────────────
function BulkImportModal({ eventId, onClose, onImport }: { eventId: string; onClose: () => void; onImport: (attendees: Attendee[]) => void }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<Attendee[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    setError('');
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { setError('CSV must have a header row and at least one data row.'); setPreview([]); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    if (nameIdx === -1 || emailIdx === -1) { setError('CSV must have "name" and "email" columns.'); setPreview([]); return; }
    const rows = lines.slice(1).map((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const status = (cols[headers.findIndex(h => h.includes('status'))] || 'pending') as AttendeeStatus;
      return {
        id: `import-${Date.now()}-${i}`,
        eventId,
        name: cols[nameIdx] || '',
        email: cols[emailIdx] || '',
        phone: cols[headers.findIndex(h => h.includes('phone'))] || undefined,
        company: cols[headers.findIndex(h => h.includes('company'))] || undefined,
        role: cols[headers.findIndex(h => h.includes('role') || h.includes('title'))] || undefined,
        sector: cols[headers.findIndex(h => h.includes('sector'))] || undefined,
        status: ['confirmed','pending','cancelled','waitlisted'].includes(status) ? status : 'pending' as AttendeeStatus,
        checkedIn: false,
        registeredAt: new Date().toISOString(),
        notes: cols[headers.findIndex(h => h.includes('note'))] || undefined,
      } as Attendee;
    }).filter(a => a.name && a.email);
    setPreview(rows);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setCsv(text); parseCSV(text); };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Bulk Import Attendees</h3>
            <p className="text-xs text-slate-500 mt-0.5">Upload a CSV or paste data below</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
            <strong>CSV format:</strong> name, email, phone, company, role, sector, status (confirmed/pending/waitlisted/cancelled), notes
          </div>
          <div className="flex gap-3">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
              <Upload className="w-4 h-4" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            value={csv}
            onChange={e => { setCsv(e.target.value); parseCSV(e.target.value); }}
            rows={6}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-slate-50"
            placeholder={`name,email,phone,company,role,sector,status\nJane Smith,jane@example.com,+15550001111,Acme Corp,Engineer,Technology,confirmed`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">{preview.length} attendees ready to import</p>
              <div className="border border-slate-100 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50"><tr><th className="text-left px-3 py-1.5 text-slate-500">Name</th><th className="text-left px-3 py-1.5 text-slate-500">Email</th><th className="text-left px-3 py-1.5 text-slate-500">Sector</th><th className="text-left px-3 py-1.5 text-slate-500">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.slice(0, 10).map((a, i) => (
                      <tr key={i}><td className="px-3 py-1.5 text-slate-700">{a.name}</td><td className="px-3 py-1.5 text-slate-500">{a.email}</td><td className="px-3 py-1.5 text-slate-500">{a.sector || '—'}</td><td className="px-3 py-1.5 capitalize text-slate-500">{a.status}</td></tr>
                    ))}
                    {preview.length > 10 && <tr><td colSpan={4} className="px-3 py-1.5 text-slate-400 text-center">...and {preview.length - 10} more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button
            disabled={preview.length === 0}
            onClick={() => { onImport(preview); onClose(); }}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {preview.length > 0 ? `${preview.length} Attendees` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Certificate Modal ─────────────────────────────────────────────────────────
function CertificateModal({
  eventId, eventTitle, attendees, onClose, onSent,
}: {
  eventId: string; eventTitle: string; attendees: Attendee[];
  onClose: () => void; onSent: (updated: Attendee[]) => void;
}) {
  const checkedIn = attendees.filter(a => a.checkedIn);
  const alreadySent = checkedIn.filter(a => a.certificateSentAt);
  const pending = checkedIn.filter(a => !a.certificateSentAt);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const targets = pending;

  const handleSend = async () => {
    if (targets.length === 0) return;
    setSending(true);
    try {
      const res = await api.sendCertificates(eventId, targets.map(a => a.id));
      setResult({ sent: res.sent, failed: res.failed });
      onSent(res.updatedAttendees);
    } catch (err: any) {
      toast.error(`Failed to send certificates: ${err.message}`);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Send Certificates</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {result ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">Certificates Sent!</p>
              <p className="text-sm text-slate-500 mt-1">
                <span className="text-green-600 font-semibold">{result.sent}</span> sent successfully
                {result.failed > 0 && <>, <span className="text-red-500 font-semibold">{result.failed}</span> failed</>}
              </p>
              {result.failed > 0 && (
                <p className="text-xs text-slate-400 mt-2">Failed sends are likely due to missing RESEND_API_KEY. Add it in your Supabase project settings.</p>
              )}
            </div>
            <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-indigo-600">{checkedIn.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Checked In</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{pending.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pending Cert</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{alreadySent.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Already Sent</p>
                </div>
              </div>

              {/* Summary */}
              <div className={`rounded-xl p-4 border ${targets.length === 0 ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
                {targets.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center">
                    {checkedIn.length === 0
                      ? 'No checked-in attendees yet. Certificates can only be sent to attendees who have been checked in.'
                      : 'All checked-in attendees in this sector have already received their certificates.'}
                  </p>
                ) : (
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">{targets.length} certificate{targets.length !== 1 ? 's' : ''}</span> will be emailed to all checked-in attendees who haven't received one yet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button
                onClick={handleSend}
                disabled={targets.length === 0 || sending}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Award className="w-4 h-4" /> Send {targets.length} Certificate{targets.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function AttendeesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { state, dispatch, getEventAttendees, getAttendeeStats, refreshEventAttendees } = useApp();
  const navigate = useNavigate();

  // Refresh attendees from server on mount to pick up self-registrations
  useEffect(() => {
    if (eventId) refreshEventAttendees(eventId);
  }, [eventId]);

  const event = state.events.find(e => e.id === eventId);
  const allAttendees = getEventAttendees(eventId!);
  const stats = getAttendeeStats(eventId!);

  // ─── Filters & Pagination ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'all'>('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'checked-in' | 'not-checked-in'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'status' | 'registered' | 'company' | 'sector'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  // ─── Selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ─── Modals ─────────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [editAttendee, setEditAttendee] = useState<Attendee | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  // ID photo viewing
  const [idPhotoModal, setIdPhotoModal] = useState<{ attendee: Attendee; url: string | null; loading: boolean } | null>(null);

  const handleViewIdPhoto = async (attendee: Attendee) => {
    setIdPhotoModal({ attendee, url: null, loading: true });
    try {
      const res = await api.getAttendeeIdPhotoUrl(eventId!, attendee.id);
      setIdPhotoModal({ attendee, url: res.url, loading: false });
    } catch (err: any) {
      setIdPhotoModal({ attendee, url: null, loading: false });
      toast.error(err.message || 'No ID photo found for this attendee');
    }
  };

  // Unique sectors from attendees for filter dropdown
  const uniqueSectors = useMemo(() =>
    [...new Set(allAttendees.map(a => a.sector).filter(Boolean))].sort() as string[],
    [allAttendees]
  );

  // ─── Filtered & Sorted ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allAttendees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.company?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.sector?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (sectorFilter !== 'all') list = list.filter(a => a.sector === sectorFilter);
    if (checkinFilter === 'checked-in') list = list.filter(a => a.checkedIn);
    if (checkinFilter === 'not-checked-in') list = list.filter(a => !a.checkedIn);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'registered') cmp = a.registeredAt.localeCompare(b.registeredAt);
      else if (sortBy === 'company') cmp = (a.company || '').localeCompare(b.company || '');
      else if (sortBy === 'sector') cmp = (a.sector || '').localeCompare(b.sector || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allAttendees, search, statusFilter, sectorFilter, checkinFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  // ─── Selection Handlers ───────────────────────────────────────────────────
  const allPageSelected = paged.length > 0 && paged.every(a => selected.has(a.id));
  const toggleAll = () => {
    if (allPageSelected) setSelected(s => { const n = new Set(s); paged.forEach(a => n.delete(a.id)); return n; });
    else setSelected(s => { const n = new Set(s); paged.forEach(a => n.add(a.id)); return n; });
  };
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ─── Actions ─────────────────────────────────────────────────────────────
  const generateCertNumber = (evId: string) => {
    const d = new Date();
    const date = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const eId = evId.replace(/-/g, '').substring(0, 8).toUpperCase();
    return `CERT-${eId}-${date}-${rand}`;
  };

  const handleAddAttendee = (data: Omit<Attendee, 'id' | 'eventId' | 'registeredAt'>) => {
    const attendee: Attendee = {
      ...data,
      id: `att-${Date.now()}`,
      eventId: eventId!,
      registeredAt: new Date().toISOString(),
      certificateNumber: data.certificateNumber || generateCertNumber(eventId!),
    };
    dispatch({ type: 'ADD_ATTENDEE', attendee });

    // Capacity alert check
    if (event?.maxAttendees) {
      const newTotal = allAttendees.length + 1;
      const pct = Math.round((newTotal / event.maxAttendees) * 100);
      if (pct >= 90 && Math.round((allAttendees.length / event.maxAttendees) * 100) < 90) {
        dispatch({ type: 'ADD_NOTIFICATION', notification: {
          id: `notif-cap90-${Date.now()}`, eventId: eventId!, eventTitle: event.title,
          message: `${event.title} has reached 90% capacity (${newTotal}/${event.maxAttendees})`,
          type: 'warning', createdAt: new Date().toISOString(), read: false,
        }});
      } else if (pct >= 75 && Math.round((allAttendees.length / event.maxAttendees) * 100) < 75) {
        dispatch({ type: 'ADD_NOTIFICATION', notification: {
          id: `notif-cap75-${Date.now()}`, eventId: eventId!, eventTitle: event.title,
          message: `${event.title} has reached 75% capacity (${newTotal}/${event.maxAttendees})`,
          type: 'warning', createdAt: new Date().toISOString(), read: false,
        }});
      }
    }

    toast.success('Attendee added');
    setShowAdd(false);
  };

  const handleEditAttendee = (data: Omit<Attendee, 'id' | 'eventId' | 'registeredAt'>) => {
    if (!editAttendee) return;
    dispatch({ type: 'UPDATE_ATTENDEE', attendee: { ...editAttendee, ...data } });
    toast.success('Attendee updated');
    setEditAttendee(null);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_ATTENDEE', id });
    toast.success('Attendee removed');
    setDeleteConfirm(null);
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const handleBulkDelete = () => {
    selected.forEach(id => dispatch({ type: 'DELETE_ATTENDEE', id }));
    toast.success(`${selected.size} attendees removed`);
    setSelected(new Set());
    setBulkDeleteConfirm(false);
  };

  const handleBulkStatus = (status: AttendeeStatus) => {
    selected.forEach(id => {
      const a = allAttendees.find(x => x.id === id);
      if (a) dispatch({ type: 'UPDATE_ATTENDEE', attendee: { ...a, status } });
    });
    toast.success(`Updated ${selected.size} attendees to ${status}`);
    setSelected(new Set());
  };

  const handleCheckIn = (id: string, checkedIn: boolean) => {
    dispatch({ type: 'CHECKIN_ATTENDEE', id, checkedIn });
    toast.success(checkedIn ? 'Checked in!' : 'Check-in reversed');
  };

  const handleBulkCheckIn = (checkedIn: boolean) => {
    selected.forEach(id => dispatch({ type: 'CHECKIN_ATTENDEE', id, checkedIn }));
    toast.success(`${selected.size} attendees ${checkedIn ? 'checked in' : 'check-in reversed'}`);
    setSelected(new Set());
  };

  const handleImport = (attendees: Attendee[]) => {
    dispatch({ type: 'BULK_ADD_ATTENDEES', attendees });
    toast.success(`${attendees.length} attendees imported`);
  };

  const handlePrintCertificate = useCallback((attendee: Attendee) => {
    // Client-side print fallback when Apps Script is not configured
    const templates = JSON.parse(localStorage.getItem('em_certificates') || '[]');
    const defaultTemplate = templates.find((t: any) => t.isDefault) || templates[0];
    if (!defaultTemplate) { toast.error('No certificate template found. Create one in Certificates page first.'); return; }
    const data: Record<string, string> = {
      participant_name: attendee.name,
      participant_email: attendee.email,
      certificate_number: attendee.certificateNumber || '',
      event_name: event?.title || '',
      event_date: event ? format(parseISO(event.date), 'MMMM d, yyyy') : '',
      event_location: event?.location || '',
      issue_date: format(new Date(), 'MMMM d, yyyy'),
    };
    const html = defaultTemplate.htmlTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => data[key] || `{{${key}}}`);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }, [event]);

  const handleExportCSV = useCallback(() => {
    const headers = 'Name,Email,Phone,Company,Role,Sector,Gender,Certificate Number,Status,Checked In,Registered At,Certificate Sent,Notes';
    const rows = filtered.map(a =>
      [a.name, a.email, a.phone || '', a.company || '', a.role || '', a.sector || '', a.gender || '', a.certificateNumber || '', a.status,
       a.checkedIn ? 'Yes' : 'No',
       format(parseISO(a.registeredAt), 'yyyy-MM-dd HH:mm'),
       a.certificateSentAt ? format(parseISO(a.certificateSentAt), 'yyyy-MM-dd HH:mm') : '',
       a.notes || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendees-${event?.title?.replace(/\s+/g, '-') || eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filtered, event, eventId]);

  const handleCertificatesSent = (updatedAttendees: Attendee[]) => {
    updatedAttendees.forEach(a => dispatch({ type: 'UPDATE_ATTENDEE', attendee: a }));
  };

  // ─── Sort Header ──────────────────────────────────────────────────────────
  const SortTh = ({ col, label, className = '' }: { col: typeof sortBy; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && <span className="text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  if (!event) return (
    <div className="p-6 text-center">
      <p className="text-slate-500">Event not found.</p>
      <button onClick={() => navigate('/events')} className="mt-4 text-indigo-600 hover:underline text-sm">Back to Events</button>
    </div>
  );

  const capacityPct = event.maxAttendees ? Math.round((stats.total / event.maxAttendees) * 100) : null;
  const checkedInCount = allAttendees.filter(a => a.checkedIn).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/events')} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => navigate('/events')} className="text-sm text-slate-400 hover:text-slate-600">Events</button>
        <span className="text-slate-300">/</span>
        <button onClick={() => navigate(`/events/${eventId}`)} className="text-sm text-slate-400 hover:text-slate-600 truncate max-w-[200px]">{event.title}</button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">Attendees</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendees</h1>
          <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[400px]">{event.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Send Certificates */}
          <button
            onClick={() => setShowCertModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-amber-200 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium"
          >
            <Award className="w-4 h-4" />
            Send Certificates
            {checkedInCount > 0 && (
              <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {checkedInCount}
              </span>
            )}
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowBulkImport(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            <Plus className="w-4 h-4" /> Add Attendee
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, cls: 'text-slate-800' },
          { label: 'Confirmed', value: stats.confirmed, cls: 'text-green-600' },
          { label: 'Pending', value: stats.pending, cls: 'text-yellow-600' },
          { label: 'Waitlisted', value: stats.waitlisted, cls: 'text-orange-500' },
          { label: 'Cancelled', value: stats.cancelled, cls: 'text-red-500' },
          { label: 'Checked In', value: stats.checkedIn, cls: 'text-indigo-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm text-center">
            <p className={`text-xl font-bold ${cls}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Capacity Bar */}
      {event.maxAttendees && (
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 mb-4 shadow-sm flex items-center gap-4">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Capacity</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${capacityPct! > 90 ? 'bg-red-500' : capacityPct! > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(capacityPct!, 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">{stats.total.toLocaleString()} / {event.maxAttendees.toLocaleString()} ({capacityPct}%)</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, email, sector…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {/* Sector filter */}
          <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1); }} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            <option value="all">All Sectors</option>
            {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={checkinFilter} onChange={e => { setCheckinFilter(e.target.value as any); setPage(1); }} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            <option value="all">All Check-in</option>
            <option value="checked-in">Checked In</option>
            <option value="not-checked-in">Not Checked In</option>
          </select>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>Show {s}</option>)}
          </select>
          {(search || statusFilter !== 'all' || sectorFilter !== 'all' || checkinFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setSectorFilter('all'); setCheckinFilter('all'); setPage(1); }} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {sectorFilter !== 'all' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-200">
              <Filter className="w-3 h-3" /> Sector: {sectorFilter}
              <button onClick={() => { setSectorFilter('all'); setPage(1); }} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
            <span className="text-xs text-slate-400">{filtered.length} attendees in this sector</span>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-indigo-600 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-white text-sm font-medium">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button onClick={() => handleBulkStatus('confirmed')} className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Mark Confirmed</button>
            <button onClick={() => handleBulkStatus('pending')} className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium">Mark Pending</button>
            <button onClick={() => handleBulkStatus('waitlisted')} className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">Waitlist</button>
            <button onClick={() => handleBulkCheckIn(true)} className="px-3 py-1.5 text-xs bg-indigo-400 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium">Check In All</button>
            <button onClick={() => setBulkDeleteConfirm(true)} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">Delete</button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                    {allPageSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <SortTh col="name" label="Name" />
                <SortTh col="email" label="Email" className="hidden md:table-cell" />
                <SortTh col="sector" label="Sector" />
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Gender</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Cert #</th>
                <SortTh col="status" label="Status" />
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Check-In</th>
                <SortTh col="registered" label="Registered" className="hidden xl:table-cell" />
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No attendees found</p>
                    <button onClick={() => setShowAdd(true)} className="mt-3 text-indigo-600 text-sm hover:underline">Add the first attendee</button>
                  </td>
                </tr>
              ) : paged.map(attendee => {
                const isSelected = selected.has(attendee.id);
                const ss = STATUS_STYLES[attendee.status];
                return (
                  <tr key={attendee.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleOne(attendee.id)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate max-w-[160px]">{attendee.name}</p>
                          {attendee.role && <p className="text-xs text-slate-400 truncate max-w-[160px]">{attendee.role}</p>}
                          {attendee.certificateSentAt && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                              <Award className="w-2.5 h-2.5" /> Cert sent
                            </p>
                          )}
                          {attendee.notes && <p className="text-[10px] text-amber-600 truncate max-w-[160px]">★ {attendee.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs hidden md:table-cell max-w-[180px]">
                      <span className="truncate block">{attendee.email}</span>
                      {attendee.phone && <span className="text-slate-400">{attendee.phone}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs max-w-[150px]">
                      {attendee.sector
                        ? <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]">
                            <Tag className="w-2.5 h-2.5 shrink-0" />{attendee.sector}
                          </span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 hidden lg:table-cell">
                      {attendee.gender || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs hidden xl:table-cell">
                      {attendee.certificateNumber
                        ? <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{attendee.certificateNumber}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ss.badge}`}>
                        {ss.icon}{attendee.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleCheckIn(attendee.id, !attendee.checkedIn)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          attendee.checkedIn
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {attendee.checkedIn ? 'Checked In' : 'Check In'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400 hidden xl:table-cell whitespace-nowrap">
                      {format(parseISO(attendee.registeredAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handlePrintCertificate(attendee)} title="Print Certificate" className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleViewIdPhoto(attendee)} title="View ID Photo" className="p-1.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                          <FileImage className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditAttendee(attendee)} title="Edit" className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(attendee.id)} title="Delete" className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm bg-slate-50/50">
          <span className="text-slate-500 text-xs">
            {filtered.length === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length.toLocaleString()} attendees`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border transition-colors ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors">»</button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && <AttendeeForm eventId={eventId!} recentSectors={uniqueSectors} onClose={() => setShowAdd(false)} onSave={handleAddAttendee} />}
      {editAttendee && <AttendeeForm eventId={eventId!} attendee={editAttendee} recentSectors={uniqueSectors} onClose={() => setEditAttendee(null)} onSave={handleEditAttendee} />}
      {showBulkImport && <BulkImportModal eventId={eventId!} onClose={() => setShowBulkImport(false)} onImport={handleImport} />}
      {showCertModal && (
        <CertificateModal
          eventId={eventId!}
          eventTitle={event.title}
          attendees={allAttendees}
          onClose={() => setShowCertModal(false)}
          onSent={handleCertificatesSent}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-slate-800 mb-2">Remove Attendee</h3>
            <p className="text-sm text-slate-500 mb-5">Are you sure you want to remove this attendee? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-slate-800 mb-2">Delete {selected.size} Attendees</h3>
            <p className="text-sm text-slate-500 mb-5">This will permanently remove {selected.size} attendees. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setBulkDeleteConfirm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* ID Photo Modal */}
      {idPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">ID Photo</h3>
                <p className="text-xs text-slate-500 mt-0.5">{idPhotoModal.attendee.name}</p>
              </div>
              <button onClick={() => setIdPhotoModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {idPhotoModal.loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                  <p className="text-sm text-slate-400">Loading ID photo...</p>
                </div>
              ) : idPhotoModal.url ? (
                <img src={idPhotoModal.url} alt={`${idPhotoModal.attendee.name}'s ID`} className="w-full rounded-xl border border-slate-200 object-contain max-h-96" />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileImage className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">No ID photo available</p>
                  <p className="text-xs text-slate-400 mt-1">This attendee hasn't uploaded an ID photo yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}