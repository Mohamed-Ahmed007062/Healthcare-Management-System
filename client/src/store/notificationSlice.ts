import { create } from 'zustand';
import type { Notification } from '../types/appointment.types';
import notificationApi from '../api/notification.api';

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await notificationApi.list({ limit: 50 });
      if (res.success) {
        const listData = (res.data as any).data || res.data;
        set({ notifications: Array.isArray(listData) ? listData : [] });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success) {
        set({ unreadCount: res.data.count });
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      // Avoid duplicate keys
      const exists = state.notifications.some((n) => n._id === notification._id);
      const updated = exists
        ? state.notifications.map((n) => n._id === notification._id ? notification : n)
        : [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: exists && notification.isRead ? state.unreadCount : exists ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  markAsRead: async (id: string) => {
    try {
      const res = await notificationApi.markRead(id);
      if (res.success) {
        set((state) => {
          const updated = state.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n));
          const oldNotification = state.notifications.find((n) => n._id === id);
          const wasUnread = oldNotification && !oldNotification.isRead;
          return {
            notifications: updated,
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await notificationApi.markAllRead();
      if (res.success) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

export default useNotificationStore;
