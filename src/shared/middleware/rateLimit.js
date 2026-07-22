import rateLimit from 'express-rate-limit';

/** Chống brute-force login / register / quên mật khẩu */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau vài phút.',
  },
});

export default { authRateLimiter };
