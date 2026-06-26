import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import passport from './config/passport.js';
import connectDB from './config/db.js';
import rootRouter from './routes/root.js';
import cloudinary from './config/cloudinary.js';
import { setupSocket } from './socket/SocketServer.js';
import { setupAiWebSocket } from './socket/aiWebSocket.js';
import { swaggerSpec, swaggerUi, swaggerUiOptions } from './swagger/swagger.js';
import { getDirname } from './utils/esm.js';

const dirname = getDirname(import.meta.url);
const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);

connectDB();

setupSocket(server);
setupAiWebSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/images', express.static(path.join(dirname, 'images')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", rootRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server is ready`);
  console.log(`AI WebSocket server is ready at ws://localhost:${PORT}/ws`);

  cloudinary.verifyConnection().then((result) => {
    if (result.ok) {
      console.log("Cloudinary connected");
    } else {
      console.warn(`Cloudinary: ${result.message}`);
    }
  });
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('📴 Received shutdown signal, closing server gracefully...');

  server.close(async () => {
    console.log('✅ HTTP server closed');

    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle various termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle nodemon restart
process.once('SIGUSR2', () => {
  gracefulShutdown();
});
