import rateLimit from 'express-rate-limit';

const WINDOW_15M = 15 * 60 * 1000;
const WINDOW_1H = 60 * 60 * 1000;

function jsonMessage(message) {
  return {
    message,
    code: 'RATE_LIMIT_EXCEEDED',
  };
}

/**
 * Login — chống brute-force.
 * Chỉ đếm request thất bại (4xx/5xx) để user đúng mật khẩu không bị khóa oan.
 * Mặc định: 10 lần sai / 15 phút / IP.
 */
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

/** Alias cũ — giữ tương thích import (dùng mức login) */
export const authRateLimiter = loginRateLimiter;

export default {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  oauthRateLimiter,
  authRateLimiter,
};
