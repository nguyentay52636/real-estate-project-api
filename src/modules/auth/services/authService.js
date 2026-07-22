import bcrypt from 'bcrypt';
import crypto from 'crypto';
import UserModel from '#models/User.js';
import RefreshTokenModel from '#models/RefreshToken.js';
import CustomerModel from '#models/Customer.js';
import RoleModel from '#models/Role.js';
import OwnerModel from '#models/Owner.js';
import { sendPasswordResetEmail as sendMailDefault, isEmailConfigured as isEmailConfiguredDefault } from '#shared/utils/sendMail.js';
import { enqueueJob } from '#infra/queue/jobQueue.js';
import { JOB_SEND_PASSWORD_RESET } from '#infra/queue/jobHandlers.js';
import {
  generateAccessToken as generateAccessTokenDefault,
  generateRefreshToken as generateRefreshTokenDefault,
  verifyRefreshToken as verifyRefreshTokenDefault,
} from '#shared/utils/jwt.js';
import { AppError } from '#shared/errors/AppError.js';

/**
 * Factory có thể inject dependency — unit test không cần Mongo/Express.
 */
export function createAuthService(deps = {}) {
  const User = deps.User ?? UserModel;
  const RefreshToken = deps.RefreshToken ?? RefreshTokenModel;
  const Customer = deps.Customer ?? CustomerModel;
  const Role = deps.Role ?? RoleModel;
  const Owner = deps.Owner ?? OwnerModel;
  const hashPassword = deps.hashPassword ?? ((password) => bcrypt.hash(password, 10));
  const comparePassword = deps.comparePassword ?? ((plain, hash) => bcrypt.compare(plain, hash));
  const generateAccessToken = deps.generateAccessToken ?? generateAccessTokenDefault;
  const generateRefreshToken = deps.generateRefreshToken ?? generateRefreshTokenDefault;
  const verifyRefreshToken = deps.verifyRefreshToken ?? verifyRefreshTokenDefault;
  const sendMail = deps.sendMail ?? sendMailDefault;
  const isEmailConfigured = deps.isEmailConfigured ?? isEmailConfiguredDefault;
  const enqueue = deps.enqueueJob ?? enqueueJob;
  const now = deps.now ?? (() => Date.now());

  async function deliverPasswordResetEmail(payload) {
    // Unit tests inject sendMail → gửi sync để assert được.
    // Production (không inject) → queue nền, không block request.
    if (Object.prototype.hasOwnProperty.call(deps, 'sendMail')) {
      return sendMail(payload);
    }
    return enqueue(JOB_SEND_PASSWORD_RESET, payload);
  }

  async function register(input) {
    if (input.matKhau !== input.xacNhanMatKhau) {
      throw new AppError('Mật khẩu xác nhận không khớp', 400);
    }

    const roleName = input.vaiTro || 'nguoi_thue';

    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: input.email }),
      User.findOne({ tenDangNhap: input.tenDangNhap }),
    ]);

    if (emailExists) {
      throw new AppError('Email already exists', 400);
    }
    if (usernameExists) {
      throw new AppError('Username already exists', 400);
    }

    let vaiTro = await Role.findOne({ ten: roleName });
    if (!vaiTro) {
      vaiTro = await Role.create({
        ten: roleName,
        moTa: `Vai trò ${roleName}`,
      });
    }

    const hashedPassword = await hashPassword(input.matKhau);
    const newUser = await User.create({
      ten: input.ten,
      email: input.email,
      tenDangNhap: input.tenDangNhap,
      matKhau: hashedPassword,
      soDienThoai: input.soDienThoai,
      vaiTro: vaiTro._id,
    });

    let customer = null;
    let chuTro = null;

    if (roleName === 'nguoi_thue') {
      customer = await Customer.create({ nguoiDungId: newUser._id });
    }
    if (roleName === 'chu_tro') {
      chuTro = await Owner.create({ nguoiDungId: newUser._id });
    }

    const userDoc = typeof newUser.toObject === 'function' ? newUser.toObject() : { ...newUser };
    delete userDoc.matKhau;

    return { user: userDoc, customer, chuTro };
  }

  async function login({ tenDangNhap, matKhau }) {
    const user = await User.findOne({ tenDangNhap }).populate('vaiTro');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValid = await comparePassword(matKhau, user.matKhau);
    if (!isValid) {
      throw new AppError('Password is incorrect', 400);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await RefreshToken.create({ token: refreshToken, userId: user._id });

    const userDoc = user._doc ?? user;
    const { matKhau: _ignored, ...userData } = userDoc;

    return { user: userData, accessToken, refreshToken };
  }

  async function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Not authenticated', 401);
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      throw new AppError('Invalid refresh token', 403);
    }

    const userData = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(userData);
    const newRefreshToken = generateRefreshToken(userData);

    await RefreshToken.deleteOne({ token: refreshToken });
    await RefreshToken.create({
      token: newRefreshToken,
      userId: userData.id,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async function logout(refreshToken) {
    if (!refreshToken) {
      return { alreadyLoggedOut: true };
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    return { alreadyLoggedOut: false };
  }

  async function forgotPassword(email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!isEmailConfigured()) {
        throw new AppError(
          'Hệ thống chưa cấu hình gửi email. Vui lòng liên hệ quản trị viên.',
          503,
        );
      }

      const resetToken = user.createPasswordChangedToken();
      await user.save();

      try {
        await deliverPasswordResetEmail({
          email: user.email,
          resetToken,
          recipientName: user.ten,
        });
      } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        throw err;
      }
    }

    return {
      message:
        'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
    };
  }

  async function resetPassword({ token, matKhauMoi, newPassword }) {
    const password = matKhauMoi || newPassword;
    if (!password || !token) {
      throw new AppError('Thiếu token hoặc mật khẩu mới', 400);
    }
    if (String(password).length < 6) {
      throw new AppError('Mật khẩu mới tối thiểu 6 ký tự', 400);
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: now() },
    });

    if (!user) {
      throw new AppError('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);
    }

    user.matKhau = await hashPassword(password);
    user.resetPasswordToken = undefined;
    user.passwordChangedAt = new Date(now());
    user.resetPasswordExpires = undefined;
    await user.save();
    await RefreshToken.deleteMany({ userId: user._id });

    return { success: true, message: 'Đặt lại mật khẩu thành công' };
  }

  async function changePassword(userId, { matKhauCu, matKhauMoi }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    const isValid = await comparePassword(matKhauCu, user.matKhau);
    if (!isValid) {
      throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    if (matKhauCu === matKhauMoi) {
      throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại', 400);
    }

    user.matKhau = await hashPassword(matKhauMoi);
    user.passwordChangedAt = new Date(now());
    await user.save();
    await RefreshToken.deleteMany({ userId: user._id });

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  return {
    register,
    login,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
  };
}

const authService = createAuthService();

export default authService;
