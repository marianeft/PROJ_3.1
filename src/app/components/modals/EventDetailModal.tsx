import { useState, useEffect } from 'react';
import {
  X, Download, Copy, Check, ExternalLink, Plus, Trash2, Edit2,
  Eye, Send, AlertCircle, Loader2, Mail,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as QRCode from 'qrcode';
import type { AppEvent, Attendee } from '../../types';
import * as api from '../../lib/api';

interface EventDetailModalProps {
  event: AppEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: AppEvent) => void;
  onAddAttendee?: () => void;
  onEditAttendee?: (attendee: Attendee) => void;
  onRemoveAttendee?: (attendeeId: string) => void;
  onSendCertificates?: (eventId: string) => void;
}

type TabType = 'overview' | 'attendees' | 'certificate' | 'qrcode';

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  conference: { bg: 'rgba(55,138,221,0.15)', color: '#1060A0' },
  workshop: { bg: 'rgba(29,158,117,0.15)', color: '#166B50' },
  meetup: { bg: 'rgba(127,119,221,0.15)', color: '#5A52B0' },
  webinar: { bg: 'rgba(239,159,39,0.15)', color: '#A06B10' },
  social: { bg: 'rgba(212,83,126,0.15)', color: '#A02E55' },
  other: { bg: 'rgba(152,171,190,0.15)', color: '#4A6080' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'rgba(152,171,190,0.15)', color: '#4A6080' },
  published: { bg: 'rgba(29,158,117,0.15)', color: '#166B50' },
  cancelled: { bg: 'rgba(224,80,80,0.15)', color: '#A02040' },
  completed: { bg: 'rgba(127,119,221,0.15)', color: '#5A52B0' },
};

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onAddAttendee,
  onEditAttendee,
  onRemoveAttendee,
  onSendCertificates,
}: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Generate QR code when modal opens
  useEffect(() => {
    if (event?.googleFormUrl && activeTab === 'qrcode') {
      QRCode.toDataURL(event.googleFormUrl).then(setQrCode).catch(console.error);
    }
  }, [event, activeTab]);

  // Load attendees when modal opens
  useEffect(() => {
    if (event && activeTab === 'attendees') {
      setAttendeesLoading(true);
      api.getEventAttendees(event.id)
        .then(setAttendees)
        .catch(console.error)
        .finally(() => setAttendeesLoading(false));
    }
  }, [event, activeTab]);

  if (!isOpen || !event) return null;

  const catStyle = CATEGORY_STYLE[event.category] || CATEGORY_STYLE.other;
  const statStyle = STATUS_STYLE[event.status] || STATUS_STYLE.draft;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-screen z-50 overflow-y-auto flex flex-col"
        style={{
          width: 'min(720px, 90vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-start justify-between border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.8px] mb-1" style={{ color: 'var(--text-dim)' }}>
              Event Details
            </p>
            <h2
              className="text-[18px] font-bold truncate"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
            >
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 hover:bg-white/10 rounded-md transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0 px-6 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {(['overview', 'attendees', 'certificate', 'qrcode'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-3 text-[13px] font-medium transition-colors capitalize border-b-2"
              style={{
                borderColor: activeTab === tab ? 'var(--bs-600)' : 'transparent',
                color: activeTab === tab ? 'var(--bs-600)' : 'var(--text-dim)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span
                    className="text-[11px] font-bold px-2 py-1 rounded capitalize"
                    style={{ background: catStyle.bg, color: catStyle.color }}
                  >
                    {event.category}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-1 rounded capitalize ml-2"
                    style={{ background: statStyle.bg, color: statStyle.color }}
                  >
                    {event.status}
                  </span>
                </div>
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(event);
                      onClose();
                    }}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <InfoRow label="Date" value={format(parseISO(event.date), 'EEEE, MMMM d, yyyy')} />
                <InfoRow label="Time" value={`${event.startTime} - ${event.endTime}`} />
                <InfoRow label="Location" value={event.location} />
                {event.virtualLink && <InfoRow label="Virtual Link" value={event.virtualLink} />}
              </div>

              {event.description && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                    Description
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text)' }}>
                    {event.description}
                  </p>
                </div>
              )}

              {event.tags && event.tags.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-[11px] rounded"
                        style={{
                          background: 'rgba(127,119,221,0.1)',
                          color: 'var(--bs-600)',
                          border: '1px solid rgba(127,119,221,0.2)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.maxAttendees && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                    Capacity
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--surface2)' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(attendees.length / event.maxAttendees) * 100}%`,
                          background: 'linear-gradient(135deg, var(--ad-400), #16A085)',
                        }}
                      />
                    </div>
                    <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>
                      {attendees.length} / {event.maxAttendees}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ATTENDEES TAB */}
          {activeTab === 'attendees' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium">
                  {attendees.length} Registered
                </p>
                <div className="flex gap-2">
                  {onSendCertificates && (
                    <button
                      onClick={() => {
                        onSendCertificates(event.id);
                      }}
                      className="px-3 py-1.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors"
                      style={{
                        background: 'rgba(127,119,221,0.1)',
                        color: 'var(--bs-600)',
                        border: '1px solid rgba(127,119,221,0.2)',
                      }}
                    >
                      <Send className="w-3 h-3" /> Send All Certs
                    </button>
                  )}
                  {onAddAttendee && (
                    <button
                      onClick={onAddAttendee}
                      className="px-3 py-1.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, var(--ad-400), #16A085)',
                        color: 'white',
                      }}
                    >
                      <Plus className="w-3 h-3" /> Add Attendee
                    </button>
                  )}
                </div>
              </div>

              {attendeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-dim)' }} />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>
                    No attendees registered yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="p-3 rounded-md border flex items-start justify-between gap-3"
                      style={{
                        background: 'var(--surface2)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate" style={{ color: 'var(--text)' }}>
                          {attendee.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-dim)' }}>
                          {attendee.email}
                        </p>
                        {attendee.sector && (
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                            {attendee.sector}
                          </p>
                        )}
                        {attendee.certificateNumber && (
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--bs-600)' }}>
                            {attendee.certificateNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {attendee.certificateSentAt ? (
                          <button
                            title="Certificate sent"
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--ad-400)' }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            title="Send certificate"
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--text-dim)' }}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {onEditAttendee && (
                          <button
                            onClick={() => {
                              onEditAttendee(attendee);
                              onClose();
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--text-dim)' }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onRemoveAttendee && (
                          <button
                            onClick={() => onRemoveAttendee(attendee.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--red-text)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CERTIFICATE TAB */}
          {activeTab === 'certificate' && (
            <div className="space-y-4">
              <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>
                Certificate template management coming soon
              </p>
            </div>
          )}

          {/* QR CODE TAB */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4">
              {event.googleFormUrl ? (
                <>
                  <div className="flex flex-col items-center gap-3">
                    {qrCode && (
                      <img
                        src={qrCode}
                        alt="QR Code"
                        className="w-60 h-60 border rounded-lg"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (qrCode) {
                          const link = document.createElement('a');
                          link.href = qrCode;
                          link.download = `${event.title}-qr.png`;
                          link.click();
                        }
                      }}
                      className="flex-1 py-2 px-3 text-[12px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
                      style={{
                        background: 'var(--surface2)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                    <button
                      onClick={() => {
                        if (event.googleFormUrl) {
                          navigator.clipboard.writeText(event.googleFormUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="flex-1 py-2 px-3 text-[12px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
                      style={{
                        background: 'var(--surface2)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => window.open(event.googleFormUrl, '_blank')}
                      className="flex-1 py-2 px-3 text-[12px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, var(--ad-400), #16A085)',
                        color: 'white',
                      }}
                    >
                      <ExternalLink className="w-4 h-4" /> Open Form
                    </button>
                  </div>

                  <div className="p-3 rounded-md" style={{ background: 'var(--surface2)' }}>
                    <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-dim)' }}>
                      {event.googleFormUrl}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>
                    No Google Form URL configured for this event
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper Component
interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-dim)' }}>
        {label}
      </p>
      <p className="text-[13px]" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}
