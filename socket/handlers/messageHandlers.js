import TinNhan from '../../models/Message.js';
import PhongChat from '../../models/ChatRoom.js';
import { createMessage, updateMessage, deleteMessage } from '../../controllers/messageController.js';
import { emitError,
  isValidId,
  isAdmin,
  getOtherActiveMembers,
  getRoomOrError,
  notifyMembers,
  populateMessage,
  wrapHandler, } from '../helpers/socketHelpers.js';

function registerMessageHandlers(socket, io) {
  socket.on(
    'message:addToRoom',
    wrapHandler(socket, async ({ roomId, messageId }) => {
      if (!isValidId(roomId) || !isValidId(messageId)) {
        emitError(socket, 'INVALID_ID', 'ID phòng hoặc tin nhắn không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }

      const [room, message] = await Promise.all([
        PhongChat.findById(roomId),
        TinNhan.findById(messageId),
      ]);

      if (!room) {
        emitError(socket, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chat');
        return;
      }
      if (!message) {
        emitError(socket, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn');
        return;
      }

      if (!room.tinNhan.some((id) => id.toString() === messageId)) {
        await PhongChat.findByIdAndUpdate(roomId, {
          $push: { tinNhan: messageId },
          tinNhanCuoi: messageId,
        });

        await notifyMembers(io, getOtherActiveMembers(room, socket.user.id), {
          loai: 'new_message',
          noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
          roomId,
          tinNhanId: messageId,
        });

        io.to(roomId).emit('messageAdded', { roomId, messageId });
      }

      socket.emit('messageAdded', { message: 'Thêm tin nhắn vào phòng thành công' });
    }, 'ADD_MESSAGE_FAILED')
  );

  socket.on(
    'message:removeFromRoom',
    wrapHandler(socket, async ({ roomId, messageId }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;
      if (!isValidId(messageId)) {
        emitError(socket, 'INVALID_ID', 'ID phòng hoặc tin nhắn không hợp lệ');
        return;
      }
      if (!isAdmin(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ admin mới có thể xóa tin nhắn khỏi phòng');
        return;
      }

      const newTinNhan = room.tinNhan.filter((id) => id.toString() !== messageId);
      const tinNhanCuoi =
        room.tinNhanCuoi?.toString() === messageId
          ? newTinNhan[newTinNhan.length - 1] || null
          : room.tinNhanCuoi;

      await PhongChat.findByIdAndUpdate(roomId, { tinNhan: newTinNhan, tinNhanCuoi });

      io.to(roomId).emit('messageRemoved', { roomId, messageId });
      socket.emit('messageRemoved', { message: 'Xóa tin nhắn khỏi phòng thành công' });
    }, 'REMOVE_MESSAGE_FAILED')
  );

  socket.on(
    'message:create',
    wrapHandler(socket, async (data) => {
      const { roomId, noiDung, tapTin, phanHoiTinNhan, loaiTinNhan } = data;

      if (!roomId || (!noiDung && !tapTin?.length && loaiTinNhan !== 'cuoc_goi')) {
        emitError(socket, 'INVALID_DATA', 'Thiếu dữ liệu tin nhắn');
        return;
      }
      if (!isValidId(roomId)) {
        emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }
      if (phanHoiTinNhan && !isValidId(phanHoiTinNhan)) {
        emitError(socket, 'INVALID_REPLY_ID', 'ID tin nhắn trả lời không hợp lệ');
        return;
      }

      const message = await createMessage({
        roomId,
        nguoiGuiId: socket.user.id,
        noiDung: noiDung || '',
        tapTin: tapTin || [],
        phanHoiTinNhan: phanHoiTinNhan || null,
        loaiTinNhan: loaiTinNhan || 'text',
      });

      const [populatedMessage, room] = await Promise.all([
        populateMessage(message._id),
        PhongChat.findById(roomId).select('tenPhong thanhVien'),
      ]);

      await notifyMembers(io, getOtherActiveMembers(room, socket.user.id), {
        loai: 'new_message',
        noiDung: `Tin nhắn mới trong phòng ${room.tenPhong || 'chat riêng'}`,
        roomId,
        tinNhanId: message._id,
      });

      io.to(roomId).emit('message:new', populatedMessage);
    }, 'CREATE_MESSAGE_FAILED')
  );

  socket.on(
    'message:update',
    wrapHandler(socket, async ({ id, noiDungMoi, tapTin, roomId }) => {
      if (!id || !roomId || (!noiDungMoi && !tapTin)) {
        emitError(socket, 'INVALID_DATA', 'Thiếu dữ liệu cập nhật');
        return;
      }
      if (!isValidId(id) || !isValidId(roomId)) {
        emitError(socket, 'INVALID_ID', 'ID tin nhắn hoặc phòng không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }

      const existingMessage = await TinNhan.findById(id).select('nguoiGuiId');
      if (!existingMessage) {
        emitError(socket, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn');
        return;
      }
      if (existingMessage.nguoiGuiId.toString() !== socket.user.id) {
        emitError(socket, 'UNAUTHORIZED', 'Không có quyền sửa tin nhắn');
        return;
      }

      const updated = await updateMessage(id, noiDungMoi, socket.user.id, io);
      if (!updated) {
        emitError(socket, 'UPDATE_FAILED', 'Cập nhật tin nhắn thất bại');
        return;
      }

      const populatedMessage = await populateMessage(id);
      io.to(roomId).emit('message:updated', populatedMessage);
    }, 'UPDATE_MESSAGE_FAILED')
  );

  socket.on(
    'message:delete',
    wrapHandler(socket, async ({ id, roomId }) => {
      if (!id || !roomId) {
        emitError(socket, 'INVALID_DATA', 'Thiếu dữ liệu xóa');
        return;
      }
      if (!isValidId(id) || !isValidId(roomId)) {
        emitError(socket, 'INVALID_ID', 'ID tin nhắn hoặc phòng không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }

      const [existingMessage, room] = await Promise.all([
        TinNhan.findById(id).select('nguoiGuiId'),
        PhongChat.findById(roomId).select('thanhVien'),
      ]);

      if (!existingMessage) {
        emitError(socket, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn');
        return;
      }

      const userIsAdmin = isAdmin(room, socket.user.id);
      if (existingMessage.nguoiGuiId.toString() !== socket.user.id && !userIsAdmin) {
        emitError(socket, 'UNAUTHORIZED', 'Không có quyền xóa tin nhắn');
        return;
      }

      const deleted = await deleteMessage(id, socket.user.id, io);
      if (!deleted) {
        emitError(socket, 'DELETE_FAILED', 'Xóa tin nhắn thất bại');
        return;
      }

      io.to(roomId).emit('message:deleted', deleted);
    }, 'DELETE_MESSAGE_FAILED')
  );

  socket.on(
    'message:read',
    wrapHandler(socket, async ({ id, roomId }) => {
      if (!id || !roomId) {
        emitError(socket, 'INVALID_DATA', 'Thiếu dữ liệu đánh dấu đã đọc');
        return;
      }
      if (!isValidId(id) || !isValidId(roomId)) {
        emitError(socket, 'INVALID_ID', 'ID tin nhắn hoặc phòng không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }

      const message = await TinNhan.findByIdAndUpdate(
        id,
        { $addToSet: { daDoc: socket.user.id } },
        { new: true }
      );
      if (!message) {
        emitError(socket, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn');
        return;
      }

      const populatedMessage = await populateMessage(id);
      io.to(roomId).emit('message:read', populatedMessage);
    }, 'READ_MESSAGE_FAILED')
  );

  socket.on(
    'call:create',
    wrapHandler(socket, async ({ roomId, loai, trangThai, thoiLuong, thanhVien }) => {
      if (!roomId || !loai || !thanhVien) {
        emitError(socket, 'INVALID_DATA', 'Thiếu dữ liệu cuộc gọi');
        return;
      }
      if (!isValidId(roomId)) {
        emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải tham gia phòng trước');
        return;
      }

      const message = await createMessage({
        roomId,
        nguoiGuiId: socket.user.id,
        loaiTinNhan: 'cuoc_goi',
        noiDung: `[Cuộc gọi ${loai}]`,
        cuocGoi: {
          trangThai: trangThai || 'ended',
          loai,
          thoiLuong: thoiLuong || 0,
          thanhVien: thanhVien || [],
        },
      });

      const [populatedMessage, room] = await Promise.all([
        TinNhan.findById(message._id)
          .populate('nguoiGuiId', 'hoTen avatar')
          .populate('roomId', 'tenPhong loaiPhong'),
        PhongChat.findById(roomId).select('tenPhong thanhVien'),
      ]);

      await notifyMembers(io, getOtherActiveMembers(room, socket.user.id), {
        loai: 'call',
        noiDung: `Cuộc gọi ${loai} trong phòng ${room.tenPhong || 'chat riêng'}`,
        roomId,
        tinNhanId: message._id,
      });

      io.to(roomId).emit('call:new', populatedMessage);
    }, 'CREATE_CALL_FAILED')
  );
}

export { registerMessageHandlers };
export default { registerMessageHandlers };