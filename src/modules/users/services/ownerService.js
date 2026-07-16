import mongoose from 'mongoose';
import OwnerModel from '#models/Owner.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Owner not found', 400);
  }
}

export function createOwnerService(deps = {}) {
  const Owner = deps.Owner ?? OwnerModel;
  const User = deps.User ?? UserModel;

  async function getOwners() {
    return Owner.find().populate('nguoiDungId');
  }

  async function getOwnerById(id) {
    assertValidId(id);
    const owner = await Owner.findById(id).populate('nguoiDungId');
    if (!owner) throw new AppError('Owner not found', 404);
    return owner;
  }

  async function createOwner({ nguoiDungId, ghiChu }) {
    if (!nguoiDungId) throw new AppError('Missing required fields', 400);
    const user = await User.findById(nguoiDungId);
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
