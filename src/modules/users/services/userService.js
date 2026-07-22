import bcrypt from 'bcrypt';
import UserModel from '#models/User.js';
import RoleModel from '#models/Role.js';
import CustomerModel from '#models/Customer.js';
import OwnerModel from '#models/Owner.js';
import EmployeeModel from '#models/Employee.js';
import { AppError } from '#shared/errors/AppError.js';
import { maybeLean } from '#shared/utils/queryHelpers.js';

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export function createUserService(deps = {}) {
  const User = deps.User ?? UserModel;
  const Role = deps.Role ?? RoleModel;
  const Customer = deps.Customer ?? CustomerModel;
  const Owner = deps.Owner ?? OwnerModel;
  const Employee = deps.Employee ?? EmployeeModel;
  const hashPassword = deps.hashPassword ?? ((pw) => bcrypt.hash(pw, 10));

  async function resolveRole(ten) {
    let role = await Role.findOne({ ten });
    if (!role) {
      role = await Role.create({ ten, moTa: `Vai trò ${ten}` });
    }
    return role;
  }

  async function listUsers(query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const filter = {};
    if (query.trangThai) filter.trangThai = query.trangThai;
    if (query.vaiTro) filter.vaiTro = query.vaiTro;

    const [users, total] = await Promise.all([
      maybeLean(
        User.find(filter)
          .select('-matKhau -resetPasswordToken -resetPasswordExpires')
          .populate('vaiTro', 'ten moTa')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
      ),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function getAllUser(query = {}) {
    return listUsers(query);
  }

  async function getAllUsers(query = {}) {
    return listUsers(query);
  }

  async function getUserById(id) {
    const user = await maybeLean(User.findById(id).select('-matKhau -resetPasswordToken -resetPasswordExpires').populate('vaiTro'));
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async function deleteUser(id) {
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) throw new AppError('User not found', 404);
    return deleted;
  }

  async function updateUser(id, input) {
    const userUpdate = {
      ten: input.ten,
      email: input.email,
      tenDangNhap: input.tenDangNhap,
      matKhau: input.matKhau,
      soDienThoai: input.soDienThoai,
      vaiTro: input.vaiTro,
      anhDaiDien: input.anhDaiDien,
      trangThai: input.trangThai,
    };

    if (input.matKhau) {
      userUpdate.matKhau = await hashPassword(input.matKhau);
    }
    if (input.vaiTro) {
      const role = await resolveRole(input.vaiTro);
      userUpdate.vaiTro = role._id;
    }

    const updated = await User.findByIdAndUpdate(id, userUpdate, { new: true });
    if (!updated) throw new AppError('User not found', 404);
    return updated;
  }

  async function createUser(input) {
    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: input.email }),
      User.findOne({ tenDangNhap: input.tenDangNhap }),
    ]);
    if (emailExists) throw new AppError('Email already exists', 400);
    if (usernameExists) throw new AppError('Username already exists', 400);

    const hashedPassword = await hashPassword(input.matKhau);
    const role = await resolveRole(input.vaiTro);

    const newUser = await User.create({
      ten: input.ten,
      email: input.email,
      tenDangNhap: input.tenDangNhap,
      matKhau: hashedPassword,
      soDienThoai: input.soDienThoai,
      vaiTro: role._id,
      anhDaiDien: input.anhDaiDien,
      trangThai: input.trangThai || 'hoat_dong',
    });

    let customer = null;
    let chuTro = null;
    let nhanVien = null;

    if (input.vaiTro === 'nhan_vien') {
      nhanVien = await Employee.create({ nguoiDungId: newUser._id });
    } else if (input.vaiTro === 'nguoi_thue') {
      customer = await Customer.create({ nguoiDungId: newUser._id });
    } else if (input.vaiTro === 'chu_tro') {
      chuTro = await Owner.create({ nguoiDungId: newUser._id });
    }

    return { user: newUser, customer, chuTro, nhanVien };
  }

  async function findRawUserById(id) {
    return User.findById(id);
  }

  async function setAvatar(id, avatarUrl) {
    return User.findByIdAndUpdate(id, { anhDaiDien: avatarUrl }, { new: true }).populate('vaiTro');
  }

  return {
    getAllUser,
    getAllUsers,
    getUserById,
    deleteUser,
    updateUser,
    createUser,
    findRawUserById,
    setAvatar,
  };
}

const userService = createUserService();
export default userService;
