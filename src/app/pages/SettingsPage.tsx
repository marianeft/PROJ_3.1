import { useState } from 'react';
import {
  Download, Wifi, WifiOff, RefreshCw, CloudUpload, Eye, EyeOff,
  User, Lock, Check, Copy, FileText, Trash2, AlertTriangle,
  Link2, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { toast } from 'sonner';
import * as api from '../lib/api';
import { format } from 'date-fns';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };
  return (
    <div className="relative group">
      <pre className="text-[12px] rounded-[var(--radius-md)] p-4 overflow-x-auto font-mono leading-relaxed" style={{ background: 'var(--ad-950)', color: 'var(--ad-200)' }}>
        {code}
      </pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--ad-800)', color: 'var(--sidebar-text)' }}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { state, dispatch, isOnline, isSyncing } = useApp();
  const [activeTab, setActiveTab] = useState<'account' | 'data'>('account');
  const [isResyncing, setIsResyncing] = useState(false);

  // Account state
  const [newUsername, setNewUsername] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');

  // Integrations state
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => localStorage.getItem('em_appsscript_url') || '');
  const [appsScriptStatus, setAppsScriptStatus] = useState<'connected' | 'disconnected' | 'testing' | null>(
    () => (localStorage.getItem('em_appsscript_status') as any) || null
  );

  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) { toast.error('Enter an Apps Script URL first'); return; }
    setAppsScriptStatus('testing');
    try {
      const res = await fetch(appsScriptUrl.trim() + '?test=true', { method: 'GET', mode: 'no-cors' });
      // no-cors means we can't read the response, but if it doesn't throw, connectivity is okay
      setAppsScriptStatus('connected');
      localStorage.setItem('em_appsscript_url', appsScriptUrl.trim());
      localStorage.setItem('em_appsscript_status', 'connected');
      toast.success('Connection successful');
    } catch {
      setAppsScriptStatus('disconnected');
      localStorage.setItem('em_appsscript_status', 'disconnected');
      toast.error('Connection failed');
    }
  };

  const handleSaveAppsScript = () => {
    localStorage.setItem('em_appsscript_url', appsScriptUrl.trim());
    toast.success('Apps Script URL saved');
  };

  const handleChangeUsername = () => {
    if (!newUsername.trim()) { toast.error('Username cannot be empty'); return; }
    // In production, this would call the backend. For now, update localStorage.
    const creds = JSON.parse(localStorage.getItem('em_admin_credentials') || '{"username":"admin","password":"admin1234"}');
    creds.username = newUsername.trim();
    localStorage.setItem('em_admin_credentials', JSON.stringify(creds));
    toast.success(`Username changed to "${newUsername.trim()}"`);
    setNewUsername('');
  };

  const handleChangePassword = () => {
    const creds = JSON.parse(localStorage.getItem('em_admin_credentials') || '{"username":"admin","password":"admin1234"}');
    if (currentPw !== creds.password) { toast.error('Current password is incorrect'); return; }
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    creds.password = newPw;
    localStorage.setItem('em_admin_credentials', JSON.stringify(creds));
    toast.success('Password changed successfully');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  const exportCSV = (type: 'events' | 'attendees') => {
    let csv = '';
    if (type === 'events') {
      csv = 'ID,Title,Date,Start,End,Location,Category,Status,Max Attendees,Tags\n' +
        state.events.map(e =>
          `"${e.id}","${e.title}","${e.date}","${e.startTime}","${e.endTime}","${e.location}","${e.category}","${e.status}","${e.maxAttendees || ''}","${e.tags.join('; ')}"`
        ).join('\n');
    } else {
      csv = 'ID,Event ID,Name,Email,Sector,Phone,Status,Checked In,Registered At\n' +
        state.attendees.map(a =>
          `"${a.id}","${a.eventId}","${a.name}","${a.email}","${a.sector || ''}","${a.phone || ''}","${a.status}","${a.checkedIn}","${a.registeredAt}"`
        ).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${type} as CSV`);
  };

  const handleExportJSON = () => {
    const data = { events: state.events, attendees: state.attendees, exportedAt: new Date().toISOString(), version: 'events-manager-v2' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported as JSON');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.events && data.attendees) {
          dispatch({ type: 'INIT', state: { events: data.events, attendees: data.attendees, notifications: state.notifications } });
          if (isOnline) {
            try {
              toast.loading('Pushing imported data to Supabase...', { id: 'import-sync' });
              await Promise.all(data.events.map((ev: any) => api.createEvent(ev)));
              await api.bulkCreateAttendees(data.attendees);
              toast.success(`Imported ${data.events.length} events & ${data.attendees.length} attendees`, { id: 'import-sync' });
            } catch (err) {
              console.error('Sync after import failed:', err);
              toast.warning('Imported locally — cloud sync failed', { id: 'import-sync' });
            }
          } else {
            toast.success(`Imported ${data.events.length} events & ${data.attendees.length} attendees`);
          }
        } else toast.error('Invalid backup file');
      } catch { toast.error('Failed to parse file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearDrafts = () => {
    if (!confirm('Delete all draft events? This cannot be undone.')) return;
    const drafts = state.events.filter(e => e.status === 'draft');
    drafts.forEach(e => dispatch({ type: 'DELETE_EVENT', id: e.id }));
    toast.success(`Cleared ${drafts.length} draft events`);
  };

  const handleResetAll = async () => {
    if (resetConfirm !== 'RESET') { toast.error('Type RESET to confirm'); return; }
    dispatch({ type: 'INIT', state: { events: [], attendees: [], notifications: [] } });
    if (isOnline) {
      try { await api.purgeAllData(); toast.success('All data cleared'); } catch { toast.warning('Cleared locally — cloud delete failed'); }
    } else toast.success('All local data cleared');
    setResetConfirm('');
  };

  const handleResync = async () => {
    if (!isOnline) { toast.error('Cannot resync while offline'); return; }
    setIsResyncing(true);
    try {
      const data = await api.loadAllData();
      dispatch({ type: 'INIT', state: { events: data.events ?? [], attendees: data.attendees ?? [], notifications: data.notifications ?? [] } });
      toast.success('Data re-synced from Supabase');
    } catch { toast.error('Re-sync failed'); }
    finally { setIsResyncing(false); }
  };

  const TABS = [
    { id: 'account' as const, label: 'Account' },
    { id: 'data' as const, label: 'Data Management' },
  ];

  const cardStyle = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' };
  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', fontSize: 13, padding: '10px 14px', width: '100%',
    fontFamily: 'var(--font-body)',
  };
  const btnPrimary = {
    background: 'var(--bs-600)', color: '#fff', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
    padding: '10px 20px', boxShadow: 'var(--shadow-btn)',
  };
  const btnDanger = {
    background: 'transparent', border: '1px solid rgba(224,80,80,0.2)', color: 'var(--red-text)',
    borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontWeight: 600,
    fontSize: 13, padding: '10px 20px',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 animate-fade-up">
        <h1 style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-sec)' }}>Account configuration and data management</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 mb-6 w-fit rounded-[var(--radius-md)] animate-fade-up" style={{ background: 'var(--surface2)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="px-5 py-2 rounded-[var(--radius-sm)] text-[13px] font-semibold transition-all"
            style={{
              background: activeTab === t.id ? 'var(--surface)' : 'transparent',
              color: activeTab === t.id ? 'var(--text)' : 'var(--text-sec)',
              boxShadow: activeTab === t.id ? 'var(--shadow-card)' : 'none',
              fontFamily: 'var(--font-display)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Account Tab ──────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div className="space-y-5 animate-fade-up">
          {/* Change Username */}
          <div style={cardStyle} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4" style={{ color: 'var(--bs-600)' }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Change Username</h3>
            </div>
            <p className="text-[11px] mb-1" style={{ color: 'var(--text-dim)' }}>Current username:</p>
            <p className="text-[13px] font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {JSON.parse(localStorage.getItem('em_admin_credentials') || '{"username":"admin"}').username}
            </p>
            <div className="flex gap-3">
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="New username"
                style={inputStyle}
                className="flex-1"
              />
              <button onClick={handleChangeUsername} style={btnPrimary} className="shrink-0 transition-all hover:-translate-y-px">Save</button>
            </div>
          </div>

          {/* Change Password */}
          <div style={cardStyle} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4" style={{ color: 'var(--bs-600)' }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Change Password</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Current Password', val: currentPw, set: setCurrentPw, show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
                { label: 'New Password', val: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                { label: 'Confirm Password', val: confirmPw, set: setConfirmPw, show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v) },
              ].map(f => (
                <div key={f.label}>
                  <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{f.label}</label>
                  <div className="relative">
                    <input
                      type={f.show ? 'text' : 'password'}
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }}>
                      {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>New password must be at least 8 characters</p>
              <button onClick={handleChangePassword} style={btnPrimary} className="transition-all hover:-translate-y-px">Update Password</button>
            </div>
          </div>

          {/* Integrations */}
          <div style={cardStyle} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4" style={{ color: 'var(--bs-600)' }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Integrations</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Google Apps Script URL
                </label>
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-dim)' }}>
                  Used for certificate generation and email delivery via Google Drive.
                </p>
                <div className="flex gap-3">
                  <input
                    value={appsScriptUrl}
                    onChange={e => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    style={inputStyle}
                    className="flex-1"
                  />
                  <button onClick={handleSaveAppsScript} style={{ ...btnPrimary, background: 'transparent', color: 'var(--text-sec)', border: '1px solid var(--border)', boxShadow: 'none' }} className="shrink-0 transition-all hover:-translate-y-px">
                    Save
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={appsScriptStatus === 'testing'}
                  style={btnPrimary}
                  className="flex items-center gap-2 transition-all hover:-translate-y-px disabled:opacity-50"
                >
                  {appsScriptStatus === 'testing' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                  ) : (
                    <><Link2 className="w-4 h-4" /> Test Connection</>
                  )}
                </button>

                {appsScriptStatus && appsScriptStatus !== 'testing' && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: appsScriptStatus === 'connected' ? 'var(--ad-400)' : 'var(--red-text)' }} />
                    <span className="text-[12px] font-semibold" style={{
                      color: appsScriptStatus === 'connected' ? 'var(--ad-400)' : 'var(--red-text)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {appsScriptStatus === 'connected' ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <strong>Setup:</strong> Deploy a Google Apps Script as a Web App, configure it with your Supabase credentials and Google Drive folder. The script handles DOCX template token replacement, PDF conversion, and email delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Data Management Tab ──────────────────────────────────────── */}
      {activeTab === 'data' && (
        <div className="space-y-4 animate-fade-up">
          {/* Supabase Status */}
          <div
            className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)]"
            style={{
              background: isOnline ? 'rgba(29,158,117,0.08)' : 'rgba(239,159,39,0.08)',
              border: `1px solid ${isOnline ? 'rgba(29,158,117,0.18)' : 'rgba(239,159,39,0.18)'}`,
            }}
          >
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: isOnline ? 'rgba(29,158,117,0.15)' : 'rgba(239,159,39,0.15)' }}>
              {isSyncing || isResyncing ? <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--bs-600)' }} />
                : isOnline ? <Wifi className="w-5 h-5" style={{ color: 'var(--ad-400)' }} />
                : <WifiOff className="w-5 h-5" style={{ color: 'var(--amber)' }} />}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {isSyncing || isResyncing ? 'Syncing...' : isOnline ? 'Connected to Supabase' : 'Offline'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-sec)' }}>
                {isOnline ? 'Changes sync automatically' : 'Changes saved locally'}
              </p>
            </div>
            {isOnline && (
              <button onClick={handleResync} disabled={isResyncing} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white rounded-[var(--radius-sm)] font-semibold transition-all disabled:opacity-50" style={{ background: 'var(--ad-400)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`} /> Re-sync
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: state.events.length, l: 'Events', c: 'var(--ad-600)' },
              { v: state.attendees.length.toLocaleString(), l: 'Attendees', c: 'var(--ad-400)' },
              { v: state.notifications.length, l: 'Notifications', c: 'var(--amber)' },
            ].map(s => (
              <div key={s.l} className="p-4 text-center" style={cardStyle}>
                <p className="text-[26px] font-extrabold" style={{ color: s.c, fontFamily: 'var(--font-display)' }}>{s.v}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-sec)' }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={cardStyle} className="divide-y" >
            {[
              { label: 'Export Events CSV', desc: 'Download all events as a CSV spreadsheet', icon: FileText, action: () => exportCSV('events'), btnLabel: 'Export CSV', style: btnPrimary },
              { label: 'Export Attendees CSV', desc: 'Download all attendee data as CSV', icon: FileText, action: () => exportCSV('attendees'), btnLabel: 'Export CSV', style: btnPrimary },
              { label: 'Backup Database', desc: 'Full JSON snapshot of all data', icon: Download, action: handleExportJSON, btnLabel: 'Export JSON', style: btnPrimary },
              { label: 'Import Data', desc: 'Restore from a JSON backup file', icon: CloudUpload, action: null, btnLabel: 'Import JSON', style: { ...btnPrimary, background: 'transparent', color: 'var(--text-sec)', border: '1px solid var(--border)', boxShadow: 'none' } },
            ].map(item => (
              <div key={item.label} className="p-5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{item.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.desc}</p>
                </div>
                {item.action ? (
                  <button onClick={item.action} className="flex items-center gap-2 shrink-0 transition-all hover:-translate-y-px" style={item.style}>
                    <item.icon className="w-4 h-4" /> {item.btnLabel}
                  </button>
                ) : (
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer transition-all hover:-translate-y-px" style={item.style as any}>
                    <item.icon className="w-4 h-4" /> {item.btnLabel}
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Destructive Actions */}
          <div style={cardStyle} className="divide-y">
            {/* Clear drafts */}
            <div className="p-5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--red-text)', fontFamily: 'var(--font-display)' }}>Clear Draft Events</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Delete all events with "draft" status</p>
              </div>
              <button onClick={handleClearDrafts} className="flex items-center gap-2 shrink-0 transition-all hover:-translate-y-px" style={btnDanger}>
                <Trash2 className="w-4 h-4" /> Clear Drafts
              </button>
            </div>

            {/* Reset all */}
            <div className="p-5" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--red-text)' }} />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--red-text)', fontFamily: 'var(--font-display)' }}>Reset All Data</p>
                  <p className="text-[11px] mt-0.5 mb-3" style={{ color: 'var(--text-dim)' }}>Permanently delete everything. Type RESET to confirm.</p>
                  <div className="flex gap-3">
                    <input
                      value={resetConfirm}
                      onChange={e => setResetConfirm(e.target.value)}
                      placeholder='Type "RESET"'
                      style={{ ...inputStyle, maxWidth: 200 }}
                    />
                    <button
                      onClick={handleResetAll}
                      disabled={resetConfirm !== 'RESET'}
                      className="flex items-center gap-2 shrink-0 transition-all disabled:opacity-30"
                      style={btnDanger}
                    >
                      <Trash2 className="w-4 h-4" /> Reset Everything
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}