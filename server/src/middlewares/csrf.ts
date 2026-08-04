import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import { isProd } from '../config/env';

/**
 * Custom Double-Submit Cookie CSRF protection middleware.
 *
 * ## Cross-Origin (Production on Vercel)
 * When the frontend and backend live on different origins (e.g. two Vercel
 * *.vercel.app subdomains) the browser cannot share cookies between them,
 * making the double-submit cookie pattern unusable. However, our API uses
 * JWT Bearer tokens sent via the `Authorization` header — which the browser
 * never auto-attaches — so every mutating request already requires an
 * explicit, non-cookie credential. This makes the API inherently CSRF-safe
 * in cross-origin mode, so we skip the check in production.
 *
 * ## Same-Origin (Local Development)
 * In local dev the frontend proxy makes everything same-origin, so the
 * double-submit cookie pattern works and adds an extra safety layer.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // 1. Safe (read-only) HTTP methods never need CSRF protection
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 2. In production (cross-origin), JWT Bearer auth already prevents CSRF.
  //    Skip the cookie-based check entirely.
  if (isProd) {
    return next();
  }

  // 3. Bypass CSRF for public auth routes that have no session to hijack
  const bypassedSegments = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/refresh',
  ];

  const requestPath = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
  if (bypassedSegments.some((seg) => requestPath.endsWith(seg))) {
    return next();
  }

  // 4. Requests carrying a Bearer token are inherently CSRF-safe
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // 5. Double-submit cookie check (local dev, cookie-only auth)
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(
      new ApiError(403, 'CSRF verification failed. Request untrusted.', {
        code: 'CSRF_VERIFICATION_FAILED',
      }),
    );
  }

  next();
}

export default csrfProtection;
