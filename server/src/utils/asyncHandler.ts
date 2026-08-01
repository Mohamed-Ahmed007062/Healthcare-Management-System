import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express request handler to automatically catch any thrown errors
 * and forward them to the global error handler via next().
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
