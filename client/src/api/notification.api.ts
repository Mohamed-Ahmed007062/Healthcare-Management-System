import api from './axios';
import type { ApiResponse } from './auth.api';
import type { Notification } from '../types/appointment.types';

export const notificationApi = {
  /**
   * List notification history
   */
  async list(params: Record<string, any> = {}): Promise<ApiResponse<Notification[]>> {
    const res = await api.get('/v1/notifications', { params });
    return res.data;
  },

  /**
   * Mark a notification as read
   */
  async markRead(id: string): Promise<ApiResponse<Notification>> {
    const res = await api.patch(`/v1/notifications/${id}/read`);
    return res.data;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllRead(): Promise<ApiResponse<{ modifiedCount: number }>> {
    const res = await api.patch('/v1/notifications/read-all');
    return res.data;
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const res = await api.get('/v1/notifications/unread-count');
    return res.data;
  }
};

export default notificationApi;
