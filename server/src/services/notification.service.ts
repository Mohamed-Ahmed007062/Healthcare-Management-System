import notificationRepo from '../repositories/notification.repo';
import ApiError from '../utils/ApiError';
import type { PaginationOptions } from '../utils/pagination';
import type { NotificationType } from '../models/constants';
import type { Server as SocketIOServer } from 'socket.io';

export class NotificationService {
  private io: SocketIOServer | null = null;

  /**
   * Called once during server bootstrap to inject the Socket.io instance.
   * @param {SocketIOServer} io - The Socket.io server instance.
   */
  setSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Emits an event to a specific user via Socket.io.
   * @param {string} userId - The recipient user ID.
   * @param {string} event - The socket event name.
   * @param {any} data - The payload to send.
   */
  private emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Creates a notification in the database and emits it to the user.
   * @param {Object} data - Notification details.
   * @param {string} data.recipientId - The recipient's user ID.
   * @param {string} [data.senderId] - The sender's user ID, if applicable.
   * @param {NotificationType} data.type - The type of notification.
   * @param {string} data.title - Notification title.
   * @param {string} data.message - Notification message content.
   * @param {string} [data.relatedEntityType] - Type of the related entity.
   * @param {string} [data.relatedEntityId] - ID of the related entity.
   * @returns {Promise<any>} The created notification document.
   */
  async createAndEmit(data: {
    recipientId: string;
    senderId?: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<any> {
    const notification = await notificationRepo.create(data);
    this.emitToUser(data.recipientId, 'notification:new', notification);
    return notification;
  }

  /**
   * Retrieves paginated notifications for a specific user.
   * @param {string} userId - The user ID.
   * @param {PaginationOptions} pagination - Pagination options.
   * @returns {Promise<any>} The user's notifications.
   */
  async getUserNotifications(userId: string, pagination: PaginationOptions): Promise<any> {
    return await notificationRepo.findByRecipient(userId, pagination);
  }

  /**
   * Marks a specific notification as read.
   * @param {string} notificationId - The ID of the notification to mark read.
   * @param {string} userId - The requesting user's ID for authorization.
   * @returns {Promise<any>} The updated notification document.
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await notificationRepo.markAsRead(notificationId, userId);
    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }
    return notification;
  }

  /**
   * Marks all of a user's notifications as read.
   * @param {string} userId - The user ID.
   * @returns {Promise<any>} The result of the update operation.
   */
  async markAllAsRead(userId: string): Promise<any> {
    return await notificationRepo.markAllAsRead(userId);
  }

  /**
   * Gets the count of unread notifications for a user.
   * @param {string} userId - The user ID.
   * @returns {Promise<number>} The number of unread notifications.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await notificationRepo.countUnread(userId);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
