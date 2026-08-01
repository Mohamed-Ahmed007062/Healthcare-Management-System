import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { isProd } from '../config/env';
import { logger } from '../config/logger';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';

/**
 * Global centralized error-handling middleware.
 * Formats validation, database, auth, and unexpected errors consistently.
 * Hides stack traces in production environment to prevent sensitive info leakage.
 */
export function errorHandler(
  err: Error | ApiError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown = null;

  // Log error
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
    },
    'An error occurred during request processing',
  );

  // 1. ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }
  // 2. Zod validation error
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.flatten().fieldErrors;
  }
  // 3. Prisma unique constraint violation (P2002)
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      message = `Duplicate entry for ${target}. Please use another value.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested database record not found.';
    } else {
      statusCode = 400;
      message = `Database Error: ${err.message}`;
    }
  }

  // Build the response payload
  const responsePayload = new ApiResponse(
    statusCode,
    null,
    message,
    details ? { details } : null,
  );

  // If in development, add the stack trace to metadata
  if (!isProd && err.stack) {
    Object.assign(responsePayload, {
      meta: {
        ...responsePayload.meta,
        stack: err.stack,
      },
    });
  }

  res.status(statusCode).json(responsePayload);
}

export default errorHandler;
