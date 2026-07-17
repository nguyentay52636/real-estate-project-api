import ViewingModel from '#models/ViewingSchedule.js';
import PropertyModel from '#models/Property.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const USER_FIELDS = 'ten email soDienThoai anhDaiDien trangThai vaiTro';
const PROPERTY_FIELDS =
  'tieuDe slug anhDaiDien diaChi quanHuyen tinhThanh gia trangThai nguoiDungId loaiBds';
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

export function createViewingService(deps = {}) {
  const Viewing = deps.Viewing ?? ViewingModel;
  const Property = deps.Property ?? PropertyModel;
  const User = deps.User ?? UserModel;

  async function getAllViewings(query = {}) {
    const { nguoiDungId, batDongSanId, trangThai, sortBy = 'thoiGian', sortOrder = 'desc' } =
      query;

    const filter = {};
    if (nguoiDungId) filter.nguoiDungId = nguoiDungId;
    if (batDongSanId) filter.batDongSanId = batDongSanId;
    if (trangThai) {
      if (!VALID_STATUSES.includes(trangThai)) {
        throw new AppError(
          `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
          400,
        );
      }
      filter.trangThai = trangThai;
    }

    const { pageNum, limitNum, skip } = parsePagination(query);
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

  async function getViewingById(id) {
    const viewing = await populateViewing(Viewing.findById(id));
    if (!viewing) throw new AppError('Không tìm thấy lịch hẹn', 404);
    return toViewingResponse(viewing);
  }

  async function createViewing(input) {
    const { nguoiDungId, batDongSanId, thoiGian, ghiChu, trangThai } = input;

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

    return getViewingById(viewing._id);
  }

  async function updateViewing(id, input) {
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

    return getViewingById(updated._id);
  }

  async function deleteViewing(id) {
    const deleted = await Viewing.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Không tìm thấy lịch hẹn', 404);
    return deleted;
  }

  return { getAllViewings, getViewingById, createViewing, updateViewing, deleteViewing };
}

const viewingService = createViewingService();
export default viewingService;
