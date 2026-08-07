import { Server } from 'socket.io';
import Redis from 'ioredis';
import logger from '#shared/utils/logger.js';
import { setIO, setConnectionState } from './ioInstance.js';
import { socketConfig } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { createConnectionState } from './state/connectionState.js';
import { onConnection } from './handlers/connectionHandlers.js';
import { isRedisEnabled } from '#infra/cache/redisCache.js';

function createRedisClients() {
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
  if (process.env.REDIS_URL) {
    return {
      pub: new Redis(process.env.REDIS_URL, opts),
      sub: new Redis(process.env.REDIS_URL, opts),
    };
  }
  const common = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    ...opts,
  };
  return { pub: new Redis(common), sub: new Redis(common) };
}

async function attachRedisAdapter(io) {
  // Opt-in: chỉ bật khi scale multi-instance
  if (process.env.SOCKET_REDIS_ADAPTER !== 'true') {
    logger.info('[Socket.IO] In-memory adapter (set SOCKET_REDIS_ADAPTER=true khi scale)');
    return;
  }

  if (!isRedisEnabled()) {
    logger.warn('[Socket.IO] SOCKET_REDIS_ADAPTER=true nhưng Redis chưa cấu hình — memory');
    return;
  }

  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { pub, sub } = createRedisClients();
    pub.on('error', (err) => logger.error(`[Socket.IO Redis pub] ${err.message}`));
    sub.on('error', (err) => logger.error(`[Socket.IO Redis sub] ${err.message}`));
    io.adapter(createAdapter(pub, sub));
    logger.info('[Socket.IO] Redis adapter gắn (multi-instance)');
  } catch (err) {
    logger.warn(`[Socket.IO] Redis adapter thất bại — memory: ${err.message}`);
  }
}

const setupSocket = async (server) => {
  const io = new Server(server, socketConfig);
  await attachRedisAdapter(io);

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
  setConnectionState(state);
  return io;
};

export { setupSocket };
export default { setupSocket };
