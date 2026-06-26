import express from 'express';
import { getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications, } from '../controllers/notificationChatController.js';
import verifyToken from '../controllers/middlewareController.js';

// 
// const router = express.Router();
// const {
//   getNotifications,
//   getUnreadNotifications,
//   markNotificationAsRead,
//   markAllNotificationsAsRead,
//   deleteNotification,
//   deleteAllNotifications,
// } = require('../controllers/notificationController');
//  

// router.get('/', verifyToken, getNotifications);
// router.get('/unread', verifyToken, getUnreadNotifications);
// router.put('/:id/read', verifyToken, markNotificationAsRead);
// router.put('/read-all', verifyToken, markAllNotificationsAsRead);
// router.delete('/:id', verifyToken, deleteNotification);
// router.delete('/', verifyToken, deleteAllNotifications);

// export default router;

const router = express.Router();

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;