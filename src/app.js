import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import passport from '#config/passport.js';
import rootRouter from '#modules/index.routes.js';
import { swaggerSpec, swaggerUi, swaggerUiOptions } from '#docs/swagger/swagger.js';
import { getDirname } from '#shared/utils/esm.js';
import { errorHandler } from '#shared/middleware/errorHandler.js';
import { corsOriginDelegate } from '#shared/utils/corsOrigins.js';


const dirname = getDirname(import.meta.url);

export function createApp() {
  const app = express();

  app.use(cors({
    origin: corsOriginDelegate,
    credentials: true,
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use('/images', express.static(path.join(dirname, '../images')));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());


  app.use('/api', rootRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  app.use(errorHandler);

  return app;
}

export default createApp;
