import api from './axios';
import type { ApiResponse } from './auth.api';
import type { Prescription } from '../types/appointment.types';

export const prescriptionApi = {
  /**
   * Create a new prescription (Doctor only)
   */
  async create(data: {
    appointmentId: string;
    patientId: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      durationDays?: number;
      instructions?: string;
    }>;
    notes?: string;
  }): Promise<ApiResponse<Prescription>> {
    const res = await api.post('/v1/prescriptions', data);
    return res.data;
  },

  /**
   * Get prescription for a specific appointment
   */
  async getByAppointment(appointmentId: string): Promise<ApiResponse<Prescription>> {
    const res = await api.get(`/v1/prescriptions/appointment/${appointmentId}`);
    return res.data;
  },

  /**
   * List prescriptions for a specific patient
   */
  async getByPatient(patientId: string, params: Record<string, any> = {}): Promise<ApiResponse<Prescription[]>> {
    const res = await api.get(`/v1/prescriptions/patient/${patientId}`, { params });
    return res.data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const res = await api.get(`/v1/prescriptions/${id}/download`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default prescriptionApi;
