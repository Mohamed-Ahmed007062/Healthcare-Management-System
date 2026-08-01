import api from './axios';
import type { ApiResponse } from './auth.api';
import type { TimelineResult } from '../types/medicalHistory.types';

export const medicalHistoryApi = {
  async getTimeline(patientId: string, params: Record<string, unknown> = {}): Promise<ApiResponse<TimelineResult>> {
    const res = await api.get(`/v1/patients/${patientId}/timeline`, { params });
    return res.data;
  },
};

export default medicalHistoryApi;
