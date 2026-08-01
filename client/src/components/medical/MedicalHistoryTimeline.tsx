import React, { useEffect, useState } from 'react';
import { Calendar, FileText, Pill, UserCircle } from 'lucide-react';
import medicalHistoryApi from '../../api/medicalHistory.api';
import type { TimelineEvent } from '../../types/medicalHistory.types';
import Card from '../ui/card';

interface MedicalHistoryTimelineProps {
  patientId: string;
  title?: string;
}

const eventIcon = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'profile':
      return UserCircle;
    case 'appointment':
      return Calendar;
    case 'prescription':
      return Pill;
    case 'medical_record':
      return FileText;
    default:
      return FileText;
  }
};

const eventColor = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'profile':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'appointment':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'prescription':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medical_record':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const MedicalHistoryTimeline: React.FC<MedicalHistoryTimelineProps> = ({
  patientId,
  title = 'Medical History Timeline',
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!patientId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await medicalHistoryApi.getTimeline(patientId, { limit: 20 });
        if (res.success) {
          setEvents(res.data.events ?? []);
        }
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(message || 'Failed to load medical history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [patientId]);

  return (
    <Card className="shadow-md">
      <div className="p-6 border-b border-slate-100 dark:border-slate-850">
        <h2 className="text-lg font-heading font-bold text-slate-850 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">Chronological view of clinical events</p>
      </div>

      <div className="p-6">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && events.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No medical history events yet.</p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="relative">
            <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
            <ul className="space-y-6">
              {events.map((event) => {
                const Icon = eventIcon(event.type);
                return (
                  <li key={event.id} className="relative pl-12">
                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center ${eventColor(event.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-850 p-4 bg-white dark:bg-slate-950/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{event.title}</h3>
                        <span className="text-xs text-slate-400">
                          {new Date(event.date).toLocaleString()}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{event.description}</p>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {event.type === 'profile' && Array.isArray(event.metadata.allergies) && (event.metadata.allergies as string[]).length > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300">
                              Allergies: {(event.metadata.allergies as string[]).join(', ')}
                            </span>
                          )}
                          {event.type === 'prescription' && !!event.metadata.pdfAvailable && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              PDF available
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MedicalHistoryTimeline;
