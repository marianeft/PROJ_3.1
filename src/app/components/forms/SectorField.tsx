import { Tag, ChevronDown, AlertCircle } from 'lucide-react';
import { SECTORS } from '../../types';

interface SectorFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  optional?: boolean;
  className?: string;
  placeholder?: string;
}

export function SectorField({
  value,
  onChange,
  error,
  disabled = false,
  optional = false,
  className = '',
  placeholder = 'Select sector...',
}: SectorFieldProps) {
  return (
    <div className={className}>
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
        Sector
        {!optional && <span style={{ color: 'var(--red-text)' }}>*</span>}
        {optional && (
          <span
            className="font-normal normal-case tracking-normal"
            style={{ color: 'var(--text-dim)', fontSize: 11 }}
          >
            {' '}(optional)
          </span>
        )}
      </label>

      <div className="relative">
        {/* Left Tag Icon */}
        <Tag
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-dim)' }}
        />

        {/* Select Field */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-[13px] rounded-[var(--radius-md)] focus:outline-none transition-all appearance-none cursor-pointer pr-9"
          style={{
            paddingLeft: 36,
            paddingRight: 36,
            background: error ? 'rgba(224,80,80,0.05)' : 'var(--surface2)',
            border: `1px solid ${error ? 'rgba(224,80,80,0.3)' : 'var(--border)'}`,
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            focusBorderColor: error ? 'rgba(224,80,80,0.3)' : 'var(--bs-600)',
            boxShadow: error ? undefined : 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--bs-600)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(127,119,221,0.10)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <option value="">{placeholder}</option>
          {SECTORS.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        {/* Right Chevron Icon */}
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-dim)' }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p
          className="text-[11px] mt-1 flex items-center gap-1"
          style={{ color: 'var(--red-text)' }}
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
