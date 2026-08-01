import bcrypt from 'bcrypt';
import userRepo from '../repositories/user.repo';
import departmentRepo from '../repositories/department.repo';
import tokenService, { type Tokens } from './token.service';
import emailService from './email.service';
import { generateRandomToken, hashToken } from '../utils/crypto';
import ApiError from '../utils/ApiError';
import { env } from '../config/env';

export class AuthService {
  /**
   * Register a new Patient.
   */
  async registerPatient(patientData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: Date | string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    emergencyContact?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
    allergies?: string[];
    chronicConditions?: string[];
  }) {
    // 1. Check if user already exists
    const existingUser = await userRepo.findByEmail(patientData.email);
    if (existingUser) {
      throw new ApiError(409, 'A user with this email address already exists.', { code: 'EMAIL_ALREADY_EXISTS' });
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(patientData.password, 12);

    // 3. Generate verification token
    const rawVerifyToken = generateRandomToken();
    const tokenHash = hashToken(rawVerifyToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);

    // 4. Create patient in DB
    const { password, ...otherData } = patientData;
    const patient = await userRepo.createPatient({
      ...otherData,
      passwordHash,
      emailVerifyToken: {
        tokenHash,
        expiresAt,
      },
    });

    // 5. Send verification email (fire and forget / async)
    emailService.sendVerificationEmail(patient.email, `${patient.firstName} ${patient.lastName}`, rawVerifyToken).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to send verification email during registration:', err);
    });

    return patient;
  }

  /**
   * Register a new Doctor (Admin only).
   */
  async registerDoctor(
    doctorData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      specialization: string;
      qualifications?: string[];
      experienceYears?: number;
      consultationFee?: number;
      departmentId?: string;
      bio?: string;
    },
    adminUserId: string,
  ) {
    // 1. Verify department exists if departmentId is provided
    if (doctorData.departmentId) {
      const dept = await departmentRepo.findById(doctorData.departmentId);
      if (!dept) {
        throw new ApiError(404, 'The specified department does not exist.', { code: 'DEPARTMENT_NOT_FOUND' });
      }
    }

    // 2. Check if user already exists
    const existingUser = await userRepo.findByEmail(doctorData.email);
    if (existingUser) {
      throw new ApiError(409, 'A user with this email address already exists.', { code: 'EMAIL_ALREADY_EXISTS' });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(doctorData.password, 12);

    // 4. Create doctor
    const { password, ...otherData } = doctorData;
    const doctor = await userRepo.createDoctor({
      ...otherData,
      passwordHash,
      isEmailVerified: true, // Admin registered doctors can be verified by default
      createdBy: adminUserId,
    });

    return doctor;
  }

  /**
   * Login user and issue auth tokens.
   */
  async login(credentials: { email: string; password: string }): Promise<{ user: any; tokens: Tokens }> {
    // 1. Find user with passwordHash
    const user = await userRepo.findByEmail(credentials.email, true);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
    }

    // 2. Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact administration.', {
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // 3. Match password
    const isPasswordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
    }

    // 4. Update last login
    await userRepo.update(user.id, { lastLoginAt: new Date() });

    // 5. Issue tokens
    const tokens = await tokenService.issueAuthTokens(user.id, user.role);

    // Remove passwordHash before returning user object
    user.passwordHash = undefined;

    return { user, tokens };
  }

  /**
   * Logout user and revoke tokens.
   */
  async logout(userId: string): Promise<void> {
    await tokenService.revokeUserTokens(userId);
  }

  /**
   * Rotate access & refresh tokens.
   */
  async refresh(token: string): Promise<Tokens> {
    return tokenService.rotateTokens(token);
  }

  /**
   * Verify email address with token.
   */
  async verifyEmail(token: string): Promise<void> {
    const hashed = hashToken(token);
    const user = await userRepo.findByVerificationTokenHash(hashed);

    if (!user) {
      throw new ApiError(400, 'Invalid or expired verification token.', { code: 'INVALID_VERIFICATION_TOKEN' });
    }

    await userRepo.update(user.id, {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
    });
  }

  /**
   * Initiate forgot password flow by generating token and sending email.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      return;
    }

    const rawResetToken = generateRandomToken();
    const hashedToken = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + env.RESET_PASSWORD_TTL_HOURS * 60 * 60 * 1000);

    await userRepo.update(user.id, {
      resetPasswordToken: {
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    emailService.sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`, rawResetToken).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to send password reset email:', err);
    });
  }

  /**
   * Reset user password.
   * Also revokes all refresh token families to log the user out of all sessions (security requirement).
   */
  async resetPassword(token: string, passwordData: { password: string }): Promise<void> {
    const hashed = hashToken(token);
    const user = await userRepo.findByResetPasswordTokenHash(hashed);

    if (!user) {
      throw new ApiError(400, 'Invalid or expired password reset token.', { code: 'INVALID_RESET_TOKEN' });
    }

    // 1. Hash new password
    const passwordHash = await bcrypt.hash(passwordData.password, 12);

    // 2. Update user passwords & clear reset tokens & revoke refresh token chains
    await userRepo.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
      refreshTokenHash: null,
      refreshFamilyId: null,
    });
  }

  /**
   * Get current authenticated user profile.
   */
  async getMe(userId: string): Promise<any> {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.', { code: 'USER_NOT_FOUND' });
    }
    delete user.passwordHash;
    delete user.refreshTokenHash;
    return user;
  }

  /**
   * Update user profile.
   */
  async updateProfile(userId: string, data: Record<string, any>): Promise<any> {
    const allowedKeys = [
      'firstName', 'lastName', 'phone', 'avatarUrl',
      'specialization', 'qualifications', 'experienceYears', 'consultationFee', 'bio',
      'dateOfBirth', 'gender', 'bloodGroup', 'address', 'emergencyContact', 'allergies', 'chronicConditions'
    ];

    const filteredData: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    const updated = await userRepo.update(userId, filteredData);
    if (!updated) {
      throw new ApiError(404, 'User not found.', { code: 'USER_NOT_FOUND' });
    }
    delete updated.passwordHash;
    delete updated.refreshTokenHash;
    return updated;
  }
}

export const authService = new AuthService();
export default authService;
