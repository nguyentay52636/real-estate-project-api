import ViewingModel from '#models/ViewingSchedule.js';
import PropertyModel from '#models/Property.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const USER_FIELDS = 'ten email soDienThoai anhDaiDien trangThai vaiTro';
const PROPERTY_FIELDS =
  'tieuDe slug anhDaiDien diaChi quanHuyen tinhThanh gia trangThai nguoiDungId loaiBds loaiGiaoDich';
const VALID_STATUSES = ['cho_xac_nhan', 'da_xac_nhan', 'da_huy'];

function parsePagination({ page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function buildPaginationMeta(total, pageNum, limitNum) {
  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

function populateViewing(query) {
  return query
    .populate({
      path: 'nguoiDungId',
      select: USER_FIELDS,
      populate: { path: 'vaiTro', select: 'ten' },
    })
    .populate({
      path: 'batDongSanId',
      select: PROPERTY_FIELDS,
      populate: {
        path: 'nguoiDungId',
        select: USER_FIELDS,
        populate: { path: 'vaiTro', select: 'ten' },
      },
    });
}

function toViewingResponse(doc) {
  if (!doc) return null;
  const viewing = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const property = viewing.batDongSanId;

  if (property && typeof property === 'object' && property.nguoiDungId) {
    viewing.tacGia = property.nguoiDungId;
  } else {
    viewing.tacGia = null;
  }

  return viewing;
}

function ownerIdFromProperty(property) {
  if (!property) return null;
  const owner = property.nguoiDungId;
  if (!owner) return null;
  return String(typeof owner === 'object' ? owner._id : owner);
}

export function createViewingService(deps = {}) {
  const Viewing = deps.Viewing ?? ViewingModel;
  const Property = deps.Property ?? PropertyModel;
  const User = deps.User ?? UserModel;

  async function propertyIdsOwnedBy(userId) {
    const rows = await Property.find({ nguoiDungId: userId }).select('_id');
    return rows.map((r) => r._id);
  }

  /** Scope list: staff = all; owner = own bookings + bookings on my properties; else = own only */
  async function buildScopedFilter(query, actor) {
    const { nguoiDungId, batDongSanId, trangThai } = query;
    const filter = {};

    if (trangThai) {
      if (!VALID_STATUSES.includes(trangThai)) {
        throw new AppError(
          `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
          400,
        );
      }
      filter.trangThai = trangThai;
    }
    if (batDongSanId) filter.batDongSanId = batDongSanId;

    if (actor?.isStaff) {
      if (nguoiDungId) filter.nguoiDungId = nguoiDungId;
      return filter;
    }

    const isOwnerRole = actor?.vaiTro === 'chu_tro';
    if (isOwnerRole) {
      const ownedIds = await propertyIdsOwnedBy(actor.id);
      const scopeOr = [{ nguoiDungId: actor.id }];
      if (ownedIds.length) {
        scopeOr.push({ batDongSanId: { $in: ownedIds } });
      }
      filter.$or = scopeOr;
      return filter;
    }

    // Khách / role khác: chỉ lịch của chính mình
    filter.nguoiDungId = actor.id;
    return filter;
  }

  async function assertCanAccessViewing(viewing, actor) {
    if (!viewing) throw new AppError('Không tìm thấy lịch hẹn', 404);
    if (actor?.isStaff) return;

    const bookerId = String(
      typeof viewing.nguoiDungId === 'object'
        ? viewing.nguoiDungId._id
        : viewing.nguoiDungId,
    );
    if (bookerId === String(actor.id)) return;

    const propertyRef = viewing.batDongSanId;
    const property =
      propertyRef && typeof propertyRef === 'object' && propertyRef.nguoiDungId !== undefined
        ? propertyRef
        : await Property.findById(
            typeof propertyRef === 'object' ? propertyRef._id : propertyRef,
          );

    if (ownerIdFromProperty(property) === String(actor.id)) return;

    throw new AppError('Không có quyền truy cập lịch hẹn này', 403);
  }

  async function getAllViewings(query = {}, actor) {
    if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);

    const filter = await buildScopedFilter(query, actor);
    const { pageNum, limitNum, skip } = parsePagination(query);
    const { sortBy = 'thoiGian', sortOrder = 'desc' } = query;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [rows, total] = await Promise.all([
      populateViewing(Viewing.find(filter).sort(sortOptions).skip(skip).limit(limitNum)),
      Viewing.countDocuments(filter),
    ]);

    return {
      data: rows.map(toViewingResponse),
      pagination: buildPaginationMeta(total, pageNum, limitNum),
    };
  }

  async function getViewingById(id, actor) {
    const viewing = await populateViewing(Viewing.findById(id));
    if (!viewing) throw new AppError('Không tìm thấy lịch hẹn', 404);
    await assertCanAccessViewing(viewing, actor);
    return toViewingResponse(viewing);
  }

  async function createViewing(input, actor) {
    if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);

    const batDongSanId = input.batDongSanId;
    const thoiGian = input.thoiGian;
    const ghiChu = input.ghiChu;
    // Client không được đặt lịch hộ người khác trừ staff
    const nguoiDungId = actor.isStaff && input.nguoiDungId ? input.nguoiDungId : actor.id;
    const trangThai = input.trangThai;

    if (!nguoiDungId || !batDongSanId || !thoiGian) {
      throw new AppError('Thiếu nguoiDungId, batDongSanId hoặc thoiGian', 400);
    }

    const [user, property] = await Promise.all([
      User.findById(nguoiDungId),
      Property.findById(batDongSanId),
    ]);
    if (!user) throw new AppError('Không tìm thấy người dùng đặt lịch', 404);
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);

    if (trangThai && !VALID_STATUSES.includes(trangThai)) {
      throw new AppError(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }

    const viewing = await Viewing.create({
      nguoiDungId,
      batDongSanId,
      thoiGian,
      ghiChu,
      trangThai,
    });

    return getViewingById(viewing._id, actor);
  }

  async function updateViewing(id, input, actor) {
    const existing = await Viewing.findById(id);
    if (!existing) throw new AppError('Không tìm thấy lịch hẹn', 404);
    await assertCanAccessViewing(existing, actor);

    const allowed = {};
    if (input.thoiGian !== undefined) allowed.thoiGian = input.thoiGian;
    if (input.ghiChu !== undefined) allowed.ghiChu = input.ghiChu;
    if (input.trangThai !== undefined) {
      if (!VALID_STATUSES.includes(input.trangThai)) {
        throw new AppError(
          `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
          400,
        );
      }
      allowed.trangThai = input.trangThai;
    }
    if (input.batDongSanId !== undefined) {
      const property = await Property.findById(input.batDongSanId);
      if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
      allowed.batDongSanId = input.batDongSanId;
    }

    const updated = await Viewing.findByIdAndUpdate(id, allowed, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new AppError('Không tìm thấy lịch hẹn', 404);

    return getViewingById(updated._id, actor);
  }

  async function deleteViewing(id, actor) {
    const existing = await Viewing.findById(id);
    if (!existing) throw new AppError('Không tìm thấy lịch hẹn', 404);
    await assertCanAccessViewing(existing, actor);

    const deleted = await Viewing.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Không tìm thấy lịch hẹn', 404);
    return deleted;
  }

  return { getAllViewings, getViewingById, createViewing, updateViewing, deleteViewing };
}

const viewingService = createViewingService();
export default viewingService;
