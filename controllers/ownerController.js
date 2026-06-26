import Owner from '../models/Owner.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { responseApi } from '../config/response.js';

// Lấy danh sách chủ nhà
const getOwners = async (req, res) => {
  try {
    const owners = await Owner.find().populate("nguoiDungId");
    return responseApi(res, 200, owners, "Get owners successfully");
  } catch (error) {
    return responseApi(res, 500, error.message, "Get owners failed");
  }
};

// Lấy chi tiết chủ nhà theo id
const getOwnerById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return responseApi(res, 400, null, "Owner not found");
    }
    const owner = await Owner.findById(id).populate("nguoiDungId");
    if (!owner) {
      return responseApi(res, 404, null, "Owner not found");
    }
    return responseApi(res, 200, owner, "Get owner by id successfully");
  } catch (error) {
    return responseApi(res, 500, error.message, "Get owner by id failed");
  }
};

// Tạo mới chủ nhà - chỉ nhận nguoiDungId và ghiChu
const createOwner = async (req, res) => {
  try {
    const { nguoiDungId, ghiChu } = req.body;
    if (!nguoiDungId) {
      return responseApi(res, 400, null, "Missing required fields");
    }
    const checkUser = await User.findById(nguoiDungId);
    if (!checkUser) {
      return responseApi(res, 400, null, "User not found");
    }
    const newOwner = {
      nguoiDungId,
      ghiChu,
      // Các trường còn lại để mặc định
    };
    const owner = await Owner.create(newOwner);
    return responseApi(res, 201, owner, "Create owner successfully");
  } catch (error) {
    return responseApi(res, 500, error.message, "Create owner failed");
  }
};

// Cập nhật chủ nhà - chỉ cho phép cập nhật ghiChu
const updateOwner = async (req, res) => {
  const { id } = req.params;
  const { ghiChu } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return responseApi(res, 400, null, "Owner not found");
    }
    const owner = await Owner.findByIdAndUpdate(
      id,
      { ghiChu },
      { new: true }
    );
    if (!owner) {
      return responseApi(res, 404, null, "Owner not found");
    }
    return responseApi(res, 200, owner, "Update owner successfully");
  } catch (error) {
    return responseApi(res, 500, error.message, "Update owner failed");
  }
};

// Xóa chủ nhà
const deleteOwner = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return responseApi(res, 400, null, "Owner not found");
    }
    const owner = await Owner.findByIdAndDelete(id);
    if (!owner) {
      return responseApi(res, 404, null, "Owner not found");
    }
    return responseApi(res, 200, owner, "Delete owner successfully");
  } catch (error) {
    return responseApi(res, 500, error.message, "Delete owner failed");
  }
};

export { getOwners, getOwnerById, createOwner, updateOwner, deleteOwner };
export default { getOwners, getOwnerById, createOwner, updateOwner, deleteOwner };