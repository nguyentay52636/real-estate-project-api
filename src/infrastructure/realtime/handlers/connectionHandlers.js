import NguoiDung from '#models/User.js';
import logger from '#shared/utils/logger.js';
import { getPendingTickets } from '#modules/ai/services/handoffService.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerMessageHandlers } from './messageHandlers.js';
import { registerMemberHandlers } from './memberHandlers.js';
import { registerHandoffHandlers } from './handoffHandlers.js';

async function onConnection(socket, io, state) {
  logger.debug(`Socket connected: ${socket.user.id} (${socket.id})`);

  const currentUser = await NguoiDung.findById(socket.user.id)
    .populate('vaiTro', 'ten')
    .select('vaiTro')
    .lean();

  socket.user.vaiTroTen = currentUser?.vaiTro?.ten || null;

  socket.join(socket.user.id);
  state.addSocket(socket.id, socket.user.id);

  if (socket.user.vaiTroTen === 'nhan_vien') {
    socket.join('nhan_vien_online');
    const pendingTickets = await getPendingTickets(socket.user.id);
    socket.emit('handoff:pendingList', {
      tickets: pendingTickets,
      timestamp: new Date().toISOString(),
    });
  }

  state.broadcastUserStatus(socket.user.id, 'online');

  registerRoomHandlers(socket, io, state);
  registerMessageHandlers(socket, io);
  registerMemberHandlers(socket, io, state);
  registerHandoffHandlers(socket);

  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date(),
      socketId: socket.id,
      userId: socket.user.id,
    });
  });

  socket.on('disconnect', async (reason) => {
    logger.debug(`Socket disconnected: ${socket.user.id} (${reason})`);
    await state.handleDisconnect(socket);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error ${socket.id}, user ${socket.user.id}:`, error);
  });
}

export { onConnection };
export default { onConnection };