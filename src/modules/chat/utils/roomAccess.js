import User from '#models/User.js';
import { isStaffRole, isAdminRole } from '#shared/middleware/attachAuthUser.js';

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

function memberUserId(m) {
  const raw = m?.nguoiDung;
  if (raw && typeof raw === 'object' && raw._id != null) return String(raw._id);
  return String(raw ?? '');
}

export function findActiveMember(room, userId) {
  if (!room?.thanhVien || !userId) return null;
  const uid = String(userId);
  return (
    room.thanhVien.find(
      (m) => memberUserId(m) === uid && m.trangThai === 'active',
    ) || null
  );
}

export function isActiveMember(room, userId) {
  return Boolean(findActiveMember(room, userId));
}

export function isRoomAdminMember(room, userId) {
  const member = findActiveMember(room, userId);
  return Boolean(member && member.vaiTro === 'admin');
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

/**
 * Xóa / giải tán phòng:
 * - group: admin nhóm (vaiTro phòng) hoặc quản trị viên hệ thống
 * - private: chỉ quản trị viên hệ thống (xóa cuộc trò chuyện với NV / user)
 */
export function assertCanDeleteOrDisbandRoom(room, actorId, { isAdmin = false } = {}) {
  if (!room) {
    const err = new Error('Không tìm thấy phòng chat');
    err.statusCode = 404;
    throw err;
  }

  if (room.loaiPhong === 'group') {
    if (isAdmin || isRoomAdminMember(room, actorId)) return true;
    const err = new Error('Chỉ admin nhóm hoặc quản trị viên mới giải tán được nhóm');
    err.statusCode = 403;
    throw err;
  }

  if (isAdmin) return true;
  const err = new Error('Chỉ quản trị viên mới được xóa cuộc trò chuyện');
  err.statusCode = 403;
  throw err;
}

/**
 * Filter danh sách phòng cho GET /api/room.
 * Mặc định: chỉ phòng user đang là thành viên active (kể cả nhóm).
 * Quản trị viên xem toàn hệ thống: ?scope=all
 */
export function buildRoomsListFilter(
  actorId,
  { isStaff = false, isAdmin = false } = {},
  { scope, loaiPhong } = {},
) {
  const wantAll = Boolean(isAdmin) && String(scope || '').toLowerCase() === 'all';
  const filter = wantAll
    ? {}
    : {
        thanhVien: { $elemMatch: { nguoiDung: actorId, trangThai: 'active' } },
        anDoiVoi: { $ne: actorId },
      };
  if (loaiPhong === 'group' || loaiPhong === 'private') {
    filter.loaiPhong = loaiPhong;
  }
  void isStaff;
  return filter;
}

/** Load isStaff / isAdmin nếu chưa có attachAuthUser (fallback). */
export async function ensureAuthContext(req) {
  if (req.authUser?.id) {
    return {
      id: String(req.authUser.id),
      isStaff: Boolean(req.authUser.isStaff),
      isAdmin: Boolean(req.authUser.isAdmin),
      vaiTro: req.authUser.vaiTro || null,
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
  return {
    id,
    isStaff: isStaffRole(roleName),
    isAdmin: isAdminRole(roleName),
    vaiTro: roleName,
  };
}

/**
 * Resolve cặp private room: actor + other.
 * Body: otherUserId | (userId1 + userId2 với actor là một bên).
 */
export function resolvePrivateChatOtherId(actorId, body = {}) {
  const actor = String(actorId);
  if (body.otherUserId) {
    const other = String(body.otherUserId);
    if (other === actor) {
      const err = new Error('Không thể tạo phòng chat với chính mình');
      err.statusCode = 400;
      throw err;
    }
    return other;
  }
  if (!body.userId1 || !body.userId2) {
    const err = new Error('Thiếu thông tin otherUserId hoặc userId1/userId2');
    err.statusCode = 400;
    throw err;
  }
  const a = String(body.userId1);
  const b = String(body.userId2);
  if (a === actor) return b;
  if (b === actor) return a;
  const err = new Error('Bạn phải là một trong hai thành viên của phòng');
  err.statusCode = 403;
  throw err;
}

/** Nếu cả hai là staff hệ thống → mặc định chat nội bộ (noi_bo). */
export async function resolveBoiCanhForPrivate(actorId, otherId, boiCanh) {
  if (boiCanh === 'noi_bo' || boiCanh === 'ho_tro_khach') return boiCanh;

  const users = await User.find({ _id: { $in: [actorId, otherId] } })
    .populate('vaiTro', 'ten')
    .select('vaiTro');
  const bothStaff =
    users.length === 2 &&
    users.every((u) => isStaffRole(u.vaiTro?.ten));
  return bothStaff ? 'noi_bo' : 'ho_tro_khach';
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
  isRoomAdminMember,
  assertCanAccessRoom,
  assertRoomAdmin,
  assertCanDeleteOrDisbandRoom,
  ensureAuthContext,
  resolvePrivateChatOtherId,
  resolveBoiCanhForPrivate,
  buildRoomsListFilter,
  httpError,
};
