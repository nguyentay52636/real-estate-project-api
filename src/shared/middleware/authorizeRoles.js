import User from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';
import auth from '#shared/middleware/auth.js';

/**
 * Xác thực JWT, sau đó đọc role hiện tại từ DB.
 * Không tin trực tiếp `vaiTro` trong JWT vì payload có thể là ObjectId/object
 * và role của tài khoản có thể đã thay đổi sau khi token được cấp.
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    auth.verifyToken(req, res, async () => {
      try {
        const user = await User.findById(req.user.id).populate('vaiTro', 'ten');
        if (!user) throw new AppError('Không tìm thấy tài khoản', 401);
        if (user.trangThai === 'khoa') {
          throw new AppError('Tài khoản đã bị khóa', 403);
        }

        const roleName = user.vaiTro?.ten;
        if (!allowedRoles.includes(roleName)) {
          throw new AppError(
            `Chỉ các vai trò ${allowedRoles.join(', ')} mới được thực hiện thao tác này`,
            403,
          );
        }

        req.authUser = {
          id: String(user._id),
          vaiTro: roleName,
        };
        next();
      } catch (error) {
        next(error);
      }
    });
  };
}

export default authorizeRoles;
