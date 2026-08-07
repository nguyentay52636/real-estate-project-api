import mongoose from 'mongoose';
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

function toObjectId(id) {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export function createNotificationService(deps = {}) {
  const Notification = deps.Notification ?? NotificationModel;

  async function getNotifications(userId, type) {
    const query = { nguoiNhan: userId };
    if (type) query.loai = type;
    return withPopulate(Notification.find(query)).sort({ createdAt: -1 });
  }

  async function getUnreadNotifications(userId) {
    const data = await withPopulate(
      Notification.find({ nguoiNhan: userId, daDoc: false }),
    ).sort({ createdAt: -1 });

    const byRoom = {};
    for (const n of data) {
      const rid = n.roomId?._id?.toString?.() || n.roomId?.toString?.();
      if (!rid) continue;
      byRoom[rid] = (byRoom[rid] || 0) + 1;
    }

    return {
      count: data.length,
      byRoom,
      data,
    };
  }

  async function getUnreadCountByRooms(userId, roomIds = []) {
    if (!roomIds.length) return {};
    const rows = await Notification.aggregate([
      {
        $match: {
          nguoiNhan: toObjectId(userId),
          daDoc: false,
          roomId: { $in: roomIds.map(toObjectId) },
          loai: { $in: ['new_message', 'mention'] },
        },
      },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
    ]);
    const map = {};
    for (const r of rows) map[String(r._id)] = r.count;
    return map;
  }

  async function markAsRead(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
    if (notification.nguoiNhan.toString() !== String(userId)) {
      throw new AppError('Không có quyền đánh dấu thông báo này', 403);
    }
    notification.daDoc = true;
    await notification.save();
    return withPopulate(Notification.findById(id));
  }

  async function markAllAsRead(userId) {
    await Notification.updateMany({ nguoiNhan: userId, daDoc: false }, { daDoc: true });
  }

  /** Đánh dấu đã đọc mọi noti của 1 phòng (khi mở chat). */
  async function markRoomAsRead(userId, roomId) {
    await Notification.updateMany(
      { nguoiNhan: userId, roomId, daDoc: false },
      { daDoc: true },
    );
  }

  async function deleteNotification(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new AppError('Không tìm thấy thông báo', 404);
    if (notification.nguoiNhan.toString() !== String(userId)) {
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
    getUnreadCountByRooms,
    markAsRead,
    markAllAsRead,
    markRoomAsRead,
    deleteNotification,
    deleteAllNotifications,
    createNotification,
  };
}

const notificationService = createNotificationService();
export default notificationService;
