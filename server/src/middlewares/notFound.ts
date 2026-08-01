import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

/**
 * Middleware to catch all unmatched routes and throw a 404 ApiError.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export default notFound;
