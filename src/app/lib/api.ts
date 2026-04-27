import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { AppEvent, Attendee, AppNotification } from '../types';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3fb3cb7a`;

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `API ${method} ${path} failed with status ${res.status}`);
  }
  return data as T;
}

// ── Full data ─────────────────────────────────────────────────────────────────
export function loadAllData() {
  return request<{ events: AppEvent[]; attendees: Attendee[]; notifications: AppNotification[]; seeded: boolean }>(
    'GET', '/data'
  );
}

export function seedData(payload: { events: AppEvent[]; attendees: Attendee[]; notifications: AppNotification[] }) {
  return request<{ success?: boolean; alreadySeeded?: boolean; seeded?: { events: number; attendees: number } }>(
    'POST', '/data/seed', payload
  );
}

// ── Events ────────────────────────────────────────────────────────────────────
export function createEvent(event: AppEvent) {
  return request<{ event: AppEvent }>('POST', '/events', event);
}

export function updateEvent(event: AppEvent) {
  return request<{ event: AppEvent }>('PUT', `/events/${event.id}`, event);
}

export function deleteEvent(id: string) {
  return request<{ success: boolean; deletedAttendees: number }>('DELETE', `/events/${id}`);
}

// ── Attendees ─────────────────────────────────────────────────────────────────
export function createAttendee(attendee: Attendee) {
  return request<{ attendee: Attendee }>('POST', '/attendees', attendee);
}

export function bulkCreateAttendees(attendees: Attendee[]) {
  return request<{ success: boolean; count: number }>('POST', '/attendees/bulk', { attendees });
}

export function updateAttendee(attendee: Attendee) {
  return request<{ attendee: Attendee }>('PUT', `/attendees/${attendee.eventId}/${attendee.id}`, attendee);
}

export function deleteAttendee(eventId: string, id: string) {
  return request<{ success: boolean }>('DELETE', `/attendees/${eventId}/${id}`);
}

export function bulkDeleteAttendees(attendees: { id: string; eventId: string }[]) {
  return request<{ success: boolean; deleted: number }>('POST', '/attendees/bulk-delete', { attendees });
}

export function deleteEventAttendees(eventId: string) {
  return request<{ success: boolean; deleted: number }>('DELETE', `/events/${eventId}/attendees`);
}

// Fetch attendees for a specific event from server
export function fetchEventAttendees(eventId: string) {
  return request<{ attendees: Attendee[] }>('GET', `/events/${eventId}/attendees`);
}

// Alias for consistency with modal component
export function getEventAttendees(eventId: string) {
  return fetchEventAttendees(eventId).then(res => res.attendees);
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function createNotification(notification: AppNotification) {
  return request<{ notification: AppNotification }>('POST', '/notifications', notification);
}

export function markNotificationRead(id: string) {
  return request<{ notification: AppNotification }>('PATCH', `/notifications/${id}`);
}

export function markAllNotificationsRead() {
  return request<{ success: boolean; updated: number }>('POST', '/notifications/mark-all-read');
}

// ── Public Registration ───────────────────────────────────────────────────────
export function getPublishedEvents() {
  return request<{ events: AppEvent[] }>('GET', '/events/published');
}

export function getPublicEvent(eventId: string) {
  return request<{ event: AppEvent }>('GET', `/events/${eventId}/public`);
}

export function registerForEvent(eventId: string, data: { name: string; email: string; sector?: string; phone?: string; idPhoto?: string; idPhotoName?: string }) {
  return request<{ success: boolean; attendee: Attendee }>('POST', `/events/${eventId}/register`, data);
}

// ── Certificates ──────────────────────────────────────────────────────────────
export function sendCertificates(eventId: string, attendeeIds: string[]) {
  return request<{ success: boolean; sent: number; failed: number; updatedAttendees: Attendee[] }>(
    'POST', `/events/${eventId}/send-certificates`, { attendeeIds }
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export function purgeAllData() {
  return request<{ success: boolean }>('DELETE', '/admin/purge-all');
}

// ── Attendee ID Photo ─────────────────────────────────────────────────────────
export function getAttendeeIdPhotoUrl(eventId: string, attendeeId: string) {
  return request<{ url: string }>('GET', `/attendees/${eventId}/${attendeeId}/id-photo`);
}