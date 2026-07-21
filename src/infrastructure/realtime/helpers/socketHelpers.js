import mongoose from 'mongoose';
import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import logger from '#shared/utils/logger.js';
import { createNotification } from '#modules/chat/controllers/notificationChatController.js';

function emitError(socket, code, message, error) {
  socket.emit('error', { code, message, ...(error ? { error } : {}) });
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function isActiveMember(room, userId) {
  return room.thanhVien.some(
    (m) => m.nguoiDung.toString() === userId && m.trangThai === 'active'
  );
}

function isAdmin(room, userId) {
  return room.thanhVien.some(
    (m) => m.nguoiDung.toString() === userId && m.vaiTro === 'admin'
  );
}

function getOtherActiveMembers(room, userId) {
  return room.thanhVien.filter(
    (m) => m.nguoiDung.toString() !== userId && m.trangThai === 'active'
  );
}

async function getRoomOrError(socket, roomId, { requireInSocketRoom = false } = {}) {
  if (!isValidId(roomId)) {
    emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
    return null;
  }
  if (requireInSocketRoom && !socket.rooms.has(roomId)) {
    emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
    return null;
  }
  const room = await PhongChat.findById(roomId);
  if (!room) {
    emitError(socket, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chat');
    return null;
  }
  return room;
}

async function notifyMembers(io, members, notification) {
  if (!members.length) return;
  await Promise.all(
    members.map((m) =>
      createNotification({ ...notification, nguoiNhan: m.nguoiDung }, io)
    )
  );
}

async function createSystemMessage(roomId, nguoiGuiId, noiDung) {
  const systemMessage = await TinNhan.create({
    roomId,
    nguoiGuiId,
    noiDung,
    loaiTinNhan: 'system',
    daDoc: [nguoiGuiId],
    trangThai: 'sent',
  });
  await PhongChat.findByIdAndUpdate(roomId, {
    $push: { tinNhan: systemMessage._id },
    tinNhanCuoi: systemMessage._id,
  });
  return systemMessage;
}

async function populateRoom(roomId, extraPopulate = []) {
  let query = PhongChat.findById(roomId)
    .populate('thanhVien.nguoiDung', 'ten anhDaiDien')
    .populate('nguoiTao', 'ten anhDaiDien');

  for (const opt of extraPopulate) {
    query = query.populate(opt);
  }
  return query;
}

async function populateMessage(messageId) {
  return TinNhan.findById(messageId)
    .populate('nguoiGuiId', 'ten anhDaiDien')
    .populate('roomId', 'tenPhong loaiPhong')
    .populate('phanHoiTinNhan', 'noiDung nguoiGuiId');
}

function wrapHandler(socket, handler, defaultCode = 'SERVER_ERROR') {
  return async (data) => {
    try {
      await handler(data);
    } catch (error) {
      logger.error(`Socket [${defaultCode}]:`, error.message);
      socket.emit('error', {
        code: defaultCode,
        message: error.message || 'Lỗi máy chủ',
        error: error.message,
      });
    }
  };
}

export { emitError, isValidId, isActiveMember, isAdmin, getOtherActiveMembers, getRoomOrError, notifyMembers, createSystemMessage, populateRoom, populateMessage, wrapHandler };
export default { emitError, isValidId, isActiveMember, isAdmin, getOtherActiveMembers, getRoomOrError, notifyMembers, createSystemMessage, populateRoom, populateMessage, wrapHandler };