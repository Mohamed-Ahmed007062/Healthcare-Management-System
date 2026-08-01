import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    slot: z.object({
      start: z.string().or(z.date()).transform(v => new Date(v)),
      end: z.string().or(z.date()).transform(v => new Date(v)),
    }),
    reason: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    meetingType: z.enum(['in_person', 'video']).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
  }),
});

export const getAppointmentsQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
    limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getAvailableSlotsSchema = z.object({
  query: z.object({
    date: z.string().min(1, 'Date is required'),
  }),
});
