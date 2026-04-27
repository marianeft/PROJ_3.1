export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50" style={{ background: 'var(--ad-950)' }}>
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--bs-600), var(--ad-600))', boxShadow: '0 8px 32px rgba(127,119,221,0.35)' }}
        >
          <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
            <rect x="4" y="8" width="32" height="26" rx="4" stroke="white" strokeWidth="2.5" fill="none" />
            <path d="M4 15h32" stroke="white" strokeWidth="2.5" />
            <rect x="12" y="3" width="4" height="9" rx="2" fill="white" />
            <rect x="24" y="3" width="4" height="9" rx="2" fill="white" />
            <rect x="10" y="21" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.7" />
            <rect x="24" y="21" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.7" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-white text-xl tracking-wide" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>EventsManager</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sidebar-text)', opacity: 0.6 }}>Loading your data from Supabase...</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: 'var(--bs-600)', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
