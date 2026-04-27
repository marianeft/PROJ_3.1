import {
  createContext, useContext, useReducer, useEffect, useRef,
  useState, useCallback, ReactNode,
} from 'react';
import { AppEvent, Attendee, AppNotification, AttendeeStatus, SECTORS } from '../types';
import { addMinutes, parseISO, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import * as api from '../lib/api';

// ─── State & Actions ──────────────────────────────────────────────────────────
interface AppState {
  events: AppEvent[];
  attendees: Attendee[];
  notifications: AppNotification[];
  initialized: boolean;
}

type Action =
  | { type: 'INIT'; state: Omit<AppState, 'initialized'> }
  | { type: 'ADD_EVENT'; event: AppEvent }
  | { type: 'UPDATE_EVENT'; event: AppEvent }
  | { type: 'DELETE_EVENT'; id: string }
  | { type: 'ADD_ATTENDEE'; attendee: Attendee }
  | { type: 'UPDATE_ATTENDEE'; attendee: Attendee }
  | { type: 'DELETE_ATTENDEE'; id: string }
  | { type: 'BULK_ADD_ATTENDEES'; attendees: Attendee[] }
  | { type: 'DELETE_EVENT_ATTENDEES'; eventId: string }
  | { type: 'REFRESH_EVENT_ATTENDEES'; eventId: string; attendees: Attendee[] }
  | { type: 'CHECKIN_ATTENDEE'; id: string; checkedIn: boolean }
  | { type: 'ADD_NOTIFICATION'; notification: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.state, initialized: true };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(e => e.id === action.event.id ? action.event : e) };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(e => e.id !== action.id),
        attendees: state.attendees.filter(a => a.eventId !== action.id),
      };
    case 'ADD_ATTENDEE':
      return { ...state, attendees: [...state.attendees, action.attendee] };
    case 'UPDATE_ATTENDEE':
      return { ...state, attendees: state.attendees.map(a => a.id === action.attendee.id ? action.attendee : a) };
    case 'DELETE_ATTENDEE':
      return { ...state, attendees: state.attendees.filter(a => a.id !== action.id) };
    case 'BULK_ADD_ATTENDEES':
      return { ...state, attendees: [...state.attendees, ...action.attendees] };
    case 'DELETE_EVENT_ATTENDEES':
      return { ...state, attendees: state.attendees.filter(a => a.eventId !== action.eventId) };
    case 'REFRESH_EVENT_ATTENDEES':
      // Replace all attendees for this event with fresh data from server
      return {
        ...state,
        attendees: [
          ...state.attendees.filter(a => a.eventId !== action.eventId),
          ...action.attendees,
        ],
      };
    case 'CHECKIN_ATTENDEE':
      return {
        ...state,
        attendees: state.attendees.map(a =>
          a.id === action.id
            ? { ...a, checkedIn: action.checkedIn, checkedInAt: action.checkedIn ? new Date().toISOString() : undefined }
            : a
        ),
      };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.notification, ...state.notifications].slice(0, 50) };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    default:
      return state;
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const FIRST_NAMES = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Barbara','David','Elizabeth','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Dorothy','Paul','Kimberly','Andrew','Emily','Kenneth','Donna'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores'];
const COMPANIES = ['Tech Corp','Innovation Labs','Digital Solutions','Cloud Systems','Data Analytics Co','Future Ventures','Smart Technologies','Global Innovations','NextGen Solutions','Alpha Systems','Beta Technologies','Quantum Inc','Apex Digital','Nexus Technologies','Pinnacle Systems'];
const ROLES = ['Software Engineer','Product Designer','Engineering Manager','CEO','CTO','Marketing Manager','Product Manager','Data Scientist','DevOps Engineer','QA Engineer','Frontend Developer','Backend Developer','Full-Stack Developer','UX Designer','Business Analyst'];
const STATUSES: AttendeeStatus[] = ['confirmed','confirmed','confirmed','confirmed','pending','pending','cancelled','waitlisted'];

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateAttendees(eventId: string, count: number, baseSeed: number): Attendee[] {
  const rand = seededRand(baseSeed);
  const today = new Date('2026-03-12');
  return Array.from({ length: count }, (_, i) => {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const daysAgo = Math.floor(rand() * 45) + 1;
    const reg = new Date(today);
    reg.setDate(reg.getDate() - daysAgo);
    const isConfirmed = status === 'confirmed';
    const sector = SECTORS[Math.floor(rand() * SECTORS.length)];
    return {
      id: `${eventId}-att-${i}`,
      eventId,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@example.com`,
      phone: `+1${String(Math.floor(rand() * 9000000000) + 1000000000)}`,
      company: COMPANIES[Math.floor(rand() * COMPANIES.length)],
      role: ROLES[Math.floor(rand() * ROLES.length)],
      sector,
      status,
      checkedIn: isConfirmed && rand() > 0.55,
      registeredAt: reg.toISOString(),
      notes: rand() > 0.85 ? 'VIP guest – special seating required' : undefined,
    };
  });
}

const SEED_EVENTS: AppEvent[] = [
  { id: 'evt-1', title: 'Tech Innovation Summit 2026', description: 'A full-day conference exploring the latest in AI, blockchain, cloud computing, and emerging tech trends. Featuring keynotes from industry leaders, hands-on workshops, and networking sessions.', date: '2026-03-15', startTime: '09:00', endTime: '18:00', location: 'San Francisco Convention Center, CA', virtualLink: 'https://meet.example.com/tech-summit', category: 'conference', color: 'blue', status: 'published', maxAttendees: 500, reminderMinutes: [60, 1440], tags: ['AI', 'blockchain', 'cloud', 'networking'], createdAt: '2026-01-10T09:00:00Z', updatedAt: '2026-02-01T09:00:00Z' },
  { id: 'evt-2', title: 'Product Design Workshop', description: 'An intensive hands-on workshop covering design thinking methodologies, user research techniques, and prototyping best practices. Limited seats for an intimate learning experience.', date: '2026-03-20', startTime: '10:00', endTime: '16:00', location: 'Design Studio, 200 Market St, New York, NY', category: 'workshop', color: 'green', status: 'published', maxAttendees: 50, reminderMinutes: [30, 1440], tags: ['design', 'UX', 'prototyping', 'workshop'], createdAt: '2026-01-15T09:00:00Z', updatedAt: '2026-02-05T09:00:00Z' },
  { id: 'evt-3', title: 'Developer Meetup Q1 2026', description: 'Monthly developer gathering featuring lightning talks, live coding demos, and open-source project showcases. Great opportunity to connect with the local tech community.', date: '2026-03-12', startTime: '18:30', endTime: '21:00', location: 'WeWork, 500 Tech Ave, Austin, TX', category: 'meetup', color: 'purple', status: 'published', maxAttendees: 200, reminderMinutes: [15, 60], tags: ['developers', 'open-source', 'networking', 'coding'], createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-02-20T09:00:00Z' },
  { id: 'evt-4', title: 'Cloud Computing Webinar Series', description: 'A virtual deep-dive into cloud architecture patterns, cost optimization strategies, and multi-cloud deployment best practices. Suitable for DevOps engineers and cloud architects.', date: '2026-03-25', startTime: '14:00', endTime: '16:30', location: 'Online – Zoom', virtualLink: 'https://zoom.us/j/cloud-webinar-2026', category: 'webinar', color: 'orange', status: 'published', reminderMinutes: [30, 60, 1440], tags: ['cloud', 'AWS', 'Azure', 'DevOps'], createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-25T09:00:00Z' },
  { id: 'evt-5', title: 'Annual Company Gala 2026', description: 'Celebrate another year of achievements with colleagues, partners, and stakeholders. An elegant evening featuring dinner, awards ceremony, and live entertainment.', date: '2026-04-05', startTime: '19:00', endTime: '23:59', location: 'Grand Ballroom, The Ritz Carlton, Chicago, IL', category: 'social', color: 'pink', status: 'published', maxAttendees: 300, reminderMinutes: [1440, 4320], tags: ['gala', 'networking', 'awards', 'celebration'], createdAt: '2026-01-20T09:00:00Z', updatedAt: '2026-02-15T09:00:00Z' },
  { id: 'evt-6', title: 'Data Science Conference 2026', description: 'Two-day conference covering machine learning advances, data engineering pipelines, MLOps practices, and real-world AI applications across industries.', date: '2026-02-28', startTime: '09:00', endTime: '17:00', location: 'Boston Convention Center, MA', category: 'conference', color: 'cyan', status: 'completed', maxAttendees: 400, reminderMinutes: [60, 1440], tags: ['ML', 'data science', 'AI', 'analytics'], createdAt: '2025-12-01T09:00:00Z', updatedAt: '2026-03-01T09:00:00Z' },
  { id: 'evt-7', title: 'Startup Pitch Night', description: 'Watch 10 early-stage startups pitch to a panel of seasoned investors and receive live feedback. Open to entrepreneurs, investors, and startup enthusiasts.', date: '2026-04-18', startTime: '17:00', endTime: '20:00', location: '1 Innovation Drive, Seattle, WA', category: 'meetup', color: 'yellow', status: 'draft', maxAttendees: 150, reminderMinutes: [60, 1440], tags: ['startup', 'pitch', 'investors', 'entrepreneurship'], createdAt: '2026-02-28T09:00:00Z', updatedAt: '2026-03-05T09:00:00Z' },
];

function buildSeedData() {
  const attendees: Attendee[] = [
    ...generateAttendees('evt-1', 423, 1001),
    ...generateAttendees('evt-2', 48, 2002),
    ...generateAttendees('evt-3', 156, 3003),
    ...generateAttendees('evt-4', 287, 4004),
    ...generateAttendees('evt-5', 243, 5005),
    ...generateAttendees('evt-6', 312, 6006),
    ...generateAttendees('evt-7', 67, 7007),
  ];
  return { events: SEED_EVENTS, attendees, notifications: [] as AppNotification[] };
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  getEventAttendees: (eventId: string) => Attendee[];
  getAttendeeStats: (eventId: string) => { total: number; confirmed: number; pending: number; cancelled: number; waitlisted: number; checkedIn: number };
  refreshEventAttendees: (eventId: string) => Promise<void>;
  isOnline: boolean;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = 'events_manager_v1';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    events: [], attendees: [], notifications: [], initialized: false,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const stateRef = useRef(state);
  const shownReminders = useRef<Set<string>>(new Set());

  // Keep stateRef in sync for use inside async callbacks
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Initial load: server first, localStorage fallback ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsSyncing(true);
      try {
        const data = await api.loadAllData();

        if (cancelled) return;

        if (!data.seeded) {
          // Server DB is empty — seed it with default data
          const seedPayload = buildSeedData();
          try {
            await api.seedData(seedPayload);
          } catch (seedErr) {
            console.warn('Seed to server failed (will use local):', seedErr);
          }
          dispatch({ type: 'INIT', state: seedPayload });
          saveToLocalStorage(seedPayload);
        } else {
          // Use server data
          const normalized = {
            events: data.events ?? [],
            attendees: data.attendees ?? [],
            notifications: data.notifications ?? [],
          };
          dispatch({ type: 'INIT', state: normalized });
          saveToLocalStorage(normalized);
        }

        setIsOnline(true);
      } catch (err) {
        if (cancelled) return;
        console.warn('Server unavailable, falling back to localStorage:', err);
        setIsOnline(false);

        // Fallback to localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            dispatch({ type: 'INIT', state: JSON.parse(saved) });
          } else {
            const seed = buildSeedData();
            dispatch({ type: 'INIT', state: seed });
            saveToLocalStorage(seed);
          }
        } catch {
          const seed = buildSeedData();
          dispatch({ type: 'INIT', state: seed });
        }

        toast.warning('Running offline — changes saved locally until reconnected', { duration: 5000 });
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Persist to localStorage as cache whenever state changes ───────────────
  useEffect(() => {
    if (!state.initialized) return;
    const { initialized: _, ...toSave } = state;
    saveToLocalStorage(toSave);
  }, [state]);

  // ── Reminder notifications ─────────────────────────────────────────────────
  useEffect(() => {
    if (!state.initialized) return;
    const check = () => {
      const now = new Date();
      state.events.forEach(event => {
        if (event.status !== 'published') return;
        try {
          const eventStart = parseISO(`${event.date}T${event.startTime}`);
          event.reminderMinutes.forEach(minutes => {
            const key = `${event.id}-${minutes}`;
            if (shownReminders.current.has(key)) return;
            const reminderTime = addMinutes(eventStart, -minutes);
            const diff = differenceInMinutes(now, reminderTime);
            if (diff >= 0 && diff < 2) {
              shownReminders.current.add(key);
              const label = minutes >= 1440 ? `${minutes / 1440} day(s)` : minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} min`;
              const msg = `"${event.title}" starts in ${label}`;
              toast.info(msg, { duration: 6000 });
              const notification: AppNotification = {
                id: `notif-${Date.now()}`,
                eventId: event.id,
                eventTitle: event.title,
                message: msg,
                type: 'reminder',
                createdAt: new Date().toISOString(),
                read: false,
              };
              dispatch({ type: 'ADD_NOTIFICATION', notification });
              // Sync notification to server silently
              api.createNotification(notification).catch(() => {});
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Event Reminder', { body: msg });
              }
            }
          });
        } catch { /* ignore parse errors */ }
      });
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [state.initialized, state.events]);

  // ── Sync dispatch: update local + call server API ─────────────────────────
  const syncDispatch = useCallback(async (action: Action) => {
    // 1. Update local state immediately (optimistic)
    dispatch(action);

    // 2. Sync to server in background (skip INIT and notification actions)
    if (!isOnline) return; // offline — will re-sync on reconnect via localStorage

    try {
      const currentState = stateRef.current;

      switch (action.type) {
        case 'ADD_EVENT':
          await api.createEvent(action.event);
          break;

        case 'UPDATE_EVENT':
          await api.updateEvent(action.event);
          break;

        case 'DELETE_EVENT':
          await api.deleteEvent(action.id);
          break;

        case 'ADD_ATTENDEE':
          await api.createAttendee(action.attendee);
          break;

        case 'UPDATE_ATTENDEE':
          await api.updateAttendee(action.attendee);
          break;

        case 'DELETE_ATTENDEE': {
          const attendee = currentState.attendees.find(a => a.id === action.id);
          if (attendee) await api.deleteAttendee(attendee.eventId, attendee.id);
          break;
        }

        case 'BULK_ADD_ATTENDEES':
          await api.bulkCreateAttendees(action.attendees);
          break;

        case 'DELETE_EVENT_ATTENDEES':
          await api.deleteEventAttendees(action.eventId);
          break;

        case 'REFRESH_EVENT_ATTENDEES':
          // No server sync needed — data already came from server
          break;

        case 'CHECKIN_ATTENDEE': {
          const attendee = currentState.attendees.find(a => a.id === action.id);
          if (attendee) {
            const updated: Attendee = {
              ...attendee,
              checkedIn: action.checkedIn,
              checkedInAt: action.checkedIn ? new Date().toISOString() : undefined,
            };
            await api.updateAttendee(updated);
          }
          break;
        }

        case 'ADD_NOTIFICATION':
          await api.createNotification(action.notification);
          break;

        case 'MARK_NOTIFICATION_READ':
          await api.markNotificationRead(action.id);
          break;

        case 'CLEAR_NOTIFICATIONS':
          await api.markAllNotificationsRead();
          break;

        default:
          break;
      }
    } catch (err) {
      console.error(`Server sync failed for action ${action.type}:`, err);
      // Show a subtle warning — local state is already updated so data isn't lost
      toast.warning('Change saved locally — cloud sync failed', {
        id: 'sync-fail',
        duration: 3000,
      });
    }
  }, [isOnline]);

  const getEventAttendees = (eventId: string) =>
    state.attendees.filter(a => a.eventId === eventId);

  const getAttendeeStats = (eventId: string) => {
    const list = getEventAttendees(eventId);
    return {
      total: list.length,
      confirmed: list.filter(a => a.status === 'confirmed').length,
      pending: list.filter(a => a.status === 'pending').length,
      cancelled: list.filter(a => a.status === 'cancelled').length,
      waitlisted: list.filter(a => a.status === 'waitlisted').length,
      checkedIn: list.filter(a => a.checkedIn).length,
    };
  };

  // ── Refresh attendees for a specific event from server ────────────────────
  const refreshEventAttendees = useCallback(async (eventId: string) => {
    if (!isOnline) return;
    try {
      const { attendees: fresh } = await api.fetchEventAttendees(eventId);
      // Use raw dispatch so we don't trigger a server re-write
      dispatch({ type: 'REFRESH_EVENT_ATTENDEES', eventId, attendees: fresh });
    } catch (err) {
      console.warn(`Failed to refresh attendees for event ${eventId}:`, err);
    }
  }, [isOnline]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch: syncDispatch as React.Dispatch<Action>,
      getEventAttendees,
      getAttendeeStats,
      refreshEventAttendees,
      isOnline,
      isSyncing,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function saveToLocalStorage(data: Omit<AppState, 'initialized'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}