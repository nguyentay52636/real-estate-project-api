import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import passport from '#config/passport.js';
import rootRouter from '#modules/index.routes.js';
import { swaggerSpec, swaggerUi, swaggerUiOptions } from '#docs/swagger/swagger.js';
import { getDirname } from '#shared/utils/esm.js';
import { errorHandler } from '#shared/middleware/errorHandler.js';
import { corsOriginDelegate } from '#shared/utils/corsOrigins.js';
import { globalRateLimiter } from '#shared/middleware/rateLimit.js';
import { getIO } from '#infra/realtime/ioInstance.js';

const dirname = getDirname(import.meta.url);

const WEAK_SESSION_SECRETS = new Set([
  '',
  'your-secret-key-here',
  'your-super-secret-session-key-here',
]);

function resolveSessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim();
  const isWeak = !secret || WEAK_SESSION_SECRETS.has(secret);

  if (process.env.NODE_ENV === 'production' && isWeak) {
    throw new Error(
      'SESSION_SECRET phải được set giá trị mạnh trên production (không dùng default).',
    );
  }

  if (isWeak) {
    console.warn(
      '[Security] SESSION_SECRET yếu/thiếu — chỉ chấp nhận trên non-production.',
    );
    return secret || 'dev-only-insecure-session-secret';
  }

  return secret;
}

function isSwaggerEnabled() {
  if (process.env.ENABLE_SWAGGER === 'true') return true;
  if (process.env.ENABLE_SWAGGER === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function createApp() {
  const app = express();

  // Render / reverse proxy — cần để rate-limit lấy đúng IP client
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

  app.use(
    helmet({
      // FE (domain khác) cần load /images và gọi API
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.use(cors({
    origin: corsOriginDelegate,
    credentials: true,
  }));

  const jsonLimit = process.env.JSON_BODY_LIMIT || '1mb';
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
  app.use(cookieParser());
  app.use('/images', express.static(path.join(dirname, '../images')));

  app.use(session({
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Gắn Socket.IO vào req (lazy — setupSocket chạy sau createApp)
  app.use((req, _res, next) => {
    req.io = getIO();
    next();
  });

  // Chống spam toàn API (sau auth middleware không áp dụng — gắn trước router)
  app.use('/api', globalRateLimiter);
  app.use('/api', rootRouter);

  if (isSwaggerEnabled()) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  } else {
    app.use('/api-docs', (_req, res) => {
      res.status(404).json({ message: 'API docs bị tắt trên môi trường này' });
    });
  }

  app.use(errorHandler);

  return app;
}

export default createApp;
