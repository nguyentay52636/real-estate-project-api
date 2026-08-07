import PhongChat from '#models/ChatRoom.js';
import TinNhan from '#models/Message.js';
import {
  resolvePrivateChatOtherId,
  resolveBoiCanhForPrivate,
  assertCanDeleteOrDisbandRoom,
} from '#modules/chat/utils/roomAccess.js';
import {
  emitError,
  ensureSocketStaff,
  ensureSocketAdmin,
  isValidId,
  isActiveMember,
  isAdmin,
  getOtherActiveMembers,
  getRoomOrError,
  notifyMembers,
  createSystemMessage,
  populateRoom,
  wrapHandler,
} from '../helpers/socketHelpers.js';

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

      const staffOk = await ensureSocketStaff(socket);
      if (!isActiveMember(room, socket.user.id) && !staffOk) {
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
    }, 'SERVER_ERROR'),
  );

  socket.on(
    'room:create',
    wrapHandler(socket, async ({ tenPhong, loaiPhong, thanhVien, anhDaiDien, boiCanh }) => {
      const nguoiTao = socket.user.id;
      if (!loaiPhong || !thanhVien?.length) {
        emitError(socket, 'INVALID_DATA', 'Thiếu thông tin phòng chat');
        return;
      }

      const members = thanhVien.map((m) => ({
        nguoiDung: m.nguoiDung,
        vaiTro: m.vaiTro || 'member',
        trangThai: m.trangThai || 'active',
      }));
      if (!members.some((m) => String(m.nguoiDung) === String(nguoiTao))) {
        members.push({
          nguoiDung: nguoiTao,
          vaiTro: loaiPhong === 'group' ? 'admin' : 'member',
        });
      }

      const newRoom = await PhongChat.create({
        tenPhong,
        loaiPhong,
        thanhVien: members,
        nguoiTao,
        anhDaiDien: anhDaiDien || '',
        boiCanh: boiCanh === 'noi_bo' ? 'noi_bo' : 'ho_tro_khach',
        tinNhan: [],
      });

      await createSystemMessage(
        newRoom._id,
        nguoiTao,
        `Phòng chat ${loaiPhong === 'group' ? tenPhong : 'riêng'} đã được tạo`,
      );

      const otherMembers = members.filter((m) => m.nguoiDung.toString() !== nguoiTao);
      await notifyMembers(io, otherMembers, {
        loai: 'room_update',
        noiDung: `Bạn đã được thêm vào phòng ${tenPhong || 'chat riêng'}`,
        roomId: newRoom._id,
      });

      const populatedRoom = await populateRoom(newRoom._id, ['tinNhanCuoi']);
      io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
      socket.emit('roomCreated', populatedRoom);
    }, 'CREATE_ROOM_FAILED'),
  );

  socket.on(
    'room:findOrCreatePrivate',
    wrapHandler(socket, async (payload = {}) => {
      const actorId = socket.user.id;
      let otherId;
      try {
        otherId = resolvePrivateChatOtherId(actorId, payload);
      } catch (err) {
        emitError(socket, 'INVALID_DATA', err.message || 'Thiếu thông tin đối phương');
        return;
      }

      const boiCanhPhong = await resolveBoiCanhForPrivate(actorId, otherId, payload.boiCanh);

      const existingRoom = await PhongChat.findOne({
        loaiPhong: 'private',
        boiCanh: boiCanhPhong,
        thanhVien: { $size: 2 },
        $and: [
          { thanhVien: { $elemMatch: { nguoiDung: actorId, trangThai: 'active' } } },
          { thanhVien: { $elemMatch: { nguoiDung: otherId, trangThai: 'active' } } },
        ],
      })
        .populate('thanhVien.nguoiDung', 'ten anhDaiDien')
        .populate('nguoiTao', 'ten anhDaiDien')
        .populate({
          path: 'tinNhanCuoi',
          populate: { path: 'nguoiGuiId', select: 'ten anhDaiDien' },
        });

      if (existingRoom) {
        socket.emit('roomFound', {
          room: existingRoom,
          isNewRoom: false,
          message: 'Phòng chat đã tồn tại',
          boiCanh: boiCanhPhong,
        });
        return;
      }

      const newRoom = await PhongChat.create({
        tenPhong: `Chat ${actorId} - ${otherId}`,
        loaiPhong: 'private',
        boiCanh: boiCanhPhong,
        thanhVien: [
          { nguoiDung: actorId, vaiTro: 'member' },
          { nguoiDung: otherId, vaiTro: 'member' },
        ],
        nguoiTao: actorId,
        anhDaiDien: '',
        tinNhan: [],
      });

      await createSystemMessage(newRoom._id, actorId, 'Phòng chat riêng đã được tạo');

      await notifyMembers(io, [{ nguoiDung: otherId }], {
        loai: 'room_update',
        noiDung:
          boiCanhPhong === 'noi_bo'
            ? 'Bạn có cuộc trò chuyện nội bộ mới'
            : 'Bạn có cuộc trò chuyện mới',
        roomId: newRoom._id,
      });

      const populatedRoom = await populateRoom(newRoom._id, ['tinNhanCuoi']);
      io.to(newRoom._id.toString()).emit('roomCreated', populatedRoom);
      io.to(String(otherId)).emit('roomCreated', {
        room: populatedRoom,
        isNewRoom: true,
        message: 'Tạo phòng chat mới thành công',
        boiCanh: boiCanhPhong,
      });
      socket.emit('roomCreated', {
        room: populatedRoom,
        isNewRoom: true,
        message: 'Tạo phòng chat mới thành công',
        boiCanh: boiCanhPhong,
      });
    }, 'CREATE_PRIVATE_ROOM_FAILED'),
  );

  socket.on(
    'room:update',
    wrapHandler(socket, async ({ roomId, tenPhong, anhDaiDien, thanhVien }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;
      if (!isAdmin(room, socket.user.id) && !(await ensureSocketStaff(socket))) {
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
        .populate('thanhVien.nguoiDung', 'ten anhDaiDien')
        .populate('nguoiTao', 'ten anhDaiDien');

      await createSystemMessage(roomId, socket.user.id, 'Thông tin phòng chat đã được cập nhật');

      await notifyMembers(io, getOtherActiveMembers(updatedRoom, socket.user.id), {
        loai: 'room_update',
        noiDung: `Phòng ${tenPhong || 'chat riêng'} đã được cập nhật`,
        roomId,
      });

      io.to(roomId).emit('roomUpdated', updatedRoom);
      socket.emit('roomUpdated', updatedRoom);
    }, 'UPDATE_ROOM_FAILED'),
  );

  socket.on(
    'room:delete',
    wrapHandler(socket, async ({ roomId }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;

      try {
        assertCanDeleteOrDisbandRoom(room, socket.user.id, {
          isAdmin: await ensureSocketAdmin(socket),
        });
      } catch (err) {
        emitError(socket, 'UNAUTHORIZED', err.message || 'Không có quyền xóa phòng');
        return;
      }

      const otherMembers = getOtherActiveMembers(room, socket.user.id);
      await Promise.all([
        TinNhan.deleteMany({ roomId }),
        PhongChat.findByIdAndDelete(roomId),
      ]);

      await notifyMembers(io, otherMembers, {
        loai: 'room_update',
        noiDung:
          room.loaiPhong === 'group'
            ? `Nhóm ${room.tenPhong || 'chat'} đã bị giải tán`
            : `Cuộc trò chuyện đã bị xóa bởi quản trị viên`,
        roomId,
      });

      io.to(roomId).emit('roomDeleted', {
        roomId,
        reason: room.loaiPhong === 'group' ? 'disbanded' : 'deleted',
      });
      socket.emit('roomDeleted', {
        message:
          room.loaiPhong === 'group'
            ? 'Giải tán nhóm thành công'
            : 'Xóa cuộc trò chuyện thành công',
      });
    }, 'DELETE_ROOM_FAILED'),
  );

  socket.on(
    'room:disband',
    wrapHandler(socket, async ({ roomId }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;
      if (room.loaiPhong !== 'group') {
        emitError(socket, 'INVALID_DATA', 'Chỉ giải tán được phòng nhóm');
        return;
      }

      try {
        assertCanDeleteOrDisbandRoom(room, socket.user.id, {
          isAdmin: await ensureSocketAdmin(socket),
        });
      } catch (err) {
        emitError(socket, 'UNAUTHORIZED', err.message || 'Không có quyền giải tán nhóm');
        return;
      }

      const otherMembers = getOtherActiveMembers(room, socket.user.id);
      await Promise.all([
        TinNhan.deleteMany({ roomId }),
        PhongChat.findByIdAndDelete(roomId),
      ]);

      await notifyMembers(io, otherMembers, {
        loai: 'room_update',
        noiDung: `Nhóm ${room.tenPhong || 'chat'} đã bị giải tán`,
        roomId,
      });

      io.to(roomId).emit('roomDeleted', { roomId, reason: 'disbanded' });
      socket.emit('roomDeleted', { message: 'Giải tán nhóm thành công' });
    }, 'DISBAND_GROUP_FAILED'),
  );
}

export { registerRoomHandlers };
export default { registerRoomHandlers };
