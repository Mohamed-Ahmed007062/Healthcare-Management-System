import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

/**
 * Custom Double-Submit Cookie CSRF protection middleware.
 * 
 * Verifies that the client sends the CSRF token both in a cookie (XSRF-TOKEN)
 * and in a request header (X-XSRF-TOKEN). If they do not match, the request
 * is rejected with 403 Forbidden.
 * 
 * Read-only methods (GET, HEAD, OPTIONS) bypass this check.
 * Public authentication endpoints also bypass this check because no session
 * exists to be hijacked yet.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF for all public auth routes — match against multiple path
  // formats to handle differences between local dev and Vercel serverless
  // (originalUrl, path, trailing slashes, etc.)
  const bypassedSegments = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/refresh',
    '/auth/profile',
  ];

  const requestPath = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, ''); // strip query params & trailing slashes
  const isAuthRoute = bypassedSegments.some((seg) => requestPath.endsWith(seg));

  if (isAuthRoute) {
    return next();
  }

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
