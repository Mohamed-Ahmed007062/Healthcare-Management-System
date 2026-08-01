import api from './axios';
import type { User } from '../types/auth.types';

// Standard response interface matching backend ApiResponse
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta: Record<string, any> | null;
}

export const authApi = {
  /**
   * Register a new Patient
   */
  async registerPatient(data: Record<string, any>): Promise<ApiResponse<{ user: User }>> {
    const res = await api.post('/v1/auth/register', data);
    return res.data;
  },

  /**
   * Register a new Doctor (Admin only)
   */
  async registerDoctor(data: Record<string, any>): Promise<ApiResponse<{ user: User }>> {
    const res = await api.post('/v1/auth/register/doctor', data);
    return res.data;
  },

  /**
   * Login user
   */
  async login(data: Record<string, any>): Promise<ApiResponse<{ user: User; accessToken: string; csrfToken: string }>> {
    const res = await api.post('/v1/auth/login', data);
    return res.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<null>> {
    const res = await api.post('/v1/auth/logout');
    return res.data;
  },

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    const res = await api.get(`/v1/auth/verify-email?token=${token}`);
    return res.data;
  },

  /**
   * Request password reset link
   */
  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    const res = await api.post('/v1/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, data: Record<string, any>): Promise<ApiResponse<null>> {
    const res = await api.post(`/v1/auth/reset-password?token=${token}`, data);
    return res.data;
  },

  /**
   * Check backend DB health
   */
  async checkDbHealth(): Promise<ApiResponse<{ database: string }>> {
    const res = await api.get('/v1/health/db');
    return res.data;
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(): Promise<ApiResponse<{ user: User }>> {
    const res = await api.get('/v1/auth/me');
    return res.data;
  },

  /**
   * Update current user profile
   */
  async updateProfile(data: Record<string, any>): Promise<ApiResponse<{ user: User }>> {
    const res = await api.patch('/v1/auth/profile', data);
    return res.data;
  }
};

export default authApi;
