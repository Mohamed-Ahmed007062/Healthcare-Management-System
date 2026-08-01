import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError';

/**
 * General application-wide rate limiter.
 * Limits standard traffic to 200 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many requests from this IP, please try again later.', { code: 'TOO_MANY_REQUESTS' }));
  },
});

/**
 * Strict rate limiter for sensitive authentication routes (e.g., login, register).
 * Limits to 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new ApiError(429, 'Too many login or registration attempts. Please try again after 15 minutes.', {
        code: 'TOO_MANY_AUTH_ATTEMPTS',
      }),
    );
  },
});

/**
 * Extra strict rate limiter for password reset requests to prevent spam.
 * Limits to 3 requests per 15 minutes per IP.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new ApiError(429, 'Too many password reset requests. Please try again after 15 minutes.', {
        code: 'TOO_MANY_PASSWORD_RESET_ATTEMPTS',
      }),
    );
  },
});
