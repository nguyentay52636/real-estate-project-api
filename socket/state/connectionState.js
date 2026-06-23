const PhongChat = require('../../models/PhongChat');

function createConnectionState(io) {
  const userRooms = new Map();
  const onlineUsers = new Map();

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

  const broadcastUserStatus = async (userId, status) => {
    const rooms = await PhongChat.find(
      { 'thanhVien.nguoiDung': userId, 'thanhVien.trangThai': 'active' },
      { _id: 1 }
    ).lean();

    const payload = { userId, status, timestamp: new Date() };
    for (const room of rooms) {
      io.to(room._id.toString()).emit('userStatus', payload);
    }
  };

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
    broadcastUserStatus,
    handleDisconnect,
  };
}

module.exports = { createConnectionState };
