import { createBrowserRouter, Outlet } from 'react-router';
import { AppProvider } from './store/AppContext';
import { AuthProvider } from './store/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CalendarPage } from './pages/CalendarPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventFormPage } from './pages/EventFormPage';
import { AttendeesPage } from './pages/AttendeesPage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PublicEventsPage } from './pages/PublicEventsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <p className="text-6xl font-bold mb-4" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>404</p>
      <p className="text-lg mb-6" style={{ color: 'var(--text-sec)' }}>Page not found</p>
      <a href="/" className="px-4 py-2 text-white rounded-[var(--radius-md)] text-sm font-semibold transition-all hover:-translate-y-px" style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}>
        Go to Dashboard
      </a>
    </div>
  );
}

// Root wraps the entire app with context providers so they're
// available to all route components inside the Data Mode router.
function Root() {
  return (
    <AuthProvider>
      <AppProvider>
        <Outlet />
      </AppProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      // Public routes
      { path: '/login', Component: LoginPage },
      { path: '/events/:id/register', Component: RegisterPage },
      { path: '/events-public', Component: PublicEventsPage },
      {
        // Admin routes — protected by auth
        path: '/',
        Component: ProtectedRoute,
        children: [
          {
            Component: Layout,
            children: [
              { index: true, Component: Dashboard },
              { path: 'calendar', Component: CalendarPage },
              { path: 'events', Component: EventsPage },
              { path: 'events/new', Component: EventFormPage },
              { path: 'events/:id', Component: EventDetailPage },
              { path: 'events/:id/edit', Component: EventFormPage },
              { path: 'events/:id/attendees', Component: AttendeesPage },
              { path: 'events/:id/analytics', Component: AnalyticsPage },
              { path: 'scanner', Component: QRScannerPage },
              { path: 'certificates', Component: CertificatesPage },
              { path: 'settings', Component: SettingsPage },
              { path: '*', Component: NotFound },
            ],
          },
        ],
      },
    ],
  },
]);