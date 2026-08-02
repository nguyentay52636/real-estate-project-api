import rateLimit from 'express-rate-limit';

const WINDOW_1M = 60 * 1000;
const WINDOW_15M = 15 * 60 * 1000;
const WINDOW_1H = 60 * 60 * 1000;

function jsonMessage(message) {
  return {
    message,
    code: 'RATE_LIMIT_EXCEEDED',
  };
}


export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: jsonMessage(
    'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  ),
});

/**
 * Register / signup — chống spam tạo tài khoản.
 * Mặc định: 5 req / 1 giờ / IP (đếm mọi request).
 */
export const registerRateLimiter = rateLimit({
  windowMs: WINDOW_1H,
  max: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều yêu cầu đăng ký từ IP này. Vui lòng thử lại sau 1 giờ.',
  ),
});

/**
 * Quên / đặt lại mật khẩu — chống spam email & token spray.
 * Mặc định: 5 req / 15 phút / IP.
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 15 phút.',
  ),
});

/**
 * Facebook OAuth / debug — giới hạn nhẹ.
 * Mặc định: 20 req / 15 phút / IP.
 */
export const oauthRateLimiter = rateLimit({
  windowMs: WINDOW_15M,
  max: Number(process.env.AUTH_OAUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu OAuth. Vui lòng thử lại sau.'),
});

/**
 * AI chat / search / handoff — chống spam credit OpenRouter.
 * Mặc định: 20 req / phút / IP.
 */
export const aiChatRateLimiter = rateLimit({
  windowMs: WINDOW_1M,
  max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều yêu cầu AI. Vui lòng thử lại sau 1 phút.',
  ),
});

/**
 * Upload — chống spam file.
 * Mặc định: 30 req / giờ / IP.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: WINDOW_1H,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều lần upload. Vui lòng thử lại sau 1 giờ.',
  ),
});

/**
 * Contact form public.
 * Mặc định: 10 req / giờ / IP.
 */
export const contactRateLimiter = rateLimit({
  windowMs: WINDOW_1H,
  max: Number(process.env.CONTACT_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều yêu cầu liên hệ. Vui lòng thử lại sau 1 giờ.',
  ),
});

/**
 * Global — mọi /api/* (trừ khi skip).
 * Mặc định: 300 req / phút / IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: WINDOW_1M,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.',
  ),
  skip: (req) => {
    const path = req.path || '';
    // Health / docs tĩnh nếu có
    return path === '/health' || path === '/api/health';
  },
});

/** Alias cũ — giữ tương thích import (dùng mức login) */
export const authRateLimiter = loginRateLimiter;

export default {
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
