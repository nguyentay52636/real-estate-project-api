import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import { setIO } from './ioInstance.js';
import { socketConfig } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { createConnectionState } from './state/connectionState.js';
import { onConnection } from './handlers/connectionHandlers.js';

const setupSocket = (server) => {
  const io = new Server(server, socketConfig);
  const state = createConnectionState(io);

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    onConnection(socket, io, state).catch((error) => {
      logger.error(`Socket connection setup failed for ${socket.id}:`, error.message);
      socket.emit('error', { code: 'CONNECTION_SETUP_FAILED', message: error.message });
      socket.disconnect(true);
    });
  });

  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err.message);
  });

  logger.info('Socket.IO server configured');
  setIO(io);
  return io;
};

export { setupSocket };
export default { setupSocket };