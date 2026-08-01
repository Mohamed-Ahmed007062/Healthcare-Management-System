import { z } from 'zod';

export const timelineQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
  params: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
  }),
});

export const prescriptionIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Prescription ID is required'),
  }),
});
