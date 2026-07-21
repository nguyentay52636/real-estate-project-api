import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
import { getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications, } from '#modules/chat/controllers/notificationChatController.js';

const router = express.Router();

router.use(middlewareController.verifyToken);

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;