import api from './axios';
import type { ApiResponse } from './auth.api';

export interface MedicalRecordFile {
  url: string;
  publicId?: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface MedicalRecord {
  _id: string;
  patientId: string;
  doctorId?: any;
  appointmentId?: string;
  title: string;
  description?: string;
  type: 'lab_report' | 'scan' | 'prescription' | 'discharge_summary' | 'other';
  files: MedicalRecordFile[];
  uploadedById: any;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
}

export const medicalRecordApi = {
  /**
   * Create a new medical record
   */
  async create(data: {
    patientId: string;
    appointmentId?: string;
    title: string;
    description?: string;
    type: string;
    files?: MedicalRecordFile[];
    isConfidential?: boolean;
  }): Promise<ApiResponse<MedicalRecord>> {
    const res = await api.post('/v1/medical-records', data);
    return res.data;
  },

  /**
   * Get paginated medical records of a patient
   */
  async getByPatient(patientId: string, params: Record<string, any> = {}): Promise<ApiResponse<{ data: MedicalRecord[], meta: any }>> {
    const res = await api.get(`/v1/medical-records/patient/${patientId}`, { params });
    return res.data;
  },

  /**
   * Get a single medical record by ID
   */
  async getById(id: string): Promise<ApiResponse<MedicalRecord>> {
    const res = await api.get(`/v1/medical-records/${id}`);
    return res.data;
  },
};

export default medicalRecordApi;
