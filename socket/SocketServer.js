const socketIo = require('socket.io');
const { setIO } = require('./ioInstance');
const { socketConfig } = require('./config');
const { authMiddleware } = require('./middleware/auth');
const { createConnectionState } = require('./state/connectionState');
const { onConnection } = require('./handlers/connectionHandlers');
const logger = require('../utils/logger');

const setupSocket = (server) => {
  const io = socketIo(server, socketConfig);
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

module.exports = { setupSocket };
