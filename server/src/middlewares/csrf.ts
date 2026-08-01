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

  // Bypass CSRF for public authentication routes (session establishment / recovery)
  const bypassedPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/refresh'
  ];

  const requestPath = req.originalUrl.split('?')[0]; // Strip query parameters
  if (bypassedPaths.some((path) => requestPath.endsWith(path))) {
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
