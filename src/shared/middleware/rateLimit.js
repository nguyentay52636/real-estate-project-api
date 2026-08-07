import rateLimit from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import logger from '#shared/utils/logger.js';
import {
  ensureConnected,
  isRedisEnabled,
} from '#infra/cache/redisCache.js';

const WINDOW_1M = 60 * 1000;
const WINDOW_15M = 15 * 60 * 1000;
const WINDOW_1H = 60 * 60 * 1000;

function jsonMessage(message) {
  return {
    message,
    code: 'RATE_LIMIT_EXCEEDED',
  };
}

/** Redis client shared — mỗi limiter có RedisStore/MemoryStore riêng (prefix khác). */
let redisReady = null;
let redisInitLogged = false;

async function getSharedRedis() {
  if (process.env.RATE_LIMIT_REDIS === 'false' || !isRedisEnabled()) {
    return null;
  }
  if (redisReady !== null) return redisReady;
  try {
    const redis = await ensureConnected();
    redisReady = redis || false;
    if (redis && !redisInitLogged) {
      logger.info('[RateLimit] Redis sẵn sàng cho rate-limit stores');
      redisInitLogged = true;
    }
    return redisReady || null;
  } catch (err) {
    logger.warn(`[RateLimit] Redis không dùng được: ${err.message}`);
    redisReady = false;
    return null;
  }
}

/**
 * Một store / limiter (express-rate-limit cấm reuse).
 * Redis khi có; không thì MemoryStore.
 */
class HybridRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memory = new MemoryStore();
    this.redis = null;
    this._initStarted = false;
    this.localKeysPrefix = prefix;
  }

  async init() {
    if (this._initStarted) return this.redis;
    this._initStarted = true;

    const redis = await getSharedRedis();
    if (!redis) return null;

    try {
      const { RedisStore } = await import('rate-limit-redis');
      const base = process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:';
      this.redis = new RedisStore({
        prefix: `${base}${this.prefix}:`,
        sendCommand: (...args) => redis.call(...args),
      });
      return this.redis;
    } catch (err) {
      logger.warn(`[RateLimit] RedisStore ${this.prefix} fail → memory: ${err.message}`);
      this.redis = null;
      return null;
    }
  }

  async #active() {
    if (!this._initStarted) await this.init();
    return this.redis || this.memory;
  }

  async increment(key) {
    const store = await this.#active();
    try {
      return await store.increment(key);
    } catch (err) {
      logger.warn(`[RateLimit] increment fail → memory: ${err.message}`);
      return this.memory.increment(key);
    }
  }

  async decrement(key) {
    const store = await this.#active();
    try {
      return await store.decrement?.(key);
    } catch {
      return this.memory.decrement?.(key);
    }
  }

  async resetKey(key) {
    const store = await this.#active();
    try {
      return await store.resetKey?.(key);
    } catch {
      return this.memory.resetKey?.(key);
    }
  }

  async get(key) {
    const store = await this.#active();
    try {
      return await store.get?.(key);
    } catch {
      return this.memory.get?.(key);
    }
  }
}

const stores = [];

function buildLimiter(name, opts) {
  const store = new HybridRateLimitStore(name);
  stores.push(store);
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store,
    ...opts,
  });
}

/** Boot: warm Redis + init mọi store. */
export async function initRateLimitStore() {
  await getSharedRedis();
  await Promise.all(stores.map((s) => s.init()));
}

export const loginRateLimiter = buildLimiter('login', {
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 20),
  skipSuccessfulRequests: true,
  message: jsonMessage(
    'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  ),
});

export const registerRateLimiter = buildLimiter('register', {
  windowMs: WINDOW_1H,
  max: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX || 5),
  message: jsonMessage(
    'Quá nhiều yêu cầu đăng ký từ IP này. Vui lòng thử lại sau 1 giờ.',
  ),
});

export const passwordResetRateLimiter = buildLimiter('password', {
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX || 5),
  message: jsonMessage(
    'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 15 phút.',
  ),
});

export const oauthRateLimiter = buildLimiter('oauth', {
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_OAUTH_RATE_LIMIT_MAX || 20),
  message: jsonMessage('Quá nhiều yêu cầu OAuth. Vui lòng thử lại sau.'),
});

export const aiChatRateLimiter = buildLimiter('ai', {
  windowMs: WINDOW_1M,
  max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  message: jsonMessage(
    'Quá nhiều yêu cầu AI. Vui lòng thử lại sau 1 phút.',
  ),
});

export const uploadRateLimiter = buildLimiter('upload', {
  windowMs: WINDOW_1H,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30),
  message: jsonMessage(
    'Quá nhiều lần upload. Vui lòng thử lại sau 1 giờ.',
  ),
});

export const contactRateLimiter = buildLimiter('contact', {
  windowMs: WINDOW_1H,
  max: Number(process.env.CONTACT_RATE_LIMIT_MAX || 10),
  message: jsonMessage(
    'Quá nhiều yêu cầu liên hệ. Vui lòng thử lại sau 1 giờ.',
  ),
});

export const globalRateLimiter = buildLimiter('global', {
  windowMs: WINDOW_1M,
  // Dev/FE hay poll nhiều; 300 dễ dính khi trust-proxy gom IP hoặc SPA prefetch.
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 600),
  message: jsonMessage(
    'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.',
  ),
  skip: (req) => {
    const path = (req.path || '').replace(/\/+$/, '') || '/';
    if (path === '/health' || path === '/api/health') return true;

    // Auth có limiter riêng (login 10/15p, …) — không để global chặn đăng nhập.
    const authSkip = new Set([
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
      '/auth/oauth/exchange',
      '/auth/forgot-password',
      '/auth/forgotPassword',
      '/auth/reset-password',
      '/auth/resetPassword',
    ]);
    if (authSkip.has(path)) return true;
    if (path.startsWith('/auth/facebook')) return true;
    return false;
  },
});

export const authRateLimiter = loginRateLimiter;

export default {
  initRateLimitStore,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  oauthRateLimiter,
  aiChatRateLimiter,
  uploadRateLimiter,
  contactRateLimiter,
  globalRateLimiter,
  authRateLimiter,
};
