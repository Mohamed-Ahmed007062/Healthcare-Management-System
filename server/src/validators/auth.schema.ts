import { z } from 'zod';
import { GENDERS, BLOOD_GROUPS } from '../models/constants';

/**
 * Zod validation schemas for all authentication requests.
 * Structure matches the `validate` middleware (body, query, params objects).
 */

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerPatientSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').trim().max(50),
    lastName: z.string().min(1, 'Last name is required').trim().max(50),
    phone: z.string().optional(),
    dateOfBirth: z.string().datetime({ message: 'Invalid Date of Birth format (ISO string required)' }).or(z.coerce.date()).optional(),
    gender: z.enum(GENDERS).optional(),
    bloodGroup: z.enum(BLOOD_GROUPS).optional(),
    address: z
      .object({
        line1: z.string().trim().optional(),
        line2: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        postalCode: z.string().trim().optional(),
        country: z.string().trim().optional(),
      })
      .optional(),
    emergencyContact: z
      .object({
        name: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        relationship: z.string().trim().optional(),
      })
      .optional(),
    allergies: z.array(z.string()).optional(),
    chronicConditions: z.array(z.string()).optional(),
  }),
});

export const registerDoctorSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').trim().max(50),
    lastName: z.string().min(1, 'Last name is required').trim().max(50),
    phone: z.string().optional(),
    specialization: z.string().min(1, 'Specialization is required').trim(),
    qualifications: z.array(z.string()).optional(),
    experienceYears: z.coerce.number().min(0).default(0),
    consultationFee: z.coerce.number().min(0).default(0),
    departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID format').optional(),
    bio: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: passwordSchema,
  }),
  query: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});
