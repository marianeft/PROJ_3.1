import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Calendar, Clock, MapPin, Link2, CheckCircle2, Loader2, AlertCircle,
  ExternalLink, ChevronDown, Phone, Upload, X, FileImage, Tag,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AppEvent } from '../types';
import { SECTORS } from '../types';
import * as api from '../lib/api';

type Step = 'loading' | 'form' | 'submitting' | 'success' | 'error' | 'not-found' | 'closed';

const CATEGORY_COLORS: Record<string, string> = {
  conference: 'bg-blue-500', workshop: 'bg-green-500', meetup: 'bg-purple-500',
  webinar: 'bg-orange-500', social: 'bg-pink-500', other: 'bg-slate-500',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RegisterPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('loading');
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', sector: '', phone: '' });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load event details
  useEffect(() => {
    if (!eventId) { setStep('not-found'); return; }
    api.getPublicEvent(eventId)
      .then(({ event }) => {
        setEvent(event);
        if (event.status !== 'published') setStep('closed');
        else setStep('form');
      })
      .catch((err) => {
        console.error('Failed to load event:', err);
        if (err.message?.includes('not found')) setStep('not-found');
        else setStep('error');
      });
  }, [eventId]);

  const handleIdFile = (file: File | null) => {
    if (!file) {
      setIdFile(null);
      setIdPreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrors(e => ({ ...e, idPhoto: 'Please upload a JPG, PNG, or WebP image' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors(e => ({ ...e, idPhoto: 'File size must be under 5 MB' }));
      return;
    }
    setErrors(e => { const { idPhoto, ...rest } = e; return rest; });
    setIdFile(file);
    const url = URL.createObjectURL(file);
    setIdPreview(url);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (!form.sector) e.sector = 'Please select your sector';
    if (!idFile) e.idPhoto = 'Please upload a valid ID for verification';
    if (form.phone && !/^[\d+\-() ]{7,20}$/.test(form.phone)) e.phone = 'Please enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate() || !eventId) return;
    setStep('submitting');
    setApiError('');
    try {
      let idPhoto: string | undefined;
      let idPhotoName: string | undefined;
      if (idFile) {
        idPhoto = await fileToBase64(idFile);
        idPhotoName = idFile.name;
      }
      await api.registerForEvent(eventId, {
        name: form.name,
        email: form.email,
        sector: form.sector || undefined,
        phone: form.phone || undefined,
        idPhoto,
        idPhotoName,
      });
      setStep('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      setApiError(err.message ?? 'Registration failed. Please try again.');
      setStep('form');
    }
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading event details...</p>
        </div>
      </div>
    );
  }

  // ── Not Found ────────────────────────────────────────────────────────────────
  if (step === 'not-found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Event Not Found</h2>
          <p className="text-slate-500 text-sm">This event doesn't exist or the link may be incorrect.</p>
        </div>
      </div>
    );
  }

  // ── Closed ───────────────────────────────────────────────────────────────────
  if (step === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Registration Closed</h2>
          <p className="text-slate-500 text-sm">
            {event?.status === 'completed' ? 'This event has already concluded.' :
              event?.status === 'cancelled' ? 'This event has been cancelled.' :
                'Registration for this event is not currently open.'}
          </p>
        </div>
      </div>
    );
  }

  // ── General Error ─────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-6">Unable to load this event. Please check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 pt-10 pb-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You're Registered!</h1>
            <p className="text-green-100 text-sm">Your spot has been confirmed</p>
          </div>
          <div className="px-8 py-7 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-semibold text-slate-800 mb-3 text-sm">{event?.title}</p>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {event && format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {event?.startTime} - {event?.endTime}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {event?.location}
                </div>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
              <p className="font-semibold mb-1">Check your email!</p>
              <p className="text-indigo-600 text-xs leading-relaxed">
                We've sent a confirmation email to <strong>{form.email}</strong> with your entry QR code. Show it at the event entrance for check-in.
              </p>
            </div>
            {event?.virtualLink && (
              <a href={event.virtualLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                <ExternalLink className="w-4 h-4" /> Join Virtual Event
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────────
  const catColor = event ? (CATEGORY_COLORS[event.category] ?? 'bg-slate-500') : 'bg-slate-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100 mb-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">EventsManager</span>
          </div>
        </div>

        {/* Event Card */}
        {event && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-slate-100">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-6">
              <div className="flex items-start gap-3">
                <span className={`${catColor} text-white text-xs font-semibold px-3 py-1 rounded-full capitalize mt-0.5`}>
                  {event.category}
                </span>
              </div>
              <h1 className="text-white text-xl font-bold mt-3 leading-snug">{event.title}</h1>
              {event.description && (
                <p className="text-indigo-200 text-sm mt-2 leading-relaxed line-clamp-3">{event.description}</p>
              )}
            </div>
            <div className="px-7 py-5 grid sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Date</p>
                  <p className="text-sm font-medium text-slate-800">{format(parseISO(event.date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-400">{format(parseISO(event.date), 'EEEE')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Time</p>
                  <p className="text-sm font-medium text-slate-800">{event.startTime} - {event.endTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Location</p>
                  <p className="text-sm font-medium text-slate-800 leading-snug">{event.location}</p>
                </div>
              </div>
            </div>
            {event.virtualLink && (
              <div className="px-7 pb-5">
                <a href={event.virtualLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  <Link2 className="w-3.5 h-3.5" /> {event.virtualLink}
                </a>
              </div>
            )}
            {event.maxAttendees && (
              <div className="px-7 pb-5">
                <p className="text-xs text-slate-400">
                  Limited to <strong className="text-slate-600">{event.maxAttendees}</strong> seats
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-7 pt-7 pb-2">
            <h2 className="text-lg font-bold text-slate-800">Register for this Event</h2>
            <p className="text-sm text-slate-500 mt-1">Fill in your details below. A confirmation email with your entry QR code will be sent to you.</p>
          </div>

          {apiError && (
            <div className="mx-7 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls(errors.name)}
                placeholder="e.g. Jane Smith"
                disabled={step === 'submitting'}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls(errors.email)}
                placeholder="e.g. jane@company.com"
                disabled={step === 'submitting'}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
              <p className="text-xs text-slate-400 mt-1.5">Your QR code and event details will be sent here.</p>
            </div>

            {/* Sector & Phone row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Sector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Sector <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    disabled={step === 'submitting'}
                    className={`${inputCls(errors.sector)} pl-10 pr-9 appearance-none cursor-pointer`}
                  >
                    <option value="">Select sector...</option>
                    {SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.sector && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.sector}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Phone Number <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={`${inputCls(errors.phone)} pl-10`}
                    placeholder="e.g. +1 555 123 4567"
                    disabled={step === 'submitting'}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
              </div>
            </div>

            {/* Valid ID Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Valid ID <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-2.5">
                Upload a clear photo of your government-issued ID (e.g. driver's license, passport, national ID) for identity verification.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleIdFile(e.target.files?.[0] ?? null)}
                disabled={step === 'submitting'}
              />

              {!idPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={step === 'submitting'}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/50 ${
                    errors.idPhoto ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Click to upload your ID</p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or WebP - Max 5 MB</p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                      <img src={idPreview} alt="ID preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FileImage className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <p className="text-sm font-medium text-slate-700 truncate">{idFile?.name}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {idFile ? `${(idFile.size / 1024).toFixed(0)} KB` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleIdFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center py-2 text-xs text-indigo-600 hover:text-indigo-700 bg-white border-t border-slate-100 font-medium"
                  >
                    Change file
                  </button>
                </div>
              )}
              {errors.idPhoto && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.idPhoto}</p>}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={step === 'submitting'}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {step === 'submitting' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm Registration</>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center pb-1">
              By registering you agree to receive event-related communications.
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Powered by EventsManager</p>
      </div>
    </div>
  );
}
