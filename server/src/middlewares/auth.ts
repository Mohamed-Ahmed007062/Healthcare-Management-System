import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import ApiError from '../utils/ApiError';

/**
 * Authentication middleware.
 * Verifies the JWT Access Token provided in cookies or in the Authorization Bearer header.
 * Attaches the authenticated user payload (id, role) to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check cookies
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please log in.', { code: 'UNAUTHENTICATED' }));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export default authenticate;
