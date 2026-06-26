import PhongChat from '../../models/ChatRoom.js';
import TinNhan from '../../models/Message.js';
import { emitError,
  isValidId,
  isActiveMember,
  isAdmin,
  getOtherActiveMembers,
  getRoomOrError,
  notifyMembers,
  createSystemMessage,
  populateRoom,
  wrapHandler, } from '../helpers/socketHelpers.js';

function registerRoomHandlers(socket, io, state) {
  socket.on(
    'joinRoom',
    wrapHandler(socket, async (roomId) => {
      if (!isValidId(roomId)) {
        emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
        return;
      }

      const room = await PhongChat.findById(roomId);
      if (!room) {
        emitError(socket, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chat');
        return;
      }
      if (!isActiveMember(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Không có quyền truy cập phòng này');
        return;
      }

      state.setActiveRoom(socket, roomId);

      socket.emit('joinedRoom', {
        roomId,
        message: 'Tham gia phòng thành công',
        timestamp: new Date(),
        socketId: socket.id,
      });

      io.to(roomId).emit('userJoined', {
        userId: socket.user.id,
        socketId: socket.id,
        roomId,
        timestamp: new Date(),
      });

      const roomSockets = await io.in(roomId).fetchSockets();
      const onlineUserIds = [
        ...new Set(roomSockets.map((s) => s.user?.id).filter(Boolean)),
      ];
      io.to(roomId).emit('roomUsers', {
        roomId,
        onlineUsers: onlineUserIds,
        timestamp: new Date(),
      });
    }, 'SERVER_ERROR')
  );

  socket.on(
    'room:create',
    wrapHandler(socket, async ({ tenPhong, loaiPhong, thanhVien, nguoiTao, anhDaiDien }) => {
      if (!loaiPhong || !thanhVien?.length || !nguoiTao) {
        emitError(socket, 'INVALID_DATA', 'Thiếu thông tin phòng chat');
        return;
      }

      const newRoom = await PhongChat.create({
        tenPhong,
        loaiPhong,
        thanhVien,
        nguoiTao,
        anhDaiDien,
        tinNhan: [],
        tinNhanGhim: [],
      });

      await createSystemMessage(
        newRoom._id,
        nguoiTao,
        `Phòng chat ${loaiPhong === 'group' ? tenPhong : 'riêng'} đã được tạo`
      );

      const otherMembers = thanhVien.filter((m) => m.nguoiDung.toString() !== nguoiTao);
      await notifyMembers(
        io,
        otherMembers,
        {
          loai: 'room_update',
          noiDung: `Bạn đã được thêm vào phòng ${tenPhong || 'chat riêng'}`,
          roomId: newRoom._id,
        }
      );

      const populatedRoom = await populateRoom(newRoom._id, ['tinNhanCuoi']);
      io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
      socket.emit('roomCreated', populatedRoom);
    }, 'CREATE_ROOM_FAILED')
  );

  socket.on(
    'room:findOrCreatePrivate',
    wrapHandler(socket, async ({ userId1, userId2 }) => {
      if (!userId1 || !userId2) {
        emitError(socket, 'INVALID_DATA', 'Thiếu thông tin userId1 hoặc userId2');
        return;
      }
      if (userId1 === userId2) {
        emitError(socket, 'INVALID_DATA', 'Không thể tạo phòng chat với chính mình');
        return;
      }

      const existingRoom = await PhongChat.findOne({
        loaiPhong: 'private',
        'thanhVien.nguoiDung': { $all: [userId1, userId2] },
        'thanhVien.trangThai': 'active',
        $expr: { $eq: [{ $size: '$thanhVien' }, 2] },
      })
        .populate('thanhVien.nguoiDung', 'hoTen avatar')
        .populate('nguoiTao', 'hoTen avatar')
        .populate({
          path: 'tinNhan',
          populate: { path: 'nguoiGuiId', select: 'hoTen avatar' },
          options: { sort: { createdAt: 1 } },
        });

      if (existingRoom) {
        socket.emit('roomFound', {
          room: existingRoom,
          isNewRoom: false,
          message: 'Phòng chat đã tồn tại',
        });
        return;
      }

      const newRoom = await PhongChat.create({
        tenPhong: `Chat ${userId1} - ${userId2}`,
        loaiPhong: 'private',
        thanhVien: [
          { nguoiDung: userId1, vaiTro: 'member' },
          { nguoiDung: userId2, vaiTro: 'member' },
        ],
        nguoiTao: userId1,
        anhDaiDien: '',
        tinNhan: [],
        tinNhanGhim: [],
      });

      await createSystemMessage(newRoom._id, userId1, 'Phòng chat riêng đã được tạo');

      await notifyMembers(io, [{ nguoiDung: userId2 }], {
        loai: 'room_update',
        noiDung: `Bạn đã được thêm vào phòng chat riêng với ${userId1}`,
        roomId: newRoom._id,
      });

      const populatedRoom = await populateRoom(newRoom._id, ['tinNhanCuoi']);
      io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
      socket.emit('roomCreated', {
        room: populatedRoom,
        isNewRoom: true,
        message: 'Tạo phòng chat mới thành công',
      });
    }, 'CREATE_PRIVATE_ROOM_FAILED')
  );

  socket.on(
    'room:update',
    wrapHandler(socket, async ({ roomId, tenPhong, anhDaiDien, thanhVien }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;
      if (!isAdmin(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ admin mới có thể cập nhật phòng chat');
        return;
      }

      const updateData = {};
      if (tenPhong) updateData.tenPhong = tenPhong;
      if (anhDaiDien) updateData.anhDaiDien = anhDaiDien;
      if (thanhVien) updateData.thanhVien = thanhVien;

      if (Object.keys(updateData).length === 0) {
        socket.emit('roomUpdated', room);
        return;
      }

      const updatedRoom = await PhongChat.findByIdAndUpdate(roomId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('thanhVien.nguoiDung', 'hoTen avatar')
        .populate('nguoiTao', 'hoTen avatar');

      await createSystemMessage(roomId, socket.user.id, 'Thông tin phòng chat đã được cập nhật');

      await notifyMembers(io, getOtherActiveMembers(updatedRoom, socket.user.id), {
        loai: 'room_update',
        noiDung: `Phòng ${tenPhong || 'chat riêng'} đã được cập nhật`,
        roomId,
      });

      io.to(roomId).emit('roomUpdated', updatedRoom);
      socket.emit('roomUpdated', updatedRoom);
    }, 'UPDATE_ROOM_FAILED')
  );

  socket.on(
    'room:delete',
    wrapHandler(socket, async ({ roomId }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;
      if (!isAdmin(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ admin mới có thể xóa phòng chat');
        return;
      }

      const otherMembers = getOtherActiveMembers(room, socket.user.id);
      await Promise.all([
        TinNhan.deleteMany({ roomId }),
        PhongChat.findByIdAndDelete(roomId),
      ]);

      await notifyMembers(io, otherMembers, {
        loai: 'room_update',
        noiDung: `Phòng ${room.tenPhong || 'chat riêng'} đã bị xóa`,
        roomId,
      });

      io.to(roomId).emit('roomDeleted', { roomId });
      socket.emit('roomDeleted', { message: 'Xóa phòng thành công' });
    }, 'DELETE_ROOM_FAILED')
  );
}

export { registerRoomHandlers };
export default { registerRoomHandlers };