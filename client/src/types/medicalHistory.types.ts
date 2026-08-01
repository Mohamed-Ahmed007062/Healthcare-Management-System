export type TimelineEventType = 'profile' | 'appointment' | 'prescription' | 'medical_record';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string;
  metadata?: Record<string, unknown>;
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
