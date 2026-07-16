import PropertyModel from '#models/Property.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const OWNER_FIELDS = 'ten email soDienThoai anhDaiDien';
const VALID_STATUSES = ['dang_hoat_dong', 'da_cho_thue'];

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

export function createPropertyService(deps = {}) {
  const Property = deps.Property ?? PropertyModel;
  const User = deps.User ?? UserModel;

  async function listWithPagination(filter, query, sortOptions = { createdAt: -1 }) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Property.find(filter)
        .populate('nguoiDungId', OWNER_FIELDS)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Property.countDocuments(filter),
    ]);
    return { data, pagination: buildPaginationMeta(total, pageNum, limitNum), total };
  }

  async function getAllProperties(query = {}) {
    const {
      loaiBds,
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
    const property = await Property.findById(id).populate('nguoiDungId', OWNER_FIELDS);
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return property;
  }

  async function getPropertyBySlug(slug) {
    const property = await Property.findOne({ slug }).populate('nguoiDungId', OWNER_FIELDS);
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return property;
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

  async function createProperty(input) {
    const userData = await User.findById(input.nguoiDungId);
    if (!userData) throw new AppError('Không tìm thấy người dùng', 404);

    const newProperty = new Property(input);
    return newProperty.save();
  }

  async function updateProperty(id, input) {
    const updated = await Property.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    }).populate('nguoiDungId', OWNER_FIELDS);
    if (!updated) throw new AppError('Không tìm thấy bất động sản', 404);
    return updated;
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
    return updated;
  }

  async function deleteProperty(id) {
    const deleted = await Property.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Không tìm thấy bất động sản', 404);
    return deleted;
  }

  return {
    getAllProperties,
    getPropertyById,
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
