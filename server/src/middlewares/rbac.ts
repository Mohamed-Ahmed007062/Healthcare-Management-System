import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import type { Role } from '../models/constants';

/**
 * Role-Based Access Control (RBAC) authorization middleware.
 * Restricts access to routes based on the user's role.
 * Assumes the `authenticate` middleware has already run and populated `req.user`.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', { code: 'UNAUTHENTICATED' }));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Role '${req.user.role}' is not authorized.`, {
          code: 'FORBIDDEN',
        }),
      );
    }

    next();
  };
}

export default authorize;
