import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import ApiError from './ApiError';

export interface TokenPayload {
  id: string;
  role: 'admin' | 'doctor' | 'patient';
}

/**
 * Generate an Access Token.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as any,
  });
}

/**
 * Generate an Refresh Token.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as any,
  });
}

/**
 * Verify Access Token.
 * Throws ApiError on failure.
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Access token has expired', { code: 'ACCESS_TOKEN_EXPIRED' });
    }
    throw new ApiError(401, 'Invalid access token', { code: 'INVALID_ACCESS_TOKEN' });
  }
}

/**
 * Verify Refresh Token.
 * Throws ApiError on failure.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token has expired', { code: 'REFRESH_TOKEN_EXPIRED' });
    }
    throw new ApiError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' });
  }
}
