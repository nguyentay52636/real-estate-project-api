import '#config/env.js';
import http from 'http';
import mongoose from 'mongoose';
import connectDB from '#config/db.js';
import cloudinary from '#infra/storage/cloudinary.js';
import { setupSocket } from '#infra/realtime/SocketServer.js';
import { setupAiWebSocket } from '#infra/realtime/aiWebSocket.js';
import { startJobWorker } from '#infra/queue/jobQueue.js';
import '#infra/queue/jobHandlers.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 8000;

const app = createApp();
const server = http.createServer(app);

connectDB();
setupSocket(server);
setupAiWebSocket(server);
startJobWorker();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Socket.IO server is ready');
  console.log(`AI WebSocket server is ready at ws://localhost:${PORT}/ws`);

  cloudinary.verifyConnection().then((result) => {
    if (result.ok) {
      console.log('Cloudinary connected');
    } else {
      console.warn(`Cloudinary: ${result.message}`);
    }
  });
});

const gracefulShutdown = async () => {
  console.log('📴 Received shutdown signal, closing server gracefully...');

  server.close(async () => {
    console.log('✅ HTTP server closed');
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.once('SIGUSR2', () => {
  gracefulShutdown();
});
