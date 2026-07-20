import bcrypt from 'bcrypt';
import EmployeeModel from '#models/Employee.js';
import UserModel from '#models/User.js';
import RoleModel from '#models/Role.js';
import { AppError } from '#shared/errors/AppError.js';

const EMPLOYEE_FIELDS = ['phongBan', 'chucVu', 'luong', 'hieuSuat', 'ngayVaoLam', 'trangThai'];
const USER_SAFE = '-matKhau';

const VALID_PHONG_BAN = ['sale', 'ho_tro_khach_hang', 'chuyen_vien_sale', 'truong_phong_ban'];
const VALID_CHUC_VU = ['nhan_vien', 'quan_ly', 'giam_doc', 'truong_phong'];
const VALID_EMP_STATUS = ['dang_hoat_dong', 'tam_nghi', 'da_nghi'];

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function buildPaginationMeta(total, pageNum, limitNum) {
  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 0,
  };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createEmployeeService(deps = {}) {
  const Employee = deps.Employee ?? EmployeeModel;
  const User = deps.User ?? UserModel;
  const Role = deps.Role ?? RoleModel;
  const hashPassword = deps.hashPassword ?? ((pw) => bcrypt.hash(pw, 10));

  async function getNhanVienRole() {
    let role = await Role.findOne({ ten: 'nhan_vien' });
    if (!role) {
      role = await Role.create({ ten: 'nhan_vien', moTa: 'Vai trò nhân viên' });
    }
    return role;
  }

  function validateEmployeeEnums(input) {
    if (input.phongBan != null && !VALID_PHONG_BAN.includes(input.phongBan)) {
      throw new AppError(
        `phongBan không hợp lệ. Chỉ chấp nhận: ${VALID_PHONG_BAN.join(', ')}`,
        400,
      );
    }
    if (input.chucVu != null && !VALID_CHUC_VU.includes(input.chucVu)) {
      throw new AppError(
        `chucVu không hợp lệ. Chỉ chấp nhận: ${VALID_CHUC_VU.join(', ')}`,
        400,
      );
    }
    if (input.trangThai != null && !VALID_EMP_STATUS.includes(input.trangThai)) {
      throw new AppError(
        `trangThai không hợp lệ. Chỉ chấp nhận: ${VALID_EMP_STATUS.join(', ')}`,
        400,
      );
    }
  }

  async function attachProfiles(users) {
    const userIds = users.map((u) => u._id);
    const profiles = await Employee.find({ nguoiDungId: { $in: userIds } }).lean();
    const profileByUser = new Map(profiles.map((p) => [String(p.nguoiDungId), p]));
    return users.map((u) => ({
      ...u,
      nhanVien: profileByUser.get(String(u._id)) || null,
    }));
  }

  /**
   * Danh sách nhân viên = tất cả User có vaiTro nhan_vien
   * (+ hồ sơ NhanVien nếu có, field nhanVien).
   */
  async function getAllEmployees(query = {}) {
    const role = await getNhanVienRole();
    const { q, trangThai, page, limit } = query;
    const filter = { vaiTro: role._id };

    if (trangThai) filter.trangThai = trangThai;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ ten: rx }, { email: rx }, { tenDangNhap: rx }, { soDienThoai: rx }];
    }

    const { pageNum, limitNum, skip } = parsePagination({ page, limit });

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(USER_SAFE)
        .populate('vaiTro', 'ten moTa')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const data = await attachProfiles(users);
    return { data, pagination: buildPaginationMeta(total, pageNum, limitNum) };
  }

  /** Alias — cùng getAllEmployees */
  async function listStaffUsers(query = {}) {
    return getAllEmployees(query);
  }

  /** Chi tiết theo userId (user phải có role nhan_vien) */
  async function getEmployeeById(userId) {
    const role = await getNhanVienRole();
    const user = await User.findById(userId)
      .select(USER_SAFE)
      .populate('vaiTro', 'ten moTa')
      .lean();

    if (!user) throw new AppError('Không tìm thấy nhân viên', 404);

    const roleId = user.vaiTro?._id || user.vaiTro;
    const roleName = user.vaiTro?.ten;
    if (roleName !== 'nhan_vien' && String(roleId) !== String(role._id)) {
      throw new AppError('Người dùng không có vai trò nhan_vien', 404);
    }

    const [withProfile] = await attachProfiles([user]);
    return withProfile;
  }

  async function ensureProfile(userId, input = {}) {
    let profile = await Employee.findOne({ nguoiDungId: userId });
    if (profile) return profile;

    return Employee.create({
      nguoiDungId: userId,
      phongBan: input.phongBan || 'sale',
      chucVu: input.chucVu || 'nhan_vien',
      luong: input.luong ?? 0,
      hieuSuat: input.hieuSuat ?? 0,
      ngayVaoLam: input.ngayVaoLam || new Date(),
      trangThai: input.trangThai || 'dang_hoat_dong',
    });
  }

  /**
   * Tạo nhân viên = tạo User vaiTro nhan_vien (+ hồ sơ NhanVien).
   * Hoặc gắn hồ sơ cho user đã có role nhan_vien (nguoiDungId).
   * :id / response dùng userId.
   */
  async function createEmployee(input = {}) {
    validateEmployeeEnums(input);

    if (input.nguoiDungId) {
      const role = await getNhanVienRole();
      const user = await User.findById(input.nguoiDungId).populate('vaiTro', 'ten');
      if (!user) throw new AppError('Không tìm thấy người dùng', 404);
      if (user.vaiTro?.ten !== 'nhan_vien' && String(user.vaiTro?._id || user.vaiTro) !== String(role._id)) {
        throw new AppError('Người dùng không có vai trò nhan_vien', 400);
      }

      const existed = await Employee.findOne({ nguoiDungId: input.nguoiDungId });
      if (existed) throw new AppError('Hồ sơ nhân viên đã tồn tại cho người dùng này', 409);

      await Employee.create({
        nguoiDungId: input.nguoiDungId,
        phongBan: input.phongBan || 'sale',
        chucVu: input.chucVu || 'nhan_vien',
        luong: input.luong ?? 0,
        hieuSuat: input.hieuSuat ?? 0,
        ngayVaoLam: input.ngayVaoLam || new Date(),
        trangThai: input.trangThai || 'dang_hoat_dong',
      });
      return getEmployeeById(input.nguoiDungId);
    }

    const { ten, email, tenDangNhap, matKhau, soDienThoai, anhDaiDien } = input;
    if (!ten || !email || !tenDangNhap || !matKhau) {
      throw new AppError('Thiếu ten, email, tenDangNhap hoặc matKhau', 400);
    }
    if (String(matKhau).length < 6) {
      throw new AppError('Mật khẩu tối thiểu 6 ký tự', 400);
    }

    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: String(email).trim().toLowerCase() }),
      User.findOne({ tenDangNhap: String(tenDangNhap).trim() }),
    ]);
    if (emailExists) throw new AppError('Email đã tồn tại', 400);
    if (usernameExists) throw new AppError('Tên đăng nhập đã tồn tại', 400);

    const role = await getNhanVienRole();
    const hashed = await hashPassword(matKhau);

    const newUser = await User.create({
      ten: String(ten).trim(),
      email: String(email).trim().toLowerCase(),
      tenDangNhap: String(tenDangNhap).trim(),
      matKhau: hashed,
      soDienThoai: soDienThoai || undefined,
      vaiTro: role._id,
      anhDaiDien: anhDaiDien || '',
      trangThai: input.userTrangThai || 'hoat_dong',
    });

    await Employee.create({
      nguoiDungId: newUser._id,
      phongBan: input.phongBan || 'sale',
      chucVu: input.chucVu || 'nhan_vien',
      luong: input.luong ?? 0,
      hieuSuat: input.hieuSuat ?? 0,
      ngayVaoLam: input.ngayVaoLam || new Date(),
      trangThai: input.trangThai || 'dang_hoat_dong',
    });

    return getEmployeeById(newUser._id);
  }

  /** Cập nhật theo userId */
  async function updateEmployee(userId, input = {}) {
    validateEmployeeEnums(input);

    const role = await getNhanVienRole();
    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy nhân viên', 404);
    if (String(user.vaiTro) !== String(role._id)) {
      throw new AppError('Người dùng không có vai trò nhan_vien', 404);
    }

    const userPatch = {};
    if (input.ten !== undefined) userPatch.ten = input.ten;
    if (input.email !== undefined) userPatch.email = String(input.email).trim().toLowerCase();
    if (input.tenDangNhap !== undefined) userPatch.tenDangNhap = String(input.tenDangNhap).trim();
    if (input.soDienThoai !== undefined) userPatch.soDienThoai = input.soDienThoai;
    if (input.anhDaiDien !== undefined) userPatch.anhDaiDien = input.anhDaiDien;
    if (input.userTrangThai !== undefined) userPatch.trangThai = input.userTrangThai;
    if (input.matKhau) {
      if (String(input.matKhau).length < 6) {
        throw new AppError('Mật khẩu tối thiểu 6 ký tự', 400);
      }
      userPatch.matKhau = await hashPassword(input.matKhau);
    }

    if (Object.keys(userPatch).length) {
      await User.findByIdAndUpdate(userId, userPatch, { new: true, runValidators: true });
    }

    const empPatch = pick(input, EMPLOYEE_FIELDS);
    if (Object.keys(empPatch).length) {
      const profile = await ensureProfile(userId, input);
      Object.assign(profile, empPatch);
      await profile.save();
    }

    return getEmployeeById(userId);
  }

  /** Xóa user nhan_vien + hồ sơ NhanVien (nếu có). :id = userId */
  async function deleteEmployee(userId) {
    const role = await getNhanVienRole();
    const user = await User.findById(userId);
    if (!user) throw new AppError('Không tìm thấy nhân viên', 404);
    if (String(user.vaiTro) !== String(role._id)) {
      throw new AppError('Người dùng không có vai trò nhan_vien', 404);
    }

    const profile = await Employee.findOneAndDelete({ nguoiDungId: userId });
    const deletedUser = await User.findByIdAndDelete(userId);

    return { user: deletedUser, nhanVien: profile };
  }

  async function searchEmployees(keyword = '') {
    const { data } = await getAllEmployees({ q: keyword, page: 1, limit: 100 });
    if (data.length === 0) {
      throw new AppError('Không tìm thấy nhân viên', 404);
    }
    return data;
  }

  return {
    listStaffUsers,
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
  };
}

const employeeService = createEmployeeService();
export default employeeService;
