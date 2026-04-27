import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Copy, Check, Users, QrCode } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AppEvent } from '../types';
import * as api from '../lib/api';

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  conference: { bg: 'rgba(55,138,221,0.12)', color: '#1060A0' },
  workshop: { bg: 'rgba(29,158,117,0.12)', color: '#166B50' },
  meetup: { bg: 'rgba(127,119,221,0.12)', color: '#5A52B0' },
  webinar: { bg: 'rgba(239,159,39,0.12)', color: '#A06B10' },
  social: { bg: 'rgba(212,83,126,0.12)', color: '#A02E55' },
  other: { bg: 'rgba(152,171,190,0.12)', color: '#4A6080' },
};

function QrModal({ event, onClose }: { event: AppEvent; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = event.googleFormUrl || `${window.location.origin}/register/${event.id}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Simple QR placeholder — in production use a QR library
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0F1E30';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size / 2, size / 2 - 8);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#4A6080';
    ctx.fillText(url.substring(0, 36) + '...', size / 2, size / 2 + 12);
  }, [url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `${event.title.replace(/\s+/g, '-')}-qr.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{event.title}</h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize inline-block mb-4"
          style={{ background: (CATEGORY_STYLE[event.category] || CATEGORY_STYLE.other).bg, color: (CATEGORY_STYLE[event.category] || CATEGORY_STYLE.other).color }}>
          {event.category}
        </span>
        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="border border-slate-200 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 truncate flex-1 text-left">{url}</p>
          <button onClick={handleCopy} className="shrink-0 p-1.5 rounded text-slate-400 hover:text-indigo-600 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">Download PNG</button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors text-center flex items-center justify-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
        </div>
      </div>
    </div>
  );
}

export function PublicEventsPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrEvent, setQrEvent] = useState<AppEvent | null>(null);

  useEffect(() => {
    api.getPublishedEvents()
      .then(({ events: evts }) => setEvents(evts.sort((a, b) => a.date.localeCompare(b.date))))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="text-center py-12 px-4" style={{ background: 'linear-gradient(135deg, var(--ad-950) 0%, var(--bs-900) 50%, var(--ad-950) 100%)' }}>
        <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: -0.5 }}>Upcoming Events</h1>
        <p className="text-sm" style={{ color: 'rgba(200,223,240,0.6)' }}>Browse our published events and register today</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--text-sec)' }}>No events available</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(ev => {
              const cs = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.other;
              const regUrl = ev.googleFormUrl || `${window.location.origin}/register/${ev.id}`;
              return (
                <div key={ev.id} className="rounded-[var(--radius-lg)] overflow-hidden transition-all hover:-translate-y-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  {/* Color band */}
                  <div className="h-2" style={{ background: cs.color }} />
                  <div className="p-5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] capitalize inline-block mb-3" style={{ background: cs.bg, color: cs.color }}>
                      {ev.category}
                    </span>
                    <h3 className="text-[15px] font-extrabold mb-3 line-clamp-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{ev.title}</h3>
                    {ev.description && (
                      <p className="text-[12px] mb-3 line-clamp-2" style={{ color: 'var(--text-sec)' }}>{ev.description}</p>
                    )}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{format(parseISO(ev.date), 'EEEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{ev.startTime} – {ev.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={regUrl}
                        target={ev.googleFormUrl ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold text-white rounded-[var(--radius-md)] transition-all hover:-translate-y-px"
                        style={{ background: 'var(--ad-400)', fontFamily: 'var(--font-display)' }}
                      >
                        <Users className="w-3.5 h-3.5" /> Register
                      </a>
                      <button
                        onClick={() => setQrEvent(ev)}
                        className="px-3 py-2.5 rounded-[var(--radius-md)] transition-all hover:-translate-y-px"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}
                        title="View QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {qrEvent && <QrModal event={qrEvent} onClose={() => setQrEvent(null)} />}
    </div>
  );
}
