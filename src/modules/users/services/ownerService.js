import mongoose from 'mongoose';
import OwnerModel from '#models/Owner.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Owner not found', 400);
  }
}

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export function createOwnerService(deps = {}) {
  const Owner = deps.Owner ?? OwnerModel;
  const User = deps.User ?? UserModel;

  async function getOwners(query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Owner.find()
        .populate('nguoiDungId', 'ten email soDienThoai anhDaiDien trangThai')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        ,
      Owner.countDocuments(),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function getOwnerById(id) {
    assertValidId(id);
    const owner = await Owner.findById(id)
      .populate('nguoiDungId', 'ten email soDienThoai anhDaiDien trangThai')
      ;
    if (!owner) throw new AppError('Owner not found', 404);
    return owner;
  }

  async function createOwner({ nguoiDungId, ghiChu }) {
    if (!nguoiDungId) throw new AppError('Missing required fields', 400);
    const user = await User.findById(nguoiDungId).select('_id');
    if (!user) throw new AppError('User not found', 400);
    return Owner.create({ nguoiDungId, ghiChu });
  }

  async function updateOwner(id, { ghiChu }) {
    assertValidId(id);
    const owner = await Owner.findByIdAndUpdate(id, { ghiChu }, { new: true });
    if (!owner) throw new AppError('Owner not found', 404);
    return owner;
  }

  async function deleteOwner(id) {
    assertValidId(id);
    const owner = await Owner.findByIdAndDelete(id);
    if (!owner) throw new AppError('Owner not found', 404);
    return owner;
  }

  return { getOwners, getOwnerById, createOwner, updateOwner, deleteOwner };
}

const ownerService = createOwnerService();
export default ownerService;
