import NguoiDung from '#models/User.js';
import logger from '#shared/utils/logger.js';
import { getPendingTickets, STAFF_ROLE_NAMES } from '#modules/ai/services/handoffService.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerMessageHandlers } from './messageHandlers.js';
import { registerMemberHandlers } from './memberHandlers.js';
import { registerHandoffHandlers } from './handoffHandlers.js';

async function onConnection(socket, io, state) {
  logger.debug(`Socket connected: ${socket.user.id} (${socket.id})`);

  // QUAN TRỌNG: đăng ký handler + join room cá nhân NGAY (đồng bộ), trước bất kỳ
  // await nào. io.on('connection') ở SocketServer.js không await hàm này, nên nếu
  // phần đăng ký bị đẩy xuống sau một await, những sự kiện client gửi ngay sau khi
  // connect (joinRoom, message:create — đúng như useChatSocket phía client vẫn làm)
  // có thể tới server TRƯỚC KHI các socket.on(...) này được gọi và bị rơi mất lặng
  // lẽ (không lỗi, không ack). Đây chính là nguyên nhân chat "không realtime", phải
  // load lại mới thấy tin nhắn mới.
  socket.join(socket.user.id);
  state.addSocket(socket.id, socket.user.id);

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

  // Phần còn lại phụ thuộc DB (vai trò, staff_online, ticket chờ, trạng thái online)
  // — chạy sau, không chặn việc socket nhận sự kiện.
  const currentUser = await NguoiDung.findById(socket.user.id)
    .populate('vaiTro', 'ten')
    .select('vaiTro')
    .lean();

  socket.user.vaiTroTen = currentUser?.vaiTro?.ten || null;

  if (STAFF_ROLE_NAMES.includes(socket.user.vaiTroTen)) {
    socket.join('staff_online');
    const pendingTickets = await getPendingTickets(socket.user.id);
    socket.emit('handoff:pendingList', {
      tickets: pendingTickets,
      timestamp: new Date().toISOString(),
    });
  }

  state.broadcastUserStatus(socket.user.id, 'online');
}

export { onConnection };
export default { onConnection };