import User from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const STAFF_ROLES = new Set(['admin', 'nhan_vien', 'quan_tri_vien']);


export async function attachAuthUser(req, _res, next) {
  try {
    if (!req.user?.id) {
      throw new AppError('Bạn chưa đăng nhập', 401);
    }
    const user = await User.findById(req.user.id).populate('vaiTro', 'ten');
    if (!user) throw new AppError('Không tìm thấy tài khoản', 401);
    if (user.trangThai === 'khoa') {
      throw new AppError('Tài khoản đã bị khóa', 403);
    }

    const roleName = user.vaiTro?.ten || null;
    req.authUser = {
      id: String(user._id),
      vaiTro: roleName,
      isStaff: STAFF_ROLES.has(roleName),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function isStaffRole(roleName) {
  return STAFF_ROLES.has(roleName);
}

export { STAFF_ROLES };
export default attachAuthUser;
