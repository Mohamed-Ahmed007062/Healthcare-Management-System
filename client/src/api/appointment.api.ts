import api from './axios';
import type { ApiResponse } from './auth.api';
import type { Appointment, VideoSession } from '../types/appointment.types';

export const appointmentApi = {
  /**
   * Book a new appointment
   */
  async book(data: {
    doctorId: string;
    slot: { start: string; end: string };
    reason?: string;
    symptoms?: string[];
    meetingType?: 'in_person' | 'video';
  }): Promise<ApiResponse<Appointment>> {
    const res = await api.post('/v1/appointments', data);
    return res.data;
  },

  /**
   * List appointments with optional filters and pagination
   */
  async list(params: Record<string, any> = {}): Promise<ApiResponse<Appointment[]>> {
    const res = await api.get('/v1/appointments', { params });
    return res.data;
  },

  /**
   * Get single appointment by ID
   */
  async getById(id: string): Promise<ApiResponse<Appointment>> {
    const res = await api.get(`/v1/appointments/${id}`);
    return res.data;
  },

  /**
   * Update appointment status (confirm/complete/no-show)
   */
  async updateStatus(id: string, status: string): Promise<ApiResponse<Appointment>> {
    const res = await api.patch(`/v1/appointments/${id}/status`, { status });
    return res.data;
  },

  /**
   * Cancel appointment
   */
  async cancel(id: string): Promise<ApiResponse<Appointment>> {
    const res = await api.delete(`/v1/appointments/${id}`);
    return res.data;
  },

  /**
   * Get available time slots for a doctor on a specific date (YYYY-MM-DD)
   */
  async getAvailableSlots(doctorId: string, date: string): Promise<ApiResponse<Array<{ start: string; end: string }>>> {
    const res = await api.get(`/v1/appointments/doctors/${doctorId}/available-slots`, {
      params: { date }
    });
    return res.data;
  },

  async getVideoSession(appointmentId: string): Promise<ApiResponse<VideoSession>> {
    const res = await api.get(`/v1/appointments/${appointmentId}/video-session`);
    return res.data;
  },
};

export default appointmentApi;
