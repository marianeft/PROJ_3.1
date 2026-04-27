import { useState, useEffect, FormEvent } from 'react';
import { X, User, Mail, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { SectorField } from '../forms/SectorField';
import type { Attendee } from '../../types';
import { GENDERS } from '../../types';

interface AddEditAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AttendeeFormData) => Promise<void>;
  initialData?: Attendee | null;
  eventId: string;
  title?: string;
}

export interface AttendeeFormData {
  name: string;
  email: string;
  sector: string;
  gender?: string;
  phone?: string;
}

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

export function AddEditAttendeeModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  eventId,
  title = 'Add Attendee',
}: AddEditAttendeeModalProps) {
  const [form, setForm] = useState<AttendeeFormData>({
    name: '',
    email: '',
    sector: '',
    gender: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && isOpen) {
      setForm({
        name: initialData.name,
        email: initialData.email,
        sector: initialData.sector || '',
        gender: initialData.gender || '',
        phone: initialData.phone || '',
      });
      setErrors({});
    } else if (!initialData && isOpen) {
      setForm({
        name: '',
        email: '',
        sector: '',
        gender: '',
        phone: '',
      });
      setErrors({});
    }
  }, [initialData, isOpen]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Please enter a valid email';
    if (!form.sector) e.sector = 'Please select a sector';
    if (form.phone && !/^[\d+\-() ]{7,20}$/.test(form.phone))
      e.phone = 'Invalid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2
            className="text-[16px] font-bold"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  color: 'var(--text-sec)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Full Name <span style={{ color: 'var(--red-text)' }}>*</span>
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputCls(errors.name) + ' pl-10'}
                  style={inputStyle(errors.name)}
                  placeholder="e.g. Jane Smith"
                  disabled={isLoading}
                />
              </div>
              {errors.name && (
                <p
                  className="text-[11px] mt-1 flex items-center gap-1"
                  style={{ color: 'var(--red-text)' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  color: 'var(--text-sec)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Email Address <span style={{ color: 'var(--red-text)' }}>*</span>
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-dim)' }}
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputCls(errors.email) + ' pl-10'}
                  style={inputStyle(errors.email)}
                  placeholder="e.g. jane@company.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p
                  className="text-[11px] mt-1 flex items-center gap-1"
                  style={{ color: 'var(--red-text)' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
                A confirmation email will be sent to this address.
              </p>
            </div>

            {/* Sector */}
            <SectorField
              value={form.sector}
              onChange={(value) => setForm((f) => ({ ...f, sector: value }))}
              error={errors.sector}
              disabled={isLoading}
              placeholder="Select sector..."
            />

            {/* Gender */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  color: 'var(--text-sec)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Gender{' '}
                <span
                  className="font-normal normal-case tracking-normal"
                  style={{ color: 'var(--text-dim)', fontSize: 11 }}
                >
                  (optional)
                </span>
              </label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value }))
                }
                disabled={isLoading}
                className={inputCls(errors.gender) + ' pl-4 pr-3'}
                style={{
                  ...inputStyle(errors.gender),
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32,
                }}
              >
                <option value="">Not specified</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  color: 'var(--text-sec)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Phone Number{' '}
                <span
                  className="font-normal normal-case tracking-normal"
                  style={{ color: 'var(--text-dim)', fontSize: 11 }}
                >
                  (optional)
                </span>
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-dim)' }}
                />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputCls(errors.phone) + ' pl-10'}
                  style={inputStyle(errors.phone)}
                  placeholder="+63 9XX XXX XXXX"
                  disabled={isLoading}
                />
              </div>
              {errors.phone && (
                <p
                  className="text-[11px] mt-1 flex items-center gap-1"
                  style={{ color: 'var(--red-text)' }}
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex gap-2 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 text-[13px] font-medium rounded-md transition-colors disabled:opacity-50"
            style={{
              background: 'var(--surface2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={(e: any) => handleSubmit(e)}
            disabled={isLoading}
            className="flex-1 py-3 text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--ad-400), #16A085)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Attendee'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
