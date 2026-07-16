import { acceptHandoffTicket,
  getPendingTickets,
  isNhanVien, } from '#modules/ai/services/handoffService.js';
import { emitError, wrapHandler } from '../helpers/socketHelpers.js';

function registerHandoffHandlers(socket) {
  socket.on('handoff:join', ({ handoffToken }) => {
    if (!handoffToken) {
      emitError(socket, 'INVALID_DATA', 'handoffToken là bắt buộc');
      return;
    }
    socket.join(`handoff:${handoffToken}`);
    socket.emit('handoff:joined', { handoffToken, timestamp: new Date() });
  });

  socket.on(
    'handoff:accept',
    wrapHandler(socket, async ({ handoffToken }) => {
      if (!handoffToken) {
        emitError(socket, 'INVALID_DATA', 'handoffToken là bắt buộc');
        return;
      }

      const agentIsNhanVien = await isNhanVien(socket.user.id);
      if (!agentIsNhanVien) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ nhân viên mới có thể nhận ticket');
        return;
      }

      const result = await acceptHandoffTicket(handoffToken, socket.user.id);
      socket.emit('handoff:acceptSuccess', result);
    }, 'HANDOFF_ACCEPT_FAILED')
  );

  socket.on(
    'handoff:list',
    wrapHandler(socket, async () => {
      const agentIsNhanVien = await isNhanVien(socket.user.id);
      if (!agentIsNhanVien) {
        emitError(socket, 'UNAUTHORIZED', 'Chỉ nhân viên mới xem được danh sách ticket');
        return;
      }

      const tickets = await getPendingTickets(socket.user.id);
      socket.emit('handoff:pendingList', { tickets, timestamp: new Date().toISOString() });
    }, 'HANDOFF_LIST_FAILED')
  );
}

export { registerHandoffHandlers };
export default { registerHandoffHandlers };