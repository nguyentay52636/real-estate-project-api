import { getAllowedOrigins } from '#shared/utils/corsOrigins.js';

const socketConfig = {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6,
};

export { socketConfig };
export default { socketConfig };
