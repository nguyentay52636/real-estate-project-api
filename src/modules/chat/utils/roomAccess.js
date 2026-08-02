import User from '#models/User.js';
import { isStaffRole } from '#shared/middleware/attachAuthUser.js';

/** Populate công khai — không lộ email / tenDangNhap */
export const MEMBER_PUBLIC_SELECT = 'ten anhDaiDien';
/** Staff được xem thêm định danh nhẹ */
export const MEMBER_STAFF_SELECT = 'ten anhDaiDien email tenDangNhap';

export function getActorId(req) {
  const id = req.authUser?.id || req.user?.id || req.user?._id;
  return id ? String(id) : '';
}

export function memberSelect(isStaff) {
  return isStaff ? MEMBER_STAFF_SELECT : MEMBER_PUBLIC_SELECT;
}

export function findActiveMember(room, userId) {
  if (!room?.thanhVien || !userId) return null;
  return room.thanhVien.find(
    (m) => m.nguoiDung?.toString?.() === String(userId) && m.trangThai === 'active',
  ) || null;
}

export function isActiveMember(room, userId) {
  return Boolean(findActiveMember(room, userId));
}

/**
 * Member active hoặc staff hệ thống mới được xem phòng.
 * @returns {{ member: object|null, isStaff: boolean }}
 */
export function assertCanAccessRoom(room, actorId, isStaff) {
  if (!room) {
    const err = new Error('Không tìm thấy phòng chat');
    err.statusCode = 404;
    throw err;
  }
  const member = findActiveMember(room, actorId);
  if (!member && !isStaff) {
    const err = new Error('Bạn không thuộc phòng chat này');
    err.statusCode = 403;
    throw err;
  }
  return { member, isStaff: Boolean(isStaff) };
}

export function assertRoomAdmin(room, actorId, isStaff) {
  const { member } = assertCanAccessRoom(room, actorId, isStaff);
  if (isStaff) return member;
  if (!member || member.vaiTro !== 'admin') {
    const err = new Error('Chỉ admin phòng mới có quyền thực hiện thao tác này');
    err.statusCode = 403;
    throw err;
  }
  return member;
}

/** Load isStaff nếu chưa có attachAuthUser (fallback). */
export async function ensureAuthContext(req) {
  if (req.authUser?.id) {
    return {
      id: String(req.authUser.id),
      isStaff: Boolean(req.authUser.isStaff),
    };
  }
  const id = getActorId(req);
  if (!id) {
    const err = new Error('Bạn chưa đăng nhập');
    err.statusCode = 401;
    throw err;
  }
  const user = await User.findById(id).populate('vaiTro', 'ten');
  const roleName = user?.vaiTro?.ten || null;
  return { id, isStaff: isStaffRole(roleName) };
}

export function httpError(res, error, fallbackMessage) {
  const status = error.statusCode || 500;
  if (status >= 500) {
    return res.status(status).json({
      message: fallbackMessage,
      ...(process.env.NODE_ENV === 'production' ? {} : { error: error.message }),
    });
  }
  return res.status(status).json({ message: error.message });
}

export default {
  MEMBER_PUBLIC_SELECT,
  MEMBER_STAFF_SELECT,
  getActorId,
  memberSelect,
  findActiveMember,
  isActiveMember,
  assertCanAccessRoom,
  assertRoomAdmin,
  ensureAuthContext,
  httpError,
};
