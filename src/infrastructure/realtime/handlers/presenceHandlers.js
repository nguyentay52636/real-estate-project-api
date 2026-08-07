import PhongChat from '#models/ChatRoom.js';
import {
  emitError,
  isValidId,
  isActiveMember,
  wrapHandler,
} from '../helpers/socketHelpers.js';

/**
 * Typing + online presence (socket).
 * In:  typing:start | typing:stop | presence:query | presence:room
 * Out: typing | presence:state
 */
function registerPresenceHandlers(socket, io, state) {
  socket.on(
    'typing:start',
    wrapHandler(socket, async ({ roomId } = {}) => {
      if (!isValidId(roomId)) {
        emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
        return;
      }
      if (!socket.rooms.has(roomId)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn phải joinRoom trước khi báo typing');
        return;
      }

      const room = await PhongChat.findById(roomId).select('thanhVien');
      if (!room || !isActiveMember(room, socket.user.id)) return;

      socket.to(roomId).emit('typing', {
        roomId,
        userId: socket.user.id,
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }, 'TYPING_FAILED'),
  );

  socket.on(
    'typing:stop',
    wrapHandler(socket, async ({ roomId } = {}) => {
      if (!isValidId(roomId) || !socket.rooms.has(roomId)) return;

      socket.to(roomId).emit('typing', {
        roomId,
        userId: socket.user.id,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });
    }, 'TYPING_FAILED'),
  );

  /** Hỏi online theo danh sách userId (tối đa 100). */
  socket.on(
    'presence:query',
    wrapHandler(socket, async ({ userIds } = {}) => {
      const ids = Array.isArray(userIds) ? userIds.map(String).filter(Boolean) : [];
      if (!ids.length) {
        emitError(socket, 'INVALID_DATA', 'Thiếu userIds');
        return;
      }
      const users = ids.slice(0, 100).map((userId) => ({
        userId,
        online: state.isUserOnline(userId),
      }));
      socket.emit('presence:state', {
        users,
        timestamp: new Date().toISOString(),
      });
    }, 'PRESENCE_QUERY_FAILED'),
  );

  /** Online trong 1 phòng — cần là thành viên active. */
  socket.on(
    'presence:room',
    wrapHandler(socket, async ({ roomId } = {}) => {
      if (!isValidId(roomId)) {
        emitError(socket, 'INVALID_ROOM_ID', 'ID phòng chat không hợp lệ');
        return;
      }

      const room = await PhongChat.findById(roomId).select('thanhVien');
      if (!room) {
        emitError(socket, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chat');
        return;
      }
      if (!isActiveMember(room, socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Không có quyền xem phòng này');
        return;
      }

      const memberIds = room.thanhVien
        .filter((m) => m.trangThai === 'active')
        .map((m) => String(m.nguoiDung));

      const onlineUserIds = memberIds.filter((id) => state.isUserOnline(id));

      socket.emit('presence:state', {
        roomId,
        users: memberIds.map((userId) => ({
          userId,
          online: state.isUserOnline(userId),
        })),
        onlineUserIds,
        timestamp: new Date().toISOString(),
      });
    }, 'PRESENCE_ROOM_FAILED'),
  );
}

export { registerPresenceHandlers };
export default { registerPresenceHandlers };
