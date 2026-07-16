import PhongChat from '#models/ChatRoom.js';
import { emitError,
  isValidId,
  isAdmin,
  getOtherActiveMembers,
  getRoomOrError,
  notifyMembers,
  createSystemMessage,
  populateRoom,
  wrapHandler, } from '../helpers/socketHelpers.js';

function registerMemberHandlers(socket, io, state) {
  socket.on(
    'addMember',
    wrapHandler(socket, async ({ roomId, newMemberId }) => {
      if (!isValidId(roomId) || !isValidId(newMemberId)) {
        emitError(socket, 'INVALID_ID', 'ID phòng hoặc thành viên không hợp lệ');
        return;
      }

      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;

      if (room.loaiPhong !== 'group') {
        emitError(socket, 'INVALID_ROOM_TYPE', 'Chỉ có thể thêm thành viên vào phòng nhóm');
        return;
      }
      if (!isAdmin(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ admin mới có thể thêm thành viên');
        return;
      }

      const existingMember = room.thanhVien.find((m) => m.nguoiDung.toString() === newMemberId);
      if (existingMember?.trangThai === 'active') {
        emitError(socket, 'MEMBER_EXISTS', 'Người dùng đã là thành viên của phòng');
        return;
      }

      if (existingMember?.trangThai === 'left') {
        existingMember.trangThai = 'active';
        existingMember.thoiGianThamGia = new Date();
      } else {
        room.thanhVien.push({ nguoiDung: newMemberId, vaiTro: 'member', trangThai: 'active' });
      }
      await room.save();

      await createSystemMessage(
        roomId,
        socket.user.id,
        `Người dùng ${newMemberId} đã được thêm vào phòng`
      );

      await notifyMembers(io, [{ nguoiDung: newMemberId }], {
        loai: 'room_update',
        noiDung: `Bạn đã được thêm vào phòng ${room.tenPhong}`,
        roomId,
      });

      const updatedRoom = await populateRoom(roomId);
      io.to(roomId).emit('memberAdded', { roomId, newMemberId, room: updatedRoom });
      socket.emit('memberAdded', { message: 'Thêm thành viên thành công', room: updatedRoom });
    }, 'ADD_MEMBER_FAILED')
  );

  socket.on(
    'leaveRoom',
    wrapHandler(socket, async ({ roomId }) => {
      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;

      if (room.loaiPhong !== 'group') {
        emitError(socket, 'INVALID_ROOM_TYPE', 'Chỉ có thể rời khỏi phòng nhóm');
        return;
      }

      const member = room.thanhVien.find((m) => m.nguoiDung.toString() === socket.user.id);
      if (!member || member.trangThai !== 'active') {
        emitError(socket, 'UNAUTHORIZED', 'Bạn không phải thành viên active của phòng');
        return;
      }
      if (member.vaiTro === 'admin') {
        emitError(socket, 'UNAUTHORIZED', 'Admin không thể rời phòng, hãy chuyển quyền admin trước');
        return;
      }

      member.trangThai = 'left';
      await room.save();

      await createSystemMessage(
        roomId,
        socket.user.id,
        `Người dùng ${socket.user.id} đã rời phòng`
      );

      await notifyMembers(io, getOtherActiveMembers(room, socket.user.id), {
        loai: 'room_update',
        noiDung: `Người dùng ${socket.user.id} đã rời phòng ${room.tenPhong}`,
        roomId,
      });

      socket.leave(roomId);
      state.removeRoom(socket.id, roomId);

      io.to(roomId).emit('memberLeft', { roomId, userId: socket.user.id });
      socket.emit('memberLeft', { message: 'Rời phòng thành công' });
    }, 'LEAVE_ROOM_FAILED')
  );

  socket.on(
    'transferAdmin',
    wrapHandler(socket, async ({ roomId, newAdminId }) => {
      if (!isValidId(roomId) || !isValidId(newAdminId)) {
        emitError(socket, 'INVALID_ID', 'ID phòng hoặc admin mới không hợp lệ');
        return;
      }

      const room = await getRoomOrError(socket, roomId, { requireInSocketRoom: true });
      if (!room) return;

      if (room.loaiPhong !== 'group') {
        emitError(socket, 'INVALID_ROOM_TYPE', 'Chỉ có thể chuyển quyền admin trong phòng nhóm');
        return;
      }

      const currentAdmin = room.thanhVien.find((m) => m.nguoiDung.toString() === socket.user.id);
      if (!currentAdmin || currentAdmin.vaiTro !== 'admin') {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ admin hiện tại mới có thể chuyển quyền');
        return;
      }

      const newAdmin = room.thanhVien.find(
        (m) => m.nguoiDung.toString() === newAdminId && m.trangThai === 'active'
      );
      if (!newAdmin) {
        emitError(socket, 'INVALID_MEMBER', 'Người dùng không hợp lệ hoặc không phải thành viên active');
        return;
      }

      currentAdmin.vaiTro = 'member';
      newAdmin.vaiTro = 'admin';
      await room.save();

      await createSystemMessage(
        roomId,
        socket.user.id,
        `Quyền admin đã được chuyển cho người dùng ${newAdminId}`
      );

      await notifyMembers(io, getOtherActiveMembers(room, socket.user.id), {
        loai: 'room_update',
        noiDung: `Người dùng ${newAdminId} đã trở thành admin của phòng ${room.tenPhong}`,
        roomId,
      });

      const updatedRoom = await populateRoom(roomId);
      io.to(roomId).emit('adminTransferred', { roomId, newAdminId, room: updatedRoom });
      socket.emit('adminTransferred', {
        message: 'Chuyển quyền admin thành công',
        room: updatedRoom,
      });
    }, 'TRANSFER_ADMIN_FAILED')
  );
}

export { registerMemberHandlers };
export default { registerMemberHandlers };