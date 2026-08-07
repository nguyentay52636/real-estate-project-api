import PhongChat from '#models/ChatRoom.js';

function createConnectionState(io) {
  const userRooms = new Map();
  const onlineUsers = new Map();
  const activeCalls = new Map();

  const addSocket = (socketId, userId) => {
    const sockets = onlineUsers.get(userId) || new Set();
    sockets.add(socketId);
    onlineUsers.set(userId, sockets);
    userRooms.set(socketId, new Set());
  };

  const setActiveRoom = (socket, roomId) => {
    const prev = userRooms.get(socket.id) || new Set();
    for (const prevRoom of prev) {
      socket.leave(prevRoom);
    }
    socket.join(roomId);
    userRooms.set(socket.id, new Set([roomId]));
  };

  const removeRoom = (socketId, roomId) => {
    const rooms = userRooms.get(socketId);
    if (!rooms) return;
    rooms.delete(roomId);
    if (rooms.size === 0) userRooms.delete(socketId);
  };

  const getRooms = (socketId) => userRooms.get(socketId);

  const setCallSession = (callId, session) => {
    activeCalls.set(callId, { ...session });
    return activeCalls.get(callId);
  };

  const getCallSession = (callId) => activeCalls.get(callId) || null;

  const updateCallSession = (callId, patch) => {
    const prev = activeCalls.get(callId);
    if (!prev) return null;
    const next = { ...prev, ...patch };
    activeCalls.set(callId, next);
    return next;
  };

  const removeCallSession = (callId) => {
    const session = activeCalls.get(callId) || null;
    activeCalls.delete(callId);
    return session;
  };

  const listUserCallSessions = (userId) =>
    Array.from(activeCalls.values()).filter(
      (session) =>
        String(session.callerId) === String(userId) ||
        String(session.calleeId) === String(userId),
    );

  const broadcastUserStatus = async (userId, status) => {
    const rooms = await PhongChat.find(
      { 'thanhVien.nguoiDung': userId, 'thanhVien.trangThai': 'active' },
      { _id: 1 }
    ).lean();

    const payload = { userId, status, timestamp: new Date() };
    for (const room of rooms) {
      io.to(room._id.toString()).emit('userStatus', payload);
      io.to(room._id.toString()).emit('presence:update', {
        userId: String(userId),
        online: status === 'online',
        status,
        timestamp: payload.timestamp,
      });
    }
  };

  const isUserOnline = (userId) => {
    const sockets = onlineUsers.get(String(userId));
    return Boolean(sockets && sockets.size > 0);
  };

  const getOnlineUserIds = () =>
    [...onlineUsers.entries()]
      .filter(([, sockets]) => sockets.size > 0)
      .map(([userId]) => String(userId));

  const handleDisconnect = async (socket) => {
    const rooms = userRooms.get(socket.id);
    if (rooms) {
      const payload = {
        userId: socket.user.id,
        socketId: socket.id,
        timestamp: new Date(),
      };
      for (const roomId of rooms) {
        io.to(roomId).emit('userLeft', { ...payload, roomId });
      }
      userRooms.delete(socket.id);
    }

    const userSockets = onlineUsers.get(socket.user.id);
    if (!userSockets) return;

    userSockets.delete(socket.id);
    if (userSockets.size === 0) {
      for (const session of listUserCallSessions(socket.user.id)) {
        activeCalls.delete(session.callId);
      }
      onlineUsers.delete(socket.user.id);
      await broadcastUserStatus(socket.user.id, 'offline');
    } else {
      onlineUsers.set(socket.user.id, userSockets);
    }
  };

  return {
    addSocket,
    setActiveRoom,
    removeRoom,
    getRooms,
    setCallSession,
    getCallSession,
    updateCallSession,
    removeCallSession,
    listUserCallSessions,
    broadcastUserStatus,
    isUserOnline,
    getOnlineUserIds,
    handleDisconnect,
  };
}

export { createConnectionState };
export default { createConnectionState };