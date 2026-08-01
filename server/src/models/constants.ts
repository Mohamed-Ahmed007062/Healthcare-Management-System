/**
 * Shared domain enums & constants.
 *
 * Kept in one place so controllers, validators, zod schemas, and the frontend
 * contract never drift apart. Frontend has its own copy that must mirror these.
 */
export const ROLES = ['admin', 'doctor', 'patient'] as const;
export type Role = (typeof ROLES)[number];

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const MEETING_TYPES = ['in_person', 'video'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

/**
 * Shape of a single weekly-schedule slot for a doctor.
 * Mutable sub-doc (embed-only, never standalone) — keep it small.
 */
export interface Slot {
  dayOfWeek: number; // 0 (Sun) .. 6 (Sat)
  startTime: string; // "HH:mm" 24h, local to clinic tz
  endTime: string; // "HH:mm" 24h
  isAvailable: boolean;
}

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'appointment_request', 'appointment_confirmed', 'appointment_cancelled',
  'new_record', 'reminder', 'system'
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MEDICAL_RECORD_TYPES = ['lab_report', 'scan', 'prescription', 'discharge_summary', 'other'] as const;
export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

export const VIDEO_ROOM_STATUSES = ['idle', 'active', 'ended'] as const;
export type VideoRoomStatus = (typeof VIDEO_ROOM_STATUSES)[number];
