import { Router } from 'express';
import authController from '../../controllers/auth.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import { authLimiter, passwordResetLimiter } from '../../middlewares/rateLimit';
import { auditLog } from '../../middlewares/auditLog';
import asyncHandler from '../../utils/asyncHandler';
import {
  registerPatientSchema,
  registerDoctorSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../../validators/auth.schema';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new patient account
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, example: "mohamed12@gmail.com" }
 *               password: { type: string, example: "password123" }
 *               firstName: { type: string, example: "Mohamed" }
 *               lastName: { type: string, example: "Ahmed" }
 *     responses:
 *       210:
 *         description: Patient account registered successfully
 */
router.post(
  '/register',
  authLimiter,
  validate(registerPatientSchema),
  asyncHandler(authController.registerPatient),
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user & issue JWT tokens
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "mohamed12@gmail.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT tokens and user profile
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  auditLog('login_attempt'),
  asyncHandler(authController.login),
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using HTTP-only cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 */
router.post(
  '/refresh',
  asyncHandler(authController.refresh),
);

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     summary: Verify patient email address via token
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.get(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link via email
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "mohamed12@gmail.com" }
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, example: "newpassword123" }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  auditLog('password_reset'),
  asyncHandler(authController.resetPassword),
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out user & invalidate refresh token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post(
  '/logout',
  authenticate,
  auditLog('logout'),
  asyncHandler(authController.logout),
);

/**
 * @swagger
 * /auth/register/doctor:
 *   post:
 *     summary: Register doctor profile (Admin only)
 *     tags: [Authentication]
 *     responses:
 *       201:
 *         description: Doctor registered successfully
 */
router.post(
  '/register/doctor',
  authenticate,
  authorize('admin'),
  validate(registerDoctorSchema),
  auditLog('register_doctor'),
  asyncHandler(authController.registerDoctor),
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user profile object
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getMe),
);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               bio: { type: string }
 *               consultationFee: { type: number }
 *               specialization: { type: string }
 *               bloodGroup: { type: string }
 *               gender: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch(
  '/profile',
  authenticate,
  auditLog('profile_update'),
  asyncHandler(authController.updateProfile),
);

export default router;
