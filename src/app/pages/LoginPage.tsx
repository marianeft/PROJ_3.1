import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarDays, User, Lock, LogIn, CheckCircle2,
  AlertCircle, Loader2, ChevronRight, Calendar, Clock,
  MapPin, ArrowLeft, X, Users, ChevronDown, Phone,
  Tag, Shield, Eye, EyeOff, Copy, Check, ExternalLink, HelpCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../store/AuthContext';
import * as api from '../lib/api';
import * as QRCode from 'qrcode';
import type { AppEvent } from '../types';
import { SectorField } from '../components/forms/SectorField';

type LoginStep = 'role' | 'admin' | 'event' | 'register' | 'success';

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  conference: { bg: 'rgba(55,138,221,0.15)', color: '#1060A0' },
  workshop: { bg: 'rgba(29,158,117,0.15)', color: '#166B50' },
  meetup: { bg: 'rgba(127,119,221,0.15)', color: '#5A52B0' },
  webinar: { bg: 'rgba(239,159,39,0.15)', color: '#A06B10' },
  social: { bg: 'rgba(212,83,126,0.15)', color: '#A02E55' },
  other: { bg: 'rgba(152,171,190,0.15)', color: '#4A6080' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const { isAdmin, login } = useAuth();

  useEffect(() => {
    if (isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate]);

  // Main flow state
  const [currentStep, setCurrentStep] = useState<LoginStep>('role');

  // Admin state
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    setTimeout(() => {
      const ok = login(adminForm.username, adminForm.password);
      if (ok) navigate('/', { replace: true });
      else { setAdminError('Incorrect username or password'); setAdminLoading(false); }
    }, 400);
  };

  // Participant state
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [pForm, setPForm] = useState({ name: '', email: '', sector: '', phone: '' });
  const [pErrors, setPErrors] = useState<Record<string, string>>({});
  const [pApiError, setPApiError] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStep === 'event') {
      api.getPublishedEvents()
        .then(({ events: evts }) => setEvents(evts))
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false));
    }
  }, [currentStep]);

  // Generate QR code when event is selected for registration
  useEffect(() => {
    if (selectedEvent?.googleFormUrl && currentStep === 'register') {
      QRCode.toDataURL(selectedEvent.googleFormUrl).then(setQrCode).catch(console.error);
    } else {
      setQrCode(null);
    }
  }, [selectedEvent, currentStep]);

  const validateParticipant = () => {
    const e: Record<string, string> = {};
    if (!pForm.name.trim()) e.name = 'Full name is required';
    if (!pForm.email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pForm.email)) e.email = 'Please enter a valid email';
    if (!pForm.sector) e.sector = 'Please select your sector';
    if (pForm.phone && !/^[\d+\-() ]{7,20}$/.test(pForm.phone)) e.phone = 'Invalid phone number';
    setPErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleParticipantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateParticipant() || !selectedEvent) return;
    setIsSubmitting(true);
    setPApiError('');
    try {
      await api.registerForEvent(selectedEvent.id, {
        name: pForm.name, email: pForm.email,
        sector: pForm.sector || undefined, phone: pForm.phone || undefined,
      });
      setCurrentStep('success');
    } catch (err: any) {
      setPApiError(err.message ?? 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('role');
    setSelectedEvent(null);
    setPForm({ name: '', email: '', sector: '', phone: '' });
    setPErrors({}); 
    setPApiError('');
    setQrCode(null); 
    setCopiedUrl(false);
    setAdminForm({ username: '', password: '' });
    setAdminError('');
    setShowPassword(false);
    setEventsLoading(true);
    setIsSubmitting(false);
  };

  const goBackFromRegister = () => {
    setCurrentStep('event');
    setSelectedEvent(null);
    setPForm({ name: '', email: '', sector: '', phone: '' });
    setPErrors({});
    setPApiError('');
    setQrCode(null);
    setCopiedUrl(false);
    setIsSubmitting(false);
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 text-[13px] rounded-[var(--radius-md)] focus:outline-none transition-all ${
      err ? 'border-red-300 bg-red-50/50' : ''
    }`;

  const inputStyle = (err?: string): React.CSSProperties => ({
    background: err ? 'rgba(224,80,80,0.05)' : 'var(--surface2)',
    border: `1px solid ${err ? 'rgba(224,80,80,0.3)' : 'var(--border)'}`,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, var(--ad-950) 0%, var(--bs-900) 50%, var(--ad-950) 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-center pt-10 pb-6 animate-fade-down">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[9px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bs-600), var(--ad-600))', boxShadow: '0 8px 24px rgba(127,119,221,0.3)' }}
          >
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: '#E8F4FF', letterSpacing: -0.3 }}>
            EventsManager
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-2xl animate-fade-up">
          {/* ════════════════════════════════════════════════════════ */}
          {/* SCREEN 1 - ROLE SELECTION */}
          {/* ════════════════════════════════════════════════════════ */}
          {currentStep === 'role' && (
            <div>
              <p className="text-center text-[13px] mb-12" style={{ color: 'var(--sidebar-text)', opacity: 0.6 }}>
                Choose how you'd like to continue
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Participant Card */}
                <button
                  onClick={() => setCurrentStep('event')}
                  className="group overflow-hidden flex flex-col rounded-[var(--radius-xl)] transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="px-6 py-8 text-left" style={{ background: 'linear-gradient(135deg, var(--ad-400), #16A085)' }}>
                    <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-white text-[18px] mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>I'm a Participant</h2>
                    <p className="text-white/70 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>Join an upcoming event</p>
                  </div>
                  <div className="p-6 flex-1 flex items-end">
                    <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--ad-400)' }}>
                      Continue <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {/* Admin Card */}
                <button
                  onClick={() => setCurrentStep('admin')}
                  className="group overflow-hidden flex flex-col rounded-[var(--radius-xl)] transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="px-6 py-8 text-left" style={{ background: 'linear-gradient(160deg, #3C3489 0%, var(--bs-900) 55%, #0F1623 100%)' }}>
                    <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-white text-[18px] mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin Portal</h2>
                    <p className="text-white/70 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>Sign in to manage events</p>
                  </div>
                  <div className="p-6 flex-1 flex items-end">
                    <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--bs-400)' }}>
                      Continue <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-center text-[11px] mt-12" style={{ color: 'var(--sidebar-dim)' }}>
                Powered by EventsManager
              </p>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* SCREEN 2A - ADMIN LOGIN */}
          {/* ════════════════════════════════════════════════════════ */}
          {currentStep === 'admin' && (
            <div className="overflow-hidden flex flex-col rounded-[var(--radius-xl)]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(160deg, #3C3489 0%, var(--bs-900) 55%, #0F1623 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white text-[16px]" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin Portal</h2>
                      <p className="text-white/50 text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>Sign in to manage events</p>
                    </div>
                  </div>
                  <button onClick={() => setCurrentStep('role')} className="text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                      <input
                        type="text" value={adminForm.username}
                        onChange={e => { setAdminForm(f => ({ ...f, username: e.target.value })); setAdminError(''); }}
                        className={inputCls(adminError ? 'err' : undefined) + ' pl-10'}
                        style={inputStyle(adminError || undefined)}
                        placeholder="Enter username" autoComplete="username" disabled={adminLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Password</label>
                      <button
                        type="button"
                        onClick={() => {}} // TODO: Implement forgot password
                        className="text-[11px] transition-colors hover:opacity-70"
                        style={{ color: 'var(--ad-400)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'} value={adminForm.password}
                        onChange={e => { setAdminForm(f => ({ ...f, password: e.target.value })); setAdminError(''); }}
                        className={inputCls(adminError ? 'err' : undefined) + ' pl-10 pr-10'}
                        style={inputStyle(adminError || undefined)}
                        placeholder="Enter password" autoComplete="current-password" disabled={adminLoading}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {adminError && (
                    <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)]" style={{ background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.18)' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--red-text)' }} />
                      <p className="text-[13px]" style={{ color: 'var(--red-text)' }}>{adminError}</p>
                    </div>
                  )}

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={adminLoading || !adminForm.username || !adminForm.password}
                    className="w-full py-3 text-white rounded-[var(--radius-md)] text-[13px] font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:-translate-y-px mt-6"
                    style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}
                  >
                    {adminLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <><LogIn className="w-4 h-4" /> Sign In to Dashboard</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* SCREEN 2B - EVENT SELECTION */}
          {/* ════════════════════════════════════════════════════════ */}
          {currentStep === 'event' && (
            <div className="overflow-hidden flex flex-col rounded-[var(--radius-xl)]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)', maxHeight: 620 }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, var(--ad-400), #16A085)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-white/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white text-[16px]" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Select Event</h2>
                      <p className="text-white/60 text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>Choose an event to register</p>
                    </div>
                  </div>
                  <button onClick={() => setCurrentStep('role')} className="text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-[13px] mb-4" style={{ color: 'var(--text-sec)' }}>Tap an event to view details and register:</p>
                {eventsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>Loading events...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>No open events at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {events.map(ev => {
                      const cs = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.other;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => { setSelectedEvent(ev); setCurrentStep('register'); }}
                          className="w-full text-left p-4 rounded-[var(--radius-md)] transition-all group"
                          style={{ border: '1px solid var(--border)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(29,158,117,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] capitalize" style={{ background: cs.bg, color: cs.color }}>
                                {ev.category}
                              </span>
                              <p className="text-[13px] font-bold mt-1.5 truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{ev.title}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(ev.date), 'MMM d, yyyy')}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.startTime}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="truncate max-w-[80px]">{ev.location}</span></span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--text-dim)' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* SCREEN 3 - EVENT REGISTRATION */}
          {/* ════════════════════════════════════════════════════════ */}
          {currentStep === 'register' && selectedEvent && (
            <div className="overflow-hidden flex flex-col rounded-[var(--radius-xl)]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)', maxHeight: 620 }}>
              <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, var(--ad-400), #16A085)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-white/70 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>Selected Event</p>
                  <p className="text-[15px] font-bold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{selectedEvent.title}</p>
                </div>
                <button onClick={goBackFromRegister} className="text-white/60 hover:text-white transition-colors ml-3">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {/* Event Info Cards */}
                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded text-[12px]" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded text-[12px]" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
                    <Clock className="w-4 h-4" />
                    {selectedEvent.startTime}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded text-[12px]" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>
                </div>

                {/* API Error */}
                {pApiError && (
                  <div className="mb-4 p-3 rounded-[var(--radius-md)] flex items-start gap-2" style={{ background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.18)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--red-text)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--red-text)' }}>{pApiError}</p>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleParticipantSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Full Name <span style={{ color: 'var(--red-text)' }}>*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                      <input 
                        value={pForm.name} 
                        onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} 
                        className={inputCls(pErrors.name) + ' pl-10'} 
                        style={inputStyle(pErrors.name)} 
                        placeholder="e.g. Jane Smith" 
                        disabled={isSubmitting}
                      />
                    </div>
                    {pErrors.name && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--red-text)' }}><AlertCircle className="w-3 h-3" />{pErrors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Email Address <span style={{ color: 'var(--red-text)' }}>*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                      <input 
                        type="email" 
                        value={pForm.email} 
                        onChange={e => setPForm(f => ({ ...f, email: e.target.value }))} 
                        className={inputCls(pErrors.email) + ' pl-10'} 
                        style={inputStyle(pErrors.email)} 
                        placeholder="e.g. jane@company.com" 
                        disabled={isSubmitting}
                      />
                    </div>
                    {pErrors.email && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--red-text)' }}><AlertCircle className="w-3 h-3" />{pErrors.email}</p>}
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>Confirmation will be sent to this address.</p>
                  </div>

                  {/* Sector */}
                  <SectorField
                    value={pForm.sector}
                    onChange={(value) => setPForm(f => ({ ...f, sector: value }))}
                    error={pErrors.sector}
                    disabled={isSubmitting}
                    placeholder="Select sector..."
                  />

                  {/* Phone */}
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Phone <span className="font-normal normal-case tracking-normal" style={{ color: 'var(--text-dim)', fontSize: 11 }}>(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                      <input 
                        type="tel" 
                        value={pForm.phone} 
                        onChange={e => setPForm(f => ({ ...f, phone: e.target.value }))} 
                        className={`${inputCls(pErrors.phone)} pl-10`} 
                        style={inputStyle(pErrors.phone)} 
                        placeholder="+63 9XX XXX XXXX" 
                        disabled={isSubmitting}
                      />
                    </div>
                    {pErrors.phone && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--red-text)' }}><AlertCircle className="w-3 h-3" />{pErrors.phone}</p>}
                  </div>

                  {/* Google Form Register Button */}
                  {selectedEvent?.googleFormUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => window.open(selectedEvent.googleFormUrl, '_blank')}
                        disabled={isSubmitting}
                        className="w-full py-3 text-white rounded-[var(--radius-md)] text-[13px] font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2 hover:-translate-y-px mt-6"
                        style={{ background: 'linear-gradient(135deg, #1DB679 0%, #16A085 100%)', boxShadow: '0 4px 16px rgba(29,158,117,0.3)', fontFamily: 'var(--font-display)' }}
                      >
                        <ExternalLink className="w-4 h-4" /> Register via Google Form →
                      </button>

                      {/* QR Code */}
                      {qrCode && (
                        <div className="flex flex-col items-center gap-2 mt-4">
                          <img src={qrCode} alt="QR Code" className="w-[180px] h-[180px] border border-[var(--border)] rounded-[var(--radius-md)]" />
                          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Scan to register on your phone</p>
                        </div>
                      )}

                      {/* Copyable Link */}
                      <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] mt-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          value={selectedEvent.googleFormUrl}
                          readOnly
                          className="flex-1 px-3 py-2 text-[12px] rounded-[var(--radius-sm)] truncate bg-transparent"
                          style={{ fontFamily: 'var(--font-body)', color: 'var(--text-dim)' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedEvent.googleFormUrl!);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="p-2 hover:bg-white/10 rounded transition-all"
                          title="Copy to clipboard"
                        >
                          {copiedUrl ? <Check className="w-4 h-4" style={{ color: 'var(--ad-400)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />}
                        </button>
                      </div>

                      <p className="text-[11px] text-center" style={{ color: 'var(--text-dim)' }}>You'll be redirected to an external Google Form. Your submission will be recorded automatically.</p>
                    </>
                  )}

                  {!selectedEvent?.googleFormUrl && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 text-white rounded-[var(--radius-md)] text-[13px] font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2 hover:-translate-y-px mt-6"
                      style={{ background: 'var(--ad-400)', boxShadow: '0 4px 16px rgba(29,158,117,0.3)', fontFamily: 'var(--font-display)' }}
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><CheckCircle2 className="w-4 h-4" /> Confirm Registration</>}
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* SCREEN 4 - SUCCESS */}
          {/* ════════════════════════════════════════════════════════ */}
          {currentStep === 'success' && selectedEvent && (
            <div className="overflow-hidden flex flex-col rounded-[var(--radius-xl)]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, var(--ad-400), #16A085)' }}>
                <h2 className="text-white text-[16px]" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Registration Complete</h2>
              </div>

              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(29,158,117,0.12)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--ad-400)' }} />
                </div>
                <h3 className="text-[18px] font-extrabold mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>You're Registered!</h3>
                <p className="text-[13px] mb-1" style={{ color: 'var(--text-sec)' }}>
                  Welcome to <span className="font-bold" style={{ color: 'var(--text)' }}>{selectedEvent?.title}</span>
                </p>
                <p className="text-[12px] mb-6" style={{ color: 'var(--text-dim)' }}>
                  Check <span className="font-medium">{pForm.email}</span> for your confirmation.
                </p>
                <button
                  onClick={resetFlow}
                  className="px-6 py-3 text-[13px] rounded-[var(--radius-md)] font-medium transition-all hover:-translate-y-px"
                  style={{ border: '1px solid rgba(29,158,117,0.2)', color: 'var(--ad-400)', fontFamily: 'var(--font-display)' }}
                >
                  Register for Another Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
