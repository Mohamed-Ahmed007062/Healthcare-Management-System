/**
 * Custom API Error class representing HTTP errors.
 * Used to throw structured errors that are caught by the global error handler middleware.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
