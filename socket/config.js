const socketConfig = {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://newlive-sable.vercel.app/',
      process.env.CLIENT_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6,
};

module.exports = { socketConfig };
