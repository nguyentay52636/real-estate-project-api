import auth from '#shared/middleware/auth.js';
import User from '#models/User.js';

/**
 * JWT tùy chọn: có token thì gắn req.user + req.authUser; không có thì next().
 */
export function optionalAuth(req, res, next) {
  const raw = req.headers.token || req.headers.authorization;
  if (!raw) return next();

  return auth.verifyToken(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).populate('vaiTro', 'ten');
      if (user && user.trangThai !== 'khoa') {
        req.authUser = {
          id: String(user._id),
          vaiTro: user.vaiTro?.ten,
        };
      }
    } catch {
      // Bỏ qua lỗi load user — vẫn ghi behavior dạng guest nếu có sessionId
    }
    next();
  });
}

export default optionalAuth;
