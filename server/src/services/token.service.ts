import crypto from 'crypto';
import { userRepo } from '../repositories/user.repo';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { hashToken } from '../utils/crypto';
import ApiError from '../utils/ApiError';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  /**
   * Issue a new pair of Access and Refresh tokens for a user.
   * This is called on fresh login. It starts a new refresh token family.
   */
  async issueAuthTokens(userId: string, role: 'admin' | 'doctor' | 'patient'): Promise<Tokens> {
    const accessToken = signAccessToken({ id: userId, role });
    const refreshToken = signRefreshToken({ id: userId, role });

    const hashedRefreshToken = hashToken(refreshToken);
    const refreshFamilyId = crypto.randomUUID();

    // Store hashed token and family ID
    await userRepo.update(userId, {
      refreshTokenHash: hashedRefreshToken,
      refreshFamilyId,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Perform Refresh Token Rotation.
   * Verifies the provided refresh token.
   * Detects token reuse (stolen token scenario) and revokes the session family if detected.
   */
  async rotateTokens(token: string): Promise<Tokens> {
    // 1. Verify token signature and expiration
    const decoded = verifyRefreshToken(token);

    // 2. Fetch user with token secrets
    const user = await userRepo.findById(decoded.id, false);
    if (!user) {
      throw new ApiError(401, 'User associated with token no longer exists', { code: 'USER_NOT_FOUND' });
    }

    // Retrieve selected secrets
    const dbUser = await userRepo.findById(decoded.id, true);
    const storedHash = dbUser.refreshTokenHash;
    const currentFamilyId = dbUser.refreshFamilyId;

    const incomingHash = hashToken(token);

    // 3. Reuse Detection
    if (!storedHash || storedHash !== incomingHash) {
      if (currentFamilyId) {
        // Stolen token detected! Invalidate the entire family
        await userRepo.revokeRefreshFamily(currentFamilyId);
      }
      throw new ApiError(401, 'Session expired or reuse detected. Please log in again.', {
        code: 'TOKEN_REUSE_DETECTED',
      });
    }

    // 4. Rotate: Sign new tokens
    const newAccessToken = signAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role });
    const newHashedRefreshToken = hashToken(newRefreshToken);

    // 5. Update database with new token hash, keeping the family ID intact
    await userRepo.update(user.id, {
      refreshTokenHash: newHashedRefreshToken,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Invalidate user's refresh token (logout).
   */
  async revokeUserTokens(userId: string): Promise<void> {
    await userRepo.update(userId, {
      refreshTokenHash: null,
      refreshFamilyId: null,
    });
  }
}

export const tokenService = new TokenService();
export default tokenService;
