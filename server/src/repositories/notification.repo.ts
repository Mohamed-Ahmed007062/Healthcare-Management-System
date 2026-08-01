import { prisma } from '../config/db';
import { paginate, PaginationOptions } from '../utils/pagination';

export function formatNotification(notif: any) {
  if (!notif) return null;
  return {
    ...notif,
    _id: notif.id,
  };
}

export class NotificationRepository {
  /**
   * Create a single notification
   */
  async create(data: any) {
    const notif = await prisma.notification.create({
      data: {
        recipientId: data.recipientId.toString(),
        senderId: data.senderId ? data.senderId.toString() : null,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId ? data.relatedEntityId.toString() : null,
        isRead: data.isRead ?? false,
      },
    });
    return formatNotification(notif);
  }

  /**
   * Bulk insert multiple notifications
   */
  async createMany(dataArray: any[]) {
    const notifs = await prisma.notification.createMany({
      data: dataArray.map((data) => ({
        recipientId: data.recipientId.toString(),
        senderId: data.senderId ? data.senderId.toString() : null,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId ? data.relatedEntityId.toString() : null,
        isRead: data.isRead ?? false,
      })),
    });
    return notifs;
  }

  /**
   * Find notifications by recipient ID with pagination
   */
  async findByRecipient(recipientId: string, pagination: PaginationOptions) {
    const customPagination: PaginationOptions = { 
      ...pagination, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    };
    const result = await paginate(prisma.notification, { recipientId: recipientId.toString() }, customPagination);
    return {
      ...result,
      data: result.data.map(formatNotification),
    };
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(id: string, recipientId: string) {
    if (!id || !recipientId) return null;
    try {
      const notif = await prisma.notification.update({
        where: {
          id: id.toString(),
        },
        data: { isRead: true },
      });
      return formatNotification(notif);
    } catch {
      return null;
    }
  }

  /**
   * Mark all unread notifications as read for a given recipient
   */
  async markAllAsRead(recipientId: string) {
    if (!recipientId) return { count: 0 };
    return await prisma.notification.updateMany({
      where: { recipientId: recipientId.toString(), isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Count the number of unread notifications
   */
  async countUnread(recipientId: string): Promise<number> {
    if (!recipientId) return 0;
    return await prisma.notification.count({
      where: { recipientId: recipientId.toString(), isRead: false },
    });
  }

  /**
   * Cleanup old notifications older than the given days
   */
  async deleteOld(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }
}

export const notificationRepo = new NotificationRepository();
export default notificationRepo;
