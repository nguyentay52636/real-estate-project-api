import bcrypt from 'bcrypt';
import crypto from 'crypto';
import UserModel from '#models/User.js';
import RefreshTokenModel from '#models/RefreshToken.js';
import CustomerModel from '#models/Customer.js';
import RoleModel from '#models/Role.js';
import OwnerModel from '#models/Owner.js';
import sendMailDefault from '#shared/utils/sendMail.js';
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
  const now = deps.now ?? (() => Date.now());

  async function register(input) {
    if (input.matKhau !== input.xacNhanMatKhau) {
      throw new AppError('Mật khẩu xác nhận không khớp', 400);
    }

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

    let vaiTro = await Role.findOne({ ten: input.vaiTro });
    if (!vaiTro) {
      vaiTro = await Role.create({
        ten: input.vaiTro,
        moTa: `Vai trò ${input.vaiTro}`,
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

    if (input.vaiTro === 'nguoi_thue') {
      customer = await Customer.create({ nguoiDungId: newUser._id });
    }
    if (input.vaiTro === 'chu_tro') {
      chuTro = await Owner.create({ nguoiDungId: newUser._id });
    }

    return { user: newUser, customer, chuTro };
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
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const resetToken = user.createPasswordChangedToken();
    await user.save();
    const mailResult = await sendMail({ email, resetToken });
    return { resetToken, mailResult };
  }

  async function resetPassword({ newPassword, token }) {
    if (!newPassword || !token) {
      throw new AppError('missing input', 400);
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: now() },
    });

    if (!user) {
      throw new AppError('invalid reset token', 400);
    }

    user.matKhau = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.passwordChangedAt = now();
    user.resetPasswordExpires = undefined;
    await user.save();

    return { success: true };
  }

  return {
    register,
    login,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
  };
}

const authService = createAuthService();

export default authService;
