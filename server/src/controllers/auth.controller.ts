import type { Request, Response, CookieOptions } from 'express';
import authService from '../services/auth.service';
import tokenService from '../services/token.service';
import ApiResponse from '../utils/ApiResponse';
import { generateRandomToken } from '../utils/crypto';
import { cookieSecure, env, isProd } from '../config/env';

// Cookie options — cross-origin deployments (different Vercel domains) require
// sameSite: 'none' + secure: true so browsers allow sending cookies.
const cookieDomain = env.COOKIE_DOMAIN || undefined;
const sameSitePolicy: 'lax' | 'none' = isProd ? 'none' : 'lax';

const accessCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd ? true : cookieSecure,
  sameSite: sameSitePolicy,
  maxAge: 15 * 60 * 1000, // 15 minutes
  domain: cookieDomain,
};

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd ? true : cookieSecure,
  sameSite: sameSitePolicy,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: cookieDomain,
};

// CSRF cookie is read by JavaScript to include in headers, so httpOnly: false
const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: isProd ? true : cookieSecure,
  sameSite: sameSitePolicy,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: cookieDomain,
};

export class AuthController {
  /**
   * Register a new Patient.
   */
  async registerPatient(req: Request, res: Response): Promise<void> {
    const patient = await authService.registerPatient(req.body);
    // Remove password hash from response
    patient.passwordHash = undefined;

    res.status(201).json(new ApiResponse(201, { user: patient }, 'Registration successful. Please check your email to verify your account.'));
  }

  /**
   * Register a new Doctor (Admin only).
   */
  async registerDoctor(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.id as string;
    const doctor = await authService.registerDoctor(req.body, adminId);
    doctor.passwordHash = undefined;

    res.status(201).json(new ApiResponse(201, { user: doctor }, 'Doctor registered successfully.'));
  }

  /**
   * Login user.
   * Sets secure, HTTP-only cookies for Access/Refresh tokens and sets CSRF double-submit cookie.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.login(req.body);
    const csrfToken = generateRandomToken();

    res.cookie('accessToken', tokens.accessToken, accessCookieOptions);
    res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
    res.cookie('XSRF-TOKEN', csrfToken, csrfCookieOptions);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user,
          accessToken: tokens.accessToken,
          csrfToken,
        },
        'Login successful.',
      ),
    );
  }

  /**
   * Logout user.
   * Clears cookies and revokes tokens.
   */
  async logout(req: Request, res: Response): Promise<void> {
    if (req.user) {
      await authService.logout(req.user.id as string);
    }

    res.clearCookie('accessToken', { ...accessCookieOptions, maxAge: 0 });
    res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: 0 });
    res.clearCookie('XSRF-TOKEN', { ...csrfCookieOptions, maxAge: 0 });

    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully.'));
  }

  /**
   * Refresh credentials.
   * Performs refresh token rotation and issue new CSRF token.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      res.status(401).json(new ApiResponse(401, null, 'Session expired. Refresh token missing.'));
      return;
    }

    const tokens = await tokenService.rotateTokens(incomingRefreshToken);
    const csrfToken = generateRandomToken();

    res.cookie('accessToken', tokens.accessToken, accessCookieOptions);
    res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
    res.cookie('XSRF-TOKEN', csrfToken, csrfCookieOptions);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken: tokens.accessToken,
          csrfToken,
        },
        'Token refreshed successfully.',
      ),
    );
  }

  /**
   * Verify email address.
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.query.token as string;
    await authService.verifyEmail(token);
    res.status(200).json(new ApiResponse(200, null, 'Email verified successfully. You can now log in.'));
  }

  /**
   * Forgot password.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.status(200).json(new ApiResponse(200, null, 'If the email matches an active account, a password reset link has been sent.'));
  }

  /**
   * Reset password.
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const token = req.query.token as string;
    await authService.resetPassword(token, req.body);
    res.status(200).json(new ApiResponse(200, null, 'Password reset successful. All active sessions have been logged out.'));
  }

  /**
   * Get current authenticated user profile.
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await authService.getMe(req.user!.id as string);
    res.status(200).json(new ApiResponse(200, { user }, 'User profile fetched successfully.'));
  }

  /**
   * Update current authenticated user profile.
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await authService.updateProfile(req.user!.id as string, req.body);
    res.status(200).json(new ApiResponse(200, { user }, 'Profile updated successfully.'));
  }
}

export const authController = new AuthController();
export default authController;
