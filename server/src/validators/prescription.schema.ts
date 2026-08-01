import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(1, 'Appointment ID is required'),
    patientId: z.string().min(1, 'Patient ID is required'),
    medications: z.array(z.object({
      name: z.string().min(1, 'Medicine name is required'),
      dosage: z.string().min(1, 'Dosage is required'),
      frequency: z.string().min(1, 'Frequency is required'),
      durationDays: z.number().optional(),
      instructions: z.string().optional(),
    })).min(1, 'At least one medication is required'),
    notes: z.string().optional(),
  }),
});
