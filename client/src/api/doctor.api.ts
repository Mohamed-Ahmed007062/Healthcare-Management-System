import api from './axios';
import type { ApiResponse } from './auth.api';
import type { User } from '../types/auth.types';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  headDoctorId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const doctorApi = {
  /**
   * Get all active/available doctors, optionally filtered by department
   */
  async getDoctors(params: Record<string, any> = {}): Promise<ApiResponse<User[]>> {
    const res = await api.get('/v1/appointments/doctors', { params });
    return res.data;
  },

  /**
   * Get all active departments
   */
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    const res = await api.get('/v1/appointments/departments');
    return res.data;
  }
};

export default doctorApi;
