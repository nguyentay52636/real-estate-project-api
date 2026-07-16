import User from '#models/User.js';
import RefreshToken from '#models/RefreshToken.js';
import bcrypt from 'bcrypt';
import Customer from '#models/Customer.js';
import VaiTro from '#models/Role.js';
import ChuNha from '#models/Owner.js';
import sendMail from '#shared/utils/sendMail.js';
import crypto from 'crypto';
import { registerValidation,
  loginValidation, } from '#modules/auth/validations/authValidation.js';
import { generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken, } from '#shared/utils/jwt.js';

const authController = {
  register: async (req, res) => {
    const { error } = registerValidation(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    if (req.body.matKhau !== req.body.xacNhanMatKhau)
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });

    try {
      const [emailExists, usernameExists] = await Promise.all([
        User.findOne({ email: req.body.email }),
        User.findOne({ tenDangNhap: req.body.tenDangNhap }),
      ]);
      if (emailExists)
        return res.status(400).json({ message: "Email already exists" });
      if (usernameExists)
        return res.status(400).json({ message: "Username already exists" });

      // Find or create role
      let vaiTro = await VaiTro.findOne({ ten: req.body.vaiTro });
      if (!vaiTro) {
        vaiTro = await VaiTro.create({
          ten: req.body.vaiTro,
          moTa: `Vai trò ${req.body.vaiTro}`,
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.matKhau, 10);

      const newUser = await User.create({
        ten: req.body.ten,
        email: req.body.email,
        tenDangNhap: req.body.tenDangNhap,
        matKhau: hashedPassword,
        soDienThoai: req.body.soDienThoai,
        vaiTro: vaiTro._id,
      });

      // Create role-specific records after user creation
      let customer = null;
      let chuTro = null;

      if (req.body.vaiTro === "nguoi_thue") {
        customer = await Customer.create({
          nguoiDungId: newUser._id,
        });
      }

      if (req.body.vaiTro === "chu_tro") {
        chuTro = await ChuNha.create({
          nguoiDungId: newUser._id,
        });
      }
      return res.status(201).json({
        message: "Register successfully",
        user: newUser,
        customer: customer,
        chuTro: chuTro,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
  },

  login: async (req, res) => {
    try {
      const { error } = loginValidation(req.body);
      if (error)
        return res.status(400).json({ message: error.details[0].message });

      const user = await User.findOne({
        tenDangNhap: req.body.tenDangNhap,
      }).populate("vaiTro");
      if (!user) return res.status(404).json({ message: "User not found" });

      const isValid = await bcrypt.compare(req.body.matKhau, user.matKhau);
      if (!isValid)
        return res.status(400).json({ message: "Password is incorrect" });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await RefreshToken.create({ token: refreshToken, userId: user._id });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });

      const { matKhau, ...userData } = user._doc;
      return res.status(200).json({
        message: "Login successful",
        user: userData,
        accessToken,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
  },

  requestRefreshToken: async (req, res) => {
    try {
      const token = req.cookies.refreshToken;
      if (!token) return res.status(401).json({ message: "Not authenticated" });

      const storedToken = await RefreshToken.findOne({ token });
      if (!storedToken)
        return res.status(403).json({ message: "Invalid refresh token" });

      const userData = verifyRefreshToken(token);
      const newAccessToken = generateAccessToken(userData);
      const newRefreshToken = generateRefreshToken(userData);

      await RefreshToken.deleteOne({ token });
      await RefreshToken.create({
        token: newRefreshToken,
        userId: userData.id,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });

      return res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      return res.status(403).json({ message: "Invalid token", error: err });
    }
  },

  userLogout: async (req, res) => {
    try {
      const token = req.cookies.refreshToken;
      if (!token) return res.status(200).json("Already logged out");
      await RefreshToken.deleteOne({ token });
      res.clearCookie("refreshToken");
      return res.status(200).json("Logout successfully");
    } catch (err) {
      return res.status(500).json({ message: "Logout error", error: err });
    }
  },
  forgotPassword: async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    // tao token
    const resetToken = user.createPasswordChangedToken();
    await user.save();
    const rs = await sendMail({ email, resetToken });
    return res.status(200).json({
      success: true,
      rs,
    });
  },
  resetPassword: async (req, res) => {
    const { newPassword, token } = req.body;
    if (!newPassword || !token) throw new Error('missing input')
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ 
      resetPasswordToken, 
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) throw new Error('invalid reset token');
    user.matKhau = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.passwordChangedAt = Date.now();
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.status(200).json({ 
      success: true,
      mes: 'Password reset successful'
    })
  },
};

export default authController;
