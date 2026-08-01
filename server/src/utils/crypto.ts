import crypto from 'crypto';

/**
 * Utility functions for cryptographic hashing.
 * 
 * Specifically used for hashing tokens (refresh tokens, password reset, email verify)
 * before storing them in the database to prevent database leakage attacks.
 */

/**
 * Hash a plain text string using SHA-256 algorithm.
 * Returns a hex-encoded string.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random cryptographically secure token.
 * Returns a hex-encoded string.
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
