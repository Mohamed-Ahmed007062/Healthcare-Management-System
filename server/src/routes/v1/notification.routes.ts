import { Router } from 'express';
import notificationController from '../../controllers/notification.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import asyncHandler from '../../utils/asyncHandler';
import {
  getNotificationsQuerySchema,
  markReadSchema,
} from '../../validators/notification.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  validate(getNotificationsQuerySchema),
  asyncHandler(notificationController.list)
);

router.get(
  '/unread-count',
  asyncHandler(notificationController.countUnread)
);

router.patch(
  '/read-all',
  asyncHandler(notificationController.markAllRead)
);

router.patch(
  '/:id/read',
  validate(markReadSchema),
  asyncHandler(notificationController.markRead)
);

export default router;
