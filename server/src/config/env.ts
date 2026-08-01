/**
 * Centralized environment configuration.
 *
 * Every env var the app relies on is declared here, parsed & validated with a
 * Zod schema. The app refuses to boot on an invalid config (`process.exit(1)`)
 * — fail fast, never run with a misconfigured secret.
 *
 * NOTE: `dotenv` is loaded eagerly so non-`process.env` sources (e.g. Doppler
 * in prod) only need to set the same env keys.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // ---- Database ----
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // ---- Client (CORS allowlist) ----
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // ---- JWT ----
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // ---- Cookies ----
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === 'true'))
    .optional(),

  // ---- CSRF (double-submit) ----
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be >= 32 chars'),

  // ---- Token TTLs (hours) for email-verify / reset-password tokens ----
  EMAIL_VERIFY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  RESET_PASSWORD_TTL_HOURS: z.coerce.number().int().positive().default(1),

  // ---- Email (Mailtrap in dev; falls back to console transport) ----
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().default('no-reply@healthcare-app.local'),

  // ---- App URLs for email links ----
  APP_URL: z.string().url().default('http://localhost:5173'),

  // ---- Prescription PDF storage ----
  PRESCRIPTION_PDF_DIR: z.string().default('uploads/prescriptions'),

  // ---- Video session join window (minutes before/after slot) ----
  VIDEO_JOIN_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

/**
 * Resolve the `secure` cookie flag. In prod we want `Secure`,
 * otherwise the dev server (HTTP on localhost) couldn't set them.
 * Explicit `COOKIE_SECURE` env var wins if provided.
 */
export const cookieSecure: boolean =
  env.COOKIE_SECURE != null ? env.COOKIE_SECURE : isProd;
