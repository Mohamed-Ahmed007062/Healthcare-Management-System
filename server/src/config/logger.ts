/**
 * Pino logger.
 *
 * - dev/test: pretty-printed to stdout (`pino-pretty`) for readability.
 * - production: raw JSON to stdout, ready to be scraped by Loki/CloudWatch.
 *
 * Use `child()` for request-scoped context (`logger.child({ reqId })`).
 * `pino-http` (registered in app.ts) auto-attaches a per-request logger on
 * `req.log`.
 */
import pino from 'pino';
import { env, isProd, isDev } from './env';

const baseLogger = pino({
  level: isProd ? 'info' : 'debug',
  base: { service: 'healthcare-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.refreshTokenHash',
      '*.emailVerifyToken',
      '*.resetPasswordToken',
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service',
        },
      }
    : undefined,
});

export const logger = baseLogger;
export type Logger = typeof baseLogger;

/** Convenience for boot/shutdown lifecycle logs. */
export const logBoot = (msg: string, extra?: Record<string, unknown>) =>
  baseLogger.info(extra, `🚀 ${msg}`);

export const logShutdown = (msg: string, extra?: Record<string, unknown>) =>
  baseLogger.warn(extra, `🛑 ${msg}`);

void env; // env imported for side-effects & to surface in the bundle
