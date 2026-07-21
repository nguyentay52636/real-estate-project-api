import NotificationModel from '#models/ChatNotification.js';
import { AppError } from '#shared/errors/AppError.js';

const POPULATE = [
  { path: 'nguoiNhan', select: 'ten anhDaiDien' },
  { path: 'roomId', select: 'tenPhong loaiPhong boiCanh' },
  {
    path: 'tinNhanId',
    select: 'noiDung loaiTinNhan nguoiGuiId',
    populate: { path: 'nguoiGuiId', select: 'ten anhDaiDien' },
  },
];

function withPopulate(query) {
  return POPULATE.reduce((q, p) => q.populate(p), query);
}

export function createNotificationService(deps = {}) {
  const Notification = deps.Notification ?? NotificationModel;

  async function getNotifications(userId, type) {
    const query = { nguoiNhan: userId };
    if (type) query.loai = type;
    return withPopulate(Notification.find(query)).sort({ createdAt: -1 });
  }

  async function getUnreadNotifications(userId) {
    return withPopulate(
      Notification.find({ nguoiNhan: userId, daDoc: false }),
    ).sort({ createdAt: -1 });
  }

  async function markAsRead(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
    if (notification.nguoiNhan.toString() !== userId) {
      throw new AppError('Không có quyền đánh dấu thông báo này', 403);
    }
    notification.daDoc = true;
    await notification.save();
    return withPopulate(Notification.findById(id));
  }

  async function markAllAsRead(userId) {
    await Notification.updateMany({ nguoiNhan: userId, daDoc: false }, { daDoc: true });
  }

  async function deleteNotification(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
    if (notification.nguoiNhan.toString() !== userId) {
      throw new AppError('Không có quyền xóa thông báo này', 403);
    }
    await Notification.findByIdAndDelete(id);
  }

  async function deleteAllNotifications(userId) {
    await Notification.deleteMany({ nguoiNhan: userId });
  }

  async function createNotification(data) {
    const notification = await Notification.create(data);
    return withPopulate(Notification.findById(notification._id));
  }

  return {
    getNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    createNotification,
  };
}

const notificationService = createNotificationService();
export default notificationService;
