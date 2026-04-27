import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../store/AppContext';
import { AppEvent, EventCategory, EventStatus } from '../types';
import { ArrowLeft, Plus, X, Calendar, Clock, MapPin, Tag, Bell, Link } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['blue','green','purple','orange','pink','cyan','yellow','red'];
const COLOR_SWATCHES: Record<string, string> = {
  blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500',
  orange: 'bg-orange-500', pink: 'bg-pink-500', cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500', red: 'bg-red-500',
};
const CATEGORIES: EventCategory[] = ['conference','workshop','meetup','webinar','social','other'];
const STATUSES: EventStatus[] = ['draft','published','cancelled','completed'];
const REMINDER_OPTIONS = [
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
];

// Defined outside component to prevent remount on every keystroke
function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}

interface FormData {
  title: string; description: string; date: string; startTime: string; endTime: string;
  location: string; virtualLink: string; category: EventCategory; color: string;
  status: EventStatus; maxAttendees: string; reminderMinutes: number[]; tags: string[];
  googleFormUrl: string; googleSheetId: string;
}

const DEFAULT: FormData = {
  title: '', description: '', date: '', startTime: '09:00', endTime: '17:00',
  location: '', virtualLink: '', category: 'conference', color: 'blue',
  status: 'draft', maxAttendees: '', reminderMinutes: [60], tags: [],
  googleFormUrl: '', googleSheetId: '',
};

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>(DEFAULT);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (isEdit && id) {
      const event = state.events.find(e => e.id === id);
      if (event) {
        setForm({
          title: event.title, description: event.description, date: event.date,
          startTime: event.startTime, endTime: event.endTime, location: event.location,
          virtualLink: event.virtualLink || '', category: event.category, color: event.color,
          status: event.status, maxAttendees: event.maxAttendees?.toString() || '',
          reminderMinutes: event.reminderMinutes, tags: event.tags,
          googleFormUrl: event.googleFormUrl || '', googleSheetId: event.googleSheetId || '',
        });
      }
    }
  }, [isEdit, id]);

  const set = (key: keyof FormData, value: any) => setForm(f => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.date) errs.date = 'Date is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.startTime) errs.startTime = 'Start time is required';
    if (!form.endTime) errs.endTime = 'End time is required';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) errs.endTime = 'End time must be after start time';
    if (form.maxAttendees && (isNaN(Number(form.maxAttendees)) || Number(form.maxAttendees) < 1)) errs.maxAttendees = 'Must be a positive number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const now = new Date().toISOString();
    const event: AppEvent = {
      id: isEdit && id ? id : `evt-${Date.now()}`,
      title: form.title.trim(), description: form.description.trim(),
      date: form.date, startTime: form.startTime, endTime: form.endTime,
      location: form.location.trim(), virtualLink: form.virtualLink.trim() || undefined,
      category: form.category, color: form.color, status: form.status,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : undefined,
      reminderMinutes: form.reminderMinutes, tags: form.tags,
      googleFormUrl: form.googleFormUrl.trim() || undefined,
      googleSheetId: form.googleSheetId.trim() || undefined,
      createdAt: isEdit ? (state.events.find(e => e.id === id)?.createdAt || now) : now,
      updatedAt: now,
      googleFormUrl: form.googleFormUrl.trim() || undefined,
      googleSheetId: form.googleSheetId.trim() || undefined,
    };
    if (isEdit) {
      dispatch({ type: 'UPDATE_EVENT', event });
      toast.success('Event updated successfully');
    } else {
      dispatch({ type: 'ADD_EVENT', event });
      toast.success('Event created successfully');
    }
    navigate(`/events/${event.id}`);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const toggleReminder = (v: number) => {
    set('reminderMinutes', form.reminderMinutes.includes(v) ? form.reminderMinutes.filter(r => r !== v) : [...form.reminderMinutes, v]);
  };

  const inputCls = (err?: string) => `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${err ? 'border-red-300' : 'border-slate-200'} bg-white`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isEdit ? 'Update event details' : 'Fill in the details to create a new event'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Basic Information</h2>
          <F label="Event Title *" err={errors.title}>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls(errors.title)} placeholder="e.g. Annual Tech Summit 2026" />
          </F>
          <F label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} className={inputCls()} placeholder="Describe your event..." style={{ resize: 'vertical' }} />
          </F>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Date & Time</h2>
          <div className="grid grid-cols-3 gap-4">
            <F label="Date *" err={errors.date}>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={`${inputCls(errors.date)} pl-9`} />
              </div>
            </F>
            <F label="Start Time *" err={errors.startTime}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={`${inputCls(errors.startTime)} pl-9`} />
              </div>
            </F>
            <F label="End Time *" err={errors.endTime}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className={`${inputCls(errors.endTime)} pl-9`} />
              </div>
            </F>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Location</h2>
          <F label="Venue / Location *" err={errors.location}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.location} onChange={e => set('location', e.target.value)} className={`${inputCls(errors.location)} pl-9`} placeholder="e.g. Convention Center, 123 Main St, City" />
            </div>
          </F>
          <F label="Virtual Link (Optional)">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.virtualLink} onChange={e => set('virtualLink', e.target.value)} className={`${inputCls()} pl-9`} placeholder="https://zoom.us/..." />
            </div>
          </F>
        </div>

        {/* Google Integration */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Google Integration</h2>
          <F label="Google Form URL (Optional)">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.googleFormUrl} onChange={e => set('googleFormUrl', e.target.value)} className={`${inputCls()} pl-9`} placeholder="https://docs.google.com/forms/d/e/.../viewform" />
            </div>
          </F>
          <F label="Google Sheet ID (Optional)">
            <input value={form.googleSheetId} onChange={e => set('googleSheetId', e.target.value)} className={inputCls()} placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
          </F>
          <p className="text-xs text-slate-400">Connect a Google Form for participant registration and a Google Sheet to sync submissions.</p>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Event Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Category">
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls() + ' cursor-pointer'}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </F>
            <F label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls() + ' cursor-pointer'}>
                {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </F>
          </div>
          <F label="Max Attendees (leave blank for unlimited)" err={errors.maxAttendees}>
            <input type="number" min="1" value={form.maxAttendees} onChange={e => set('maxAttendees', e.target.value)} className={inputCls(errors.maxAttendees)} placeholder="e.g. 500" />
          </F>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Event Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)} className={`w-7 h-7 rounded-full ${COLOR_SWATCHES[c]} transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2"><Bell className="w-4 h-4" />Reminders</h2>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(opt => (
              <button
                key={opt.value} type="button" onClick={() => toggleReminder(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${form.reminderMinutes.includes(opt.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2"><Tag className="w-4 h-4" />Tags</h2>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className={inputCls() + ' flex-1'} placeholder="Type a tag and press Enter" />
            <button type="button" onClick={addTag} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm">Add</button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                  {t}
                  <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-6">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">Cancel</button>
          <button type="submit" className="px-5 py-2.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            {isEdit ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}