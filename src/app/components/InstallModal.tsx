import { useState } from 'react';
import { X, Download, Smartphone, Monitor, Share, Plus, CheckCircle } from 'lucide-react';

interface Props {
  isIOS: boolean;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'>;
  onClose: () => void;
}

export function InstallModal({ isIOS, onInstall, onClose }: Props) {
  const [step, setStep] = useState<'info' | 'installing' | 'done' | 'ios'>('info');

  const handleInstall = async () => {
    if (isIOS) { setStep('ios'); return; }
    setStep('installing');
    const result = await onInstall();
    if (result === 'accepted') setStep('done');
    else setStep('info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-8 text-white text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
              <rect width="40" height="40" rx="8" fill="white" fillOpacity="0.2" />
              <rect x="8" y="12" width="24" height="20" rx="3" stroke="white" strokeWidth="2" fill="none" />
              <path d="M8 17h24" stroke="white" strokeWidth="2" />
              <rect x="13" y="7" width="3" height="8" rx="1.5" fill="white" />
              <rect x="24" y="7" width="3" height="8" rx="1.5" fill="white" />
              <rect x="12" y="22" width="5" height="5" rx="1" fill="white" fillOpacity="0.8" />
              <rect x="23" y="22" width="5" height="5" rx="1" fill="white" fillOpacity="0.8" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">EventsManager</h2>
          <p className="text-white/80 text-sm mt-1">Install as an app on your device</p>
        </div>

        <div className="p-6">
          {step === 'info' && (
            <>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Monitor, label: 'Works on desktop & mobile', sub: 'Windows, macOS, Android, iOS' },
                  { icon: Download, label: 'Offline access', sub: 'View cached data without internet' },
                  { icon: Smartphone, label: 'Home screen shortcut', sub: 'Quick access like a native app' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium">
                  Not now
                </button>
                <button onClick={handleInstall} className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Install App
                </button>
              </div>
            </>
          )}

          {step === 'installing' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-700 font-medium">Installing…</p>
              <p className="text-xs text-slate-400 mt-1">Follow the browser prompt</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-slate-800 font-semibold">App installed!</p>
              <p className="text-sm text-slate-500 mt-1">EventsManager is now on your home screen.</p>
              <button onClick={onClose} className="mt-5 w-full px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
                Done
              </button>
            </div>
          )}

          {step === 'ios' && (
            <>
              <p className="text-sm text-slate-600 mb-4">To install on iOS, follow these steps in <strong>Safari</strong>:</p>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Share, step: '1', text: 'Tap the Share button at the bottom of Safari' },
                  { icon: Plus, step: '2', text: 'Scroll down and tap "Add to Home Screen"' },
                  { icon: CheckCircle, step: '3', text: 'Tap "Add" in the top right corner' },
                ].map(({ icon: Icon, step: s, text }) => (
                  <div key={s} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{s}</div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                      <p className="text-sm text-slate-700">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="w-full px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
