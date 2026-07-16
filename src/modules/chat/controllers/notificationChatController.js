// controllers/notificationController.js
import ThongBao from '#models/ChatNotification.js';
import notificationService from '#modules/chat/services/notificationService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

// Lấy danh sách thông báo của người dùng
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user.id, req.query.type);
  return res.status(200).json(notifications);
});

// Lấy thông báo chưa đọc
const getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUnreadNotifications(req.user.id);
  return res.status(200).json(notifications);
});

// Đánh dấu thông báo đã đọc
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const updated = await notificationService.markAsRead(req.params.id, req.user.id);
  return res.status(200).json(updated);
});

// Đánh dấu tất cả thông báo đã đọc
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
});

// Xóa thông báo
const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.id);
  return res.status(200).json({ message: 'Xóa thông báo thành công' });
});

// Xóa tất cả thông báo của người dùng
const deleteAllNotifications = asyncHandler(async (req, res) => {
  await notificationService.deleteAllNotifications(req.user.id);
  return res.status(200).json({ message: 'Xóa tất cả thông báo thành công' });
});

// Tạo thông báo (dùng bởi socket helpers) — giữ chữ ký (data, io)
const createNotification = async (data, io) => {
  try {
    const populatedNotification = await notificationService.createNotification(data);
    io.to(data.nguoiNhan.toString()).emit('newNotification', populatedNotification);
    return populatedNotification;
  } catch (error) {
    console.error('Lỗi tạo thông báo:', error.message);
    throw error;
  }
};

// Helper function: Tích hợp Socket.IO
const setupNotificationSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('joinUserRoom', ({ userId }) => {
      socket.join(userId); // Tham gia room cá nhân của user để nhận thông báo
      socket.emit('message', { message: `Joined user room ${userId}` });
    });

    socket.on('markNotificationAsRead', async ({ id, userId }) => {
      try {
        const notification = await ThongBao.findById(id);
        if (!notification) throw new Error('Không tìm thấy thông báo');
        if (notification.nguoiNhan.toString() !== userId) throw new Error('Không có quyền');

        notification.daDoc = true;
        await notification.save();

        const updatedNotification = await notificationService.markAsRead(id, userId);
        io.to(userId).emit('notificationRead', updatedNotification);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
  });
};

export { getNotifications, getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications, createNotification, setupNotificationSocket };
export default { getNotifications, getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications, createNotification, setupNotificationSocket };
