const mongoose = require('mongoose');
const PhongChat = require('../../models/PhongChat');
const TinNhan = require('../../models/TinNhan');
const { createNotification } = require('../../controllers/notificationChatController');
const logger = require('../../utils/logger');

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
    .populate('thanhVien.nguoiDung', 'hoTen avatar')
    .populate('nguoiTao', 'hoTen avatar');

  for (const opt of extraPopulate) {
    query = query.populate(opt);
  }
  return query;
}

async function populateMessage(messageId) {
  return TinNhan.findById(messageId)
    .populate('nguoiGuiId', 'hoTen avatar')
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

module.exports = {
  emitError,
  isValidId,
  isActiveMember,
  isAdmin,
  getOtherActiveMembers,
  getRoomOrError,
  notifyMembers,
  createSystemMessage,
  populateRoom,
  populateMessage,
  wrapHandler,
};
