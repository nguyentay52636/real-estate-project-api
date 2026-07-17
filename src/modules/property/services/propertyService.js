import PropertyModel from '#models/Property.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const CHU_NHA_FIELDS = 'ten email soDienThoai anhDaiDien trangThai vaiTro';
const VALID_STATUSES = ['cho_duyet', 'dang_hoat_dong', 'da_cho_thue', 'da_ban'];
const VALID_TRANSACTION_TYPES = ['ban', 'cho_thue'];

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

/** Populate chủ đăng tin + vai trò (chu_tro, …) */
function populateChuNha(query) {
  return query.populate({
    path: 'nguoiDungId',
    select: CHU_NHA_FIELDS,
    populate: { path: 'vaiTro', select: 'ten' },
  });
}

/**
 * Gắn field `chuNha` rõ nghĩa cho FE (liên hệ / đặt lịch với chủ đăng).
 * `nguoiDungId` vẫn giữ object đã populate để tương thích cũ.
 */
function toPropertyResponse(doc) {
  if (!doc) return null;
  const property = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const owner =
    property.nguoiDungId && typeof property.nguoiDungId === 'object'
      ? property.nguoiDungId
      : null;

  property.chuNha = owner;
  return property;
}

function mapPropertyList(rows) {
  return rows.map(toPropertyResponse);
}

export function createPropertyService(deps = {}) {
  const Property = deps.Property ?? PropertyModel;
  const User = deps.User ?? UserModel;

  async function listWithPagination(filter, query, sortOptions = { createdAt: -1 }) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [rows, total] = await Promise.all([
      populateChuNha(Property.find(filter)).sort(sortOptions).skip(skip).limit(limitNum),
      Property.countDocuments(filter),
    ]);
    return {
      data: mapPropertyList(rows),
      pagination: buildPaginationMeta(total, pageNum, limitNum),
      total,
    };
  }

  async function getAllProperties(query = {}) {
    const {
      loaiBds,
      loaiGiaoDich,
      trangThai,
      tinhThanh,
      quanHuyen,
      giaMin,
      giaMax,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};
    if (loaiBds) filter.loaiBds = loaiBds;
    if (loaiGiaoDich) {
      if (!VALID_TRANSACTION_TYPES.includes(loaiGiaoDich)) {
        throw new AppError(
          `Loại giao dịch không hợp lệ. Chỉ chấp nhận: ${VALID_TRANSACTION_TYPES.join(', ')}`,
          400,
        );
      }
      filter.loaiGiaoDich = loaiGiaoDich;
    }
    if (trangThai) filter.trangThai = trangThai;
    if (tinhThanh) filter.tinhThanh = { $regex: new RegExp(tinhThanh, 'i') };
    if (quanHuyen) filter.quanHuyen = { $regex: new RegExp(quanHuyen, 'i') };
    if (giaMin || giaMax) {
      filter.gia = {};
      if (giaMin) filter.gia.$gte = Number(giaMin);
      if (giaMax) filter.gia.$lte = Number(giaMax);
    }
    if (search) {
      filter.$or = [
        { tieuDe: { $regex: new RegExp(search, 'i') } },
        { diaChi: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const { data, pagination } = await listWithPagination(filter, query, sortOptions);
    return { data, pagination };
  }

  async function getPropertyById(id) {
    const property = await populateChuNha(Property.findById(id));
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return toPropertyResponse(property);
  }


  async function getRelatedProperties(id, { limit = 6 } = {}) {
    const current = await Property.findById(id).lean();
    if (!current) throw new AppError('Không tìm thấy bất động sản', 404);

    const maxItems = Math.min(12, Math.max(1, parseInt(limit, 10) || 6));

    const collected = new Map();
    const excludedIds = [current._id];

    const priceLow = current.gia * 0.8;
    const priceHigh = current.gia * 1.2;

    // Các tầng ưu tiên. Mỗi tầng là 1 filter; chỉ chạy khi còn thiếu.
    const tiers = [];

    // Tầng 1: cùng dự án + giá trong khoảng ±20%
    if (current.duAn) {
      tiers.push({
        duAn: current.duAn,
        gia: { $gte: priceLow, $lte: priceHigh },
      });
      // Tầng 2: cùng dự án (giá bất kỳ)
      tiers.push({ duAn: current.duAn });
    }

    // Tầng 3: cùng loại BĐS + cùng quận/huyện
    tiers.push({ loaiBds: current.loaiBds, quanHuyen: current.quanHuyen });

    // Tầng 4: cùng tỉnh/thành + cùng loại BĐS
    tiers.push({ tinhThanh: current.tinhThanh, loaiBds: current.loaiBds });

    for (const tierFilter of tiers) {
      if (collected.size >= maxItems) break;

      const remaining = maxItems - collected.size;
      const filter = {
        ...tierFilter,
        trangThai: 'dang_hoat_dong',
        _id: { $nin: excludedIds },
      };
      if (current.loaiGiaoDich) {
        filter.loaiGiaoDich = current.loaiGiaoDich;
      }

      const rows = await populateChuNha(Property.find(filter))
        .sort({ createdAt: -1 })
        .limit(remaining);

      for (const row of rows) {
        const key = String(row._id);
        if (!collected.has(key)) {
          collected.set(key, row);
          excludedIds.push(row._id);
        }
      }
    }

    const currentDuAn = current.duAn || null;

    // Sắp xếp theo mức độ liên quan: cùng dự án → giá gần → diện tích gần → mới nhất
    const sorted = [...collected.values()].sort((a, b) => {
      const aSameDuAn = currentDuAn && a.duAn === currentDuAn ? 1 : 0;
      const bSameDuAn = currentDuAn && b.duAn === currentDuAn ? 1 : 0;
      if (aSameDuAn !== bSameDuAn) return bSameDuAn - aSameDuAn;

      const priceDiff = Math.abs(a.gia - current.gia) - Math.abs(b.gia - current.gia);
      if (priceDiff !== 0) return priceDiff;

      const areaDiff =
        Math.abs(a.dienTich - current.dienTich) - Math.abs(b.dienTich - current.dienTich);
      if (areaDiff !== 0) return areaDiff;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return sorted.slice(0, maxItems).map(toPropertyResponse);
  }

  async function getPropertyAuthor(id) {
    const property = await populateChuNha(Property.findById(id));
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    if (!property.nguoiDungId) {
      throw new AppError('Không tìm thấy chủ nhà đăng tin', 404);
    }

    return {
      propertyId: property._id,
      tieuDe: property.tieuDe,
      slug: property.slug,
      chuNha: property.nguoiDungId,
      tacGia: property.nguoiDungId,
    };
  }

  async function getPropertyBySlug(slug) {
    const property = await populateChuNha(Property.findOne({ slug }));
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return toPropertyResponse(property);
  }

  async function getPropertiesByDistrict(district, query = {}) {
    const filter = { quanHuyen: { $regex: new RegExp(district, 'i') } };
    const { data, pagination, total } = await listWithPagination(filter, query);
    if (total === 0) {
      throw new AppError('Không tìm thấy bất động sản tại quận/huyện này', 404);
    }
    return { data, pagination };
  }

  async function getPropertiesByUser(userId, query = {}) {
    const filter = { nguoiDungId: userId };
    const { data, pagination } = await listWithPagination(filter, query);
    return { data, pagination };
  }

  async function assertCanPostProperty(nguoiDungId) {
    if (!nguoiDungId) {
      throw new AppError('Thiếu nguoiDungId (ID chủ đăng tin)', 400);
    }

    const user = await User.findById(nguoiDungId).populate('vaiTro', 'ten');
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    if (user.trangThai === 'khoa') {
      throw new AppError('Tài khoản đã bị khóa, không thể đăng tin', 403);
    }

    const roleName = user.vaiTro?.ten;
    // API quản lý bài cho phép chủ trọ, nhân viên và admin.
    if (!['chu_tro', 'nhan_vien', 'admin'].includes(roleName)) {
      throw new AppError(
        'Chỉ tài khoản vai trò chu_tro, nhan_vien hoặc admin mới được đăng tin',
        403,
      );
    }

    return user;
  }

  /** Body tạo/sửa tin: chỉ nhận field schema + nguoiDungId, bỏ chuNha/tacGia (chỉ có ở response). */
  function sanitizePropertyInput(input = {}) {
    const {
      chuNha: _chuNha,
      tacGia: _tacGia,
      slug: _slug,
      _id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      __v: _v,
      ...rest
    } = input;
    return rest;
  }

  async function createProperty(input) {
    const payload = sanitizePropertyInput(input);
    await assertCanPostProperty(payload.nguoiDungId);

    const newProperty = new Property(payload);
    const saved = await newProperty.save();
    return getPropertyById(saved._id);
  }

  async function updateProperty(id, input) {
    const payload = sanitizePropertyInput(input);
    // Không cho đổi chủ tin qua update thường; nếu gửi nguoiDungId thì vẫn check role
    if (payload.nguoiDungId) {
      await assertCanPostProperty(payload.nguoiDungId);
    }

    const updated = await Property.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new AppError('Không tìm thấy bất động sản', 404);
    return getPropertyById(updated._id);
  }

  async function updatePropertyStatus(id, trangThai) {
    if (!VALID_STATUSES.includes(trangThai)) {
      throw new AppError(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }
    const updated = await Property.findByIdAndUpdate(id, { trangThai }, { new: true });
    if (!updated) throw new AppError('Không tìm thấy bất động sản', 404);
    return getPropertyById(updated._id);
  }

  async function deleteProperty(id) {
    const deleted = await Property.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Không tìm thấy bất động sản', 404);
    return deleted;
  }

  return {
    getAllProperties,
    getPropertyById,
    getRelatedProperties,
    getPropertyAuthor,
    getPropertyBySlug,
    getPropertiesByDistrict,
    getPropertiesByUser,
    createProperty,
    updateProperty,
    updatePropertyStatus,
    deleteProperty,
  };
}

const propertyService = createPropertyService();
export default propertyService;
