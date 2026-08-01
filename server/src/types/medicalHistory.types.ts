export type TimelineEventType = 'profile' | 'appointment' | 'prescription' | 'medical_record';

export interface TimelineEventMetadata {
  [key: string]: unknown;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string;
  metadata?: TimelineEventMetadata;
  relatedEntityId?: string;
}

export interface TimelineResult {
  events: TimelineEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
