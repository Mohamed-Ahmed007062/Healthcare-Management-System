import type { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import ApiResponse from '../utils/ApiResponse';

export class NotificationController {
  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    const result = await notificationService.getUserNotifications(
      req.user!.id as string,
      { page, limit }
    );
    res.status(200).json(new ApiResponse(200, result, 'Notifications fetched successfully'));
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user!.id as string
    );
    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationService.markAllAsRead(req.user!.id as string);
    res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
  }

  async countUnread(req: Request, res: Response): Promise<void> {
    const count = await notificationService.getUnreadCount(req.user!.id as string);
    res.status(200).json(new ApiResponse(200, { count }, 'Unread count fetched successfully'));
  }
}

export const notificationController = new NotificationController();
export default notificationController;
