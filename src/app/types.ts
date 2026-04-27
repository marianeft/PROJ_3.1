export type EventCategory = 'conference' | 'workshop' | 'meetup' | 'webinar' | 'social' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendeeStatus = 'confirmed' | 'pending' | 'cancelled' | 'waitlisted';

export const SECTORS = [
  'Technology', 'Finance', 'Healthcare', 'Education',
  'Government', 'Marketing & Media', 'Engineering',
  'Hospitality & Events', 'Legal', 'Non-Profit & NGO',
  'Academic / Research', 'Other',
] as const;

export type Sector = typeof SECTORS[number];

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  virtualLink?: string;
  category: EventCategory;
  color: string;
  status: EventStatus;
  maxAttendees?: number;
  reminderMinutes: number[];
  tags: string[];
  googleFormUrl?: string;
  googleSheetId?: string;
  certificateTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;
export type Gender = typeof GENDERS[number];

export interface Attendee {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  sector?: string;
  gender?: string;
  certificateNumber?: string;
  status: AttendeeStatus;
  checkedIn: boolean;
  checkedInAt?: string;
  registeredAt: string;
  notes?: string;
  certificateSentAt?: string;
  idPhotoPath?: string;
  idPhotoUrl?: string;
}

export interface AppNotification {
  id: string;
  eventId: string;
  eventTitle: string;
  message: string;
  type: 'reminder' | 'info' | 'warning';
  createdAt: string;
  read: boolean;
}