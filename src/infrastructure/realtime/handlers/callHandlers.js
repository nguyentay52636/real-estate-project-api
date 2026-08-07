import PhongChat from '#models/ChatRoom.js';
import messageService from '#modules/chat/services/messageService.js';
import { getIceServers } from '#modules/chat/utils/webrtcIce.js';
import { emitError, getRoomOrError, isActiveMember, isValidId, wrapHandler } from '../helpers/socketHelpers.js';

const CALL_STATUSES = new Set(['missed', 'ended', 'declined']);

function memberUserId(member) {
  const raw = member?.nguoiDung;
  if (!raw) return '';
  if (typeof raw === 'object' && raw !== null && raw._id != null) {
    return String(raw._id);
  }
  return String(raw);
}

async function emitCallLog(io, roomId, message) {
  if (!message) return;
  io.to(roomId).emit('call:new', message);

  const room = await PhongChat.findById(roomId).select('thanhVien');
  if (!room?.thanhVien?.length) return;

  for (const member of room.thanhVien) {
    if (member.trangThai !== 'active') continue;
    const uid = memberUserId(member);
    if (uid) io.to(uid).emit('call:new', message);
  }
}

async function persistCallLog(io, session, actorUserId, reason, durationSec = 0) {
  if (!session || session.loggedAt) return session;

  const status = CALL_STATUSES.has(reason) ? reason : 'ended';
  const message = await messageService.createCallMessage(
    {
      roomId: session.roomId,
      loai: session.loai || 'video',
      trangThai: status,
      thoiLuong: durationSec || 0,
      thanhVien: [session.callerId, session.calleeId].filter(Boolean),
    },
    actorUserId,
  );
  await emitCallLog(io, session.roomId, message);
  return { ...session, loggedAt: new Date().toISOString() };
}

function registerCallHandlers(socket, io, state) {
  socket.on(
    'call:invite',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, loai, fromName }) => {
      if (!callId || !roomId || !targetUserId || !loai) {
        emitError(socket, 'INVALID_CALL_DATA', 'Thiếu dữ liệu cuộc gọi');
        return;
      }
      if (!isValidId(roomId) || !isValidId(targetUserId)) {
        emitError(socket, 'INVALID_ID', 'ID phòng hoặc người nhận không hợp lệ');
        return;
      }

      const room = await getRoomOrError(socket, roomId);
      if (!room) return;
      if (!isActiveMember(room, socket.user.id)) {
        emitError(socket, 'NOT_IN_ROOM', 'Bạn không thuộc phòng chat này');
        return;
      }

      const targetMember = room.thanhVien.find(
        (member) =>
          memberUserId(member) === String(targetUserId) && member.trangThai === 'active',
      );
      if (!targetMember) {
        emitError(socket, 'TARGET_NOT_IN_ROOM', 'Người nhận không còn trong phòng chat');
        return;
      }

      state.setCallSession(callId, {
        callId,
        roomId,
        callerId: socket.user.id,
        calleeId: String(targetUserId),
        loai,
        status: 'ringing',
        startedAt: new Date().toISOString(),
      });

      io.to(String(targetUserId)).emit('call:invite', {
        callId,
        roomId,
        fromUserId: socket.user.id,
        fromName,
        loai,
        boiCanh: room.boiCanh,
        loaiPhong: room.loaiPhong,
        iceServers: getIceServers().iceServers,
      });
      socket.emit('call:ringing', {
        callId,
        roomId,
        targetUserId,
        iceServers: getIceServers().iceServers,
        hasTurn: getIceServers().hasTurn,
      });
    }, 'CALL_INVITE_FAILED'),
  );

  socket.on(
    'call:accept',
    wrapHandler(socket, async ({ callId, roomId, targetUserId }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }
      if (String(session.calleeId) !== String(socket.user.id)) {
        emitError(socket, 'UNAUTHORIZED', 'Bạn không có quyền nhận cuộc gọi này');
        return;
      }

      state.updateCallSession(callId, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      io.to(String(targetUserId || session.callerId)).emit('call:accept', {
        callId,
        roomId,
        fromUserId: socket.user.id,
      });
    }, 'CALL_ACCEPT_FAILED'),
  );

  socket.on(
    'call:reject',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, reason = 'declined' }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }

      const logged = await persistCallLog(io, session, socket.user.id, reason, 0);
      state.removeCallSession(callId);
      io.to(String(targetUserId || session.callerId)).emit('call:reject', {
        callId,
        roomId,
        reason,
      });
      return logged;
    }, 'CALL_REJECT_FAILED'),
  );

  socket.on(
    'call:end',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, reason = 'ended', durationSec = 0 }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }

      const logged = await persistCallLog(io, session, socket.user.id, reason, durationSec);
      state.removeCallSession(callId);
      io.to(String(targetUserId || session.callerId)).emit('call:end', {
        callId,
        roomId,
        reason,
        durationSec,
      });
      return logged;
    }, 'CALL_END_FAILED'),
  );

  socket.on(
    'webrtc:offer',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, sdp }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }
      io.to(String(targetUserId || session.calleeId)).emit('webrtc:offer', {
        callId,
        roomId,
        fromUserId: socket.user.id,
        sdp,
      });
    }, 'WEBRTC_OFFER_FAILED'),
  );

  socket.on(
    'webrtc:answer',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, sdp }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }
      io.to(String(targetUserId || session.callerId)).emit('webrtc:answer', {
        callId,
        roomId,
        fromUserId: socket.user.id,
        sdp,
      });
    }, 'WEBRTC_ANSWER_FAILED'),
  );

  socket.on(
    'webrtc:ice-candidate',
    wrapHandler(socket, async ({ callId, roomId, targetUserId, candidate }) => {
      const session = state.getCallSession(callId);
      if (!session || session.roomId !== roomId) {
        emitError(socket, 'CALL_NOT_FOUND', 'Không tìm thấy cuộc gọi');
        return;
      }
      io.to(String(targetUserId)).emit('webrtc:ice-candidate', {
        callId,
        roomId,
        fromUserId: socket.user.id,
        candidate,
      });
    }, 'WEBRTC_ICE_FAILED'),
  );
}

export { registerCallHandlers };
export default { registerCallHandlers };
