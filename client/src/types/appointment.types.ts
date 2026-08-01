import type { User } from './auth.types';

export interface Slot {
  start: string;
  end: string;
}

export interface VideoRoom {
  roomId?: string;
  status?: 'idle' | 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
}

export interface Appointment {
  _id: string;
  patientId: string | User;
  doctorId: string | User;
  slot: Slot;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  symptoms?: string[];
  meetingType: 'in_person' | 'video';
  videoRoom?: VideoRoom;
  cancelledById?: string;
  prescriptionId?: string | Prescription;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  instructions?: string;
}

export interface PrescriptionPdf {
  fileName?: string;
  storagePath?: string;
  generatedAt?: string;
  sizeBytes?: number;
}

export interface Prescription {
  _id: string;
  appointmentId: string | Appointment;
  patientId: string | User;
  doctorId: string | User;
  medications: Medication[];
  notes?: string;
  pdf?: PrescriptionPdf;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSession {
  roomId: string | null;
  canJoin: boolean;
  videoRoom: VideoRoom | null;
  slot: Slot;
  meetingType: 'in_person' | 'video';
  status: string;
  appointmentId: string;
}

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: string | User;
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled' | 'new_record' | 'reminder' | 'system';
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
