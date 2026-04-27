import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../store/AppContext';
import { Attendee, AppEvent } from '../types';
import * as api from '../lib/api';
import {
  Camera, CameraOff, CheckCircle2, XCircle, AlertCircle,
  Clock, User, Tag, CalendarDays, RefreshCw, QrCode,
  ChevronDown, ZapOff, Zap, History,
} from 'lucide-react';
import { format } from 'date-fns';

const SCANNER_ID = 'qr-scanner-viewport';

type ScanStatus = 'success' | 'already_in' | 'not_found' | 'wrong_event';

interface ScanRecord {
  id: string;
  status: ScanStatus;
  attendee?: Attendee;
  event?: AppEvent;
  rawValue: string;
  timestamp: Date;
}

const STATUS_META: Record<ScanStatus, { label: string; bg: string; border: string; text: string; icon: typeof CheckCircle2 }> = {
  success:     { label: 'Checked In!',      bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', icon: CheckCircle2 },
  already_in:  { label: 'Already Checked In', bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',  icon: AlertCircle  },
  not_found:   { label: 'Not Registered',   bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',    icon: XCircle      },
  wrong_event: { label: 'Wrong Event',      bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700', icon: AlertCircle  },
};

export function QRScannerPage() {
  const { state, dispatch } = useApp();

  const [selectedEventId, setSelectedEventId] = useState('all');
  const [latestScan, setLatestScan]     = useState<ScanRecord | null>(null);
  const [recentScans, setRecentScans]   = useState<ScanRecord[]>([]);
  const [isActive, setIsActive]         = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [cameraError, setCameraError]   = useState<string | null>(null);
  const [totalToday, setTotalToday]     = useState(0);
  const [successToday, setSuccessToday] = useState(0);

  // Refs so the stable scanner callback always sees latest values
  const scannerRef          = useRef<Html5Qrcode | null>(null);
  const stateRef            = useRef(state);
  const selectedEventIdRef  = useRef(selectedEventId);
  const dispatchRef         = useRef(dispatch);
  const cooldownRef         = useRef(false);
  const lastValueRef        = useRef({ value: '', time: 0 });
  const setLatestScanRef    = useRef(setLatestScan);
  const setRecentScansRef   = useRef(setRecentScans);
  const setTotalTodayRef    = useRef(setTotalToday);
  const setSuccessTodayRef  = useRef(setSuccessToday);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { selectedEventIdRef.current = selectedEventId; }, [selectedEventId]);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

  // Stable scan handler — no deps, uses refs
  const handleScan = useRef(async (rawValue: string) => {
    const now = Date.now();
    if (rawValue === lastValueRef.current.value && now - lastValueRef.current.time < 3000) return;
    if (cooldownRef.current) return;

    lastValueRef.current = { value: rawValue, time: now };
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 2500);

    const currentState       = stateRef.current;
    const currentEventId     = selectedEventIdRef.current;
    const currentDispatch    = dispatchRef.current;

    const addRecord = (record: ScanRecord) => {
      setLatestScanRef.current(record);
      setRecentScansRef.current(prev => [record, ...prev].slice(0, 30));
      setTotalTodayRef.current(prev => prev + 1);
      if (record.status === 'success') setSuccessTodayRef.current(prev => prev + 1);
    };

    // Validate QR format: EVT-<attendeeId>
    const match = rawValue.match(/^EVT-(.+)$/);
    if (!match) {
      addRecord({ id: crypto.randomUUID(), status: 'not_found', rawValue, timestamp: new Date() });
      return;
    }

    const attendeeId = match[1];
    let attendee = currentState.attendees.find(a => a.id === attendeeId);

    // Not in local cache — try fetching from server
    if (!attendee) {
      const eventsToSearch = currentEventId !== 'all'
        ? [currentState.events.find(e => e.id === currentEventId)].filter(Boolean) as AppEvent[]
        : currentState.events;

      for (const evt of eventsToSearch) {
        try {
          const { attendees } = await api.fetchEventAttendees(evt.id);
          const found = attendees.find(a => a.id === attendeeId);
          if (found) {
            currentDispatch({ type: 'REFRESH_EVENT_ATTENDEES', eventId: evt.id, attendees });
            attendee = found;
            break;
          }
        } catch { /* skip */ }
      }
    }

    if (!attendee) {
      addRecord({ id: crypto.randomUUID(), status: 'not_found', rawValue, timestamp: new Date() });
      return;
    }

    const event = currentState.events.find(e => e.id === attendee!.eventId);

    // Wrong event filter active?
    if (currentEventId !== 'all' && attendee.eventId !== currentEventId) {
      addRecord({ id: crypto.randomUUID(), status: 'wrong_event', attendee, event, rawValue, timestamp: new Date() });
      return;
    }

    // Already checked in?
    if (attendee.checkedIn) {
      addRecord({ id: crypto.randomUUID(), status: 'already_in', attendee, event, rawValue, timestamp: new Date() });
      return;
    }

    // ✅ Check in
    currentDispatch({ type: 'CHECKIN_ATTENDEE', id: attendee.id, checkedIn: true });
    const updated: Attendee = { ...attendee, checkedIn: true, checkedInAt: new Date().toISOString() };
    api.updateAttendee(updated).catch(e => console.error('Check-in sync failed:', e));

    addRecord({ id: crypto.randomUUID(), status: 'success', attendee, event, rawValue, timestamp: new Date() });
  });

  const startScanner = async () => {
    setCameraError(null);
    setIsLoading(true);
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (text) => handleScan.current(text),
        () => { /* per-frame miss — ignore */ },
      );
      setIsActive(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('permission')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
      // Clean up element if html5-qrcode injected anything
      try { scannerRef.current?.clear(); } catch {}
      scannerRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setIsActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear();
        });
      }
    };
  }, []);

  const events = state.events;
  const selectedEvent = events.find(e => e.id === selectedEventId);

  const checkedInCount = selectedEventId === 'all'
    ? state.attendees.filter(a => a.checkedIn).length
    : state.attendees.filter(a => a.eventId === selectedEventId && a.checkedIn).length;

  const totalCount = selectedEventId === 'all'
    ? state.attendees.length
    : state.attendees.filter(a => a.eventId === selectedEventId).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">QR Check-in Scanner</h1>
            <p className="text-xs text-slate-500 mt-0.5">Scan attendee QR codes to verify registration &amp; check them in</p>
          </div>
        </div>

        {/* Event selector */}
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer min-w-[200px]"
          >
            <option value="all">All Events</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Checked In Today', value: successToday, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Total Scans Today', value: totalToday, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: selectedEventId === 'all' ? 'All Attendees' : 'Event Attendees', value: `${checkedInCount}/${totalCount}`, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-4 py-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Camera Column ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Camera viewport */}
            <div className="relative bg-slate-900 flex items-center justify-center" style={{ minHeight: 340 }}>

              {/* html5-qrcode mounts into this div */}
              <div
                id={SCANNER_ID}
                className="w-full"
                style={{ minHeight: isActive ? 300 : 0 }}
              />

              {/* Overlay when not active */}
              {!isActive && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
                  {cameraError ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                        <CameraOff className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-red-300 text-sm max-w-xs">{cameraError}</p>
                      <button
                        onClick={startScanner}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Retry Camera
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-slate-300 font-medium">Camera is off</p>
                        <p className="text-slate-500 text-xs mt-1">Click Start Scanner to begin</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Loading spinner */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-slate-300 text-sm">Starting camera…</p>
                </div>
              )}

              {/* Active scan overlay corners */}
              {isActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-60 h-60">
                    {/* Corner marks */}
                    {[
                      'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                      'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                      'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                      'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-7 h-7 border-indigo-400 ${cls}`} />
                    ))}
                    {/* Scan line animation */}
                    <div className="absolute left-2 right-2 top-2 bottom-2 overflow-hidden">
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-80"
                        style={{ animation: 'scanline 2s ease-in-out infinite' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live badge */}
              {isActive && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>
              )}

              {/* Event badge */}
              {isActive && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="text-white text-xs">
                    {selectedEventId === 'all' ? 'All Events' : (selectedEvent?.title ?? 'Unknown')}
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {isActive ? 'Point camera at attendee QR code' : 'Camera inactive'}
              </p>
              <button
                onClick={isActive ? stopScanner : startScanner}
                disabled={isLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  isActive
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Starting…</>
                ) : isActive ? (
                  <><ZapOff className="w-4 h-4" /> Stop Scanner</>
                ) : (
                  <><Zap className="w-4 h-4" /> Start Scanner</>
                )}
              </button>
            </div>
          </div>

          {/* Latest scan result */}
          {latestScan && (
            <LatestResultCard scan={latestScan} />
          )}
        </div>

        {/* ── Recent Scans Column ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-700 text-sm">Recent Scans</h2>
              </div>
              {recentScans.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {recentScans.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: 520 }}>
              {recentScans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm">No scans yet</p>
                  <p className="text-slate-300 text-xs">Scanned QR codes will appear here</p>
                </div>
              ) : (
                recentScans.map(scan => (
                  <RecentScanRow key={scan.id} scan={scan} />
                ))
              )}
            </div>

            {recentScans.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100">
                <button
                  onClick={() => { setRecentScans([]); setTotalToday(0); setSuccessToday(0); }}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-indigo-700 mb-2">How it works</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-indigo-600">
          {[
            { step: '1', text: 'Select an event (optional)' },
            { step: '2', text: 'Click Start Scanner' },
            { step: '3', text: 'Point camera at QR code' },
            { step: '4', text: 'Attendee is auto checked-in' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scanline CSS animation */}
      <style>{`
        @keyframes scanline {
          0%   { top: 4px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: calc(100% - 4px); opacity: 0; }
        }
        /* Override html5-qrcode default styles */
        #qr-scanner-viewport video {
          border-radius: 0 !important;
          width: 100% !important;
        }
        #qr-scanner-viewport img {
          display: none !important;
        }
        #qr-scanner-viewport > div:first-child {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}

// ── Sub-components (defined outside to avoid remount on re-render) ─────────────

function LatestResultCard({ scan }: { scan: ScanRecord }) {
  const meta = STATUS_META[scan.status];
  const Icon = meta.icon;

  return (
    <div className={`${meta.bg} border-2 ${meta.border} rounded-2xl p-5 transition-all`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${
          scan.status === 'success' ? 'bg-emerald-500' :
          scan.status === 'already_in' ? 'bg-amber-500' :
          scan.status === 'wrong_event' ? 'bg-orange-500' : 'bg-red-500'
        } flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className={`font-bold text-base ${meta.text}`}>{meta.label}</p>
            <span className="text-xs text-slate-400 shrink-0">
              {format(scan.timestamp, 'h:mm:ss a')}
            </span>
          </div>

          {scan.attendee ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 truncate">{scan.attendee.name}</span>
              </div>
              {scan.attendee.email && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs text-slate-500 truncate">{scan.attendee.email}</span>
                </div>
              )}
              {scan.attendee.sector && (
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600">{scan.attendee.sector}</span>
                </div>
              )}
              {scan.event && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">{scan.event.title}</span>
                </div>
              )}
              {scan.status === 'already_in' && scan.attendee.checkedInAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-600">
                    Checked in at {format(new Date(scan.attendee.checkedInAt), 'h:mm a')}
                  </span>
                </div>
              )}
              {scan.status === 'wrong_event' && (
                <p className="text-xs text-orange-600 mt-1">
                  This attendee belongs to <strong>{scan.event?.title}</strong>, not the selected event.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-red-600">QR code not recognized</p>
              <p className="text-xs text-red-400 font-mono truncate">{scan.rawValue}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentScanRow({ scan }: { scan: ScanRecord }) {
  const meta = STATUS_META[scan.status];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
      <Icon className={`w-4 h-4 shrink-0 ${meta.text}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">
          {scan.attendee?.name ?? 'Unknown QR'}
        </p>
        <p className={`text-xs ${meta.text} truncate`}>{meta.label}</p>
      </div>
      <span className="text-xs text-slate-400 shrink-0 tabular-nums">
        {format(scan.timestamp, 'h:mm:ss a')}
      </span>
    </div>
  );
}
