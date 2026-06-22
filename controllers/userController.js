const User = require("../models/nguoidung");
const bcrypt = require("bcrypt");
const { registerValidation } = require("../middleware/authValidation");
const Customer = require("../models/KhachHang");
const VaiTro = require("../models/vaiTro");
const ChuTNha = require("../models/chuNha");
const NhanVien = require("../models/NhanVien");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

const userController = {
  getAllUser: async (req, res) => {
    try {
      const usersList = await User.find().populate('vaiTro');
      return res
        .status(200)
        .json({ message: "get all users success", users: usersList });
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("-matKhau").populate("vaiTro");
      return res.status(200).json({
        message: "Lấy danh sách tất cả người dùng thành công",
        users,
      });
    } catch (error) {
      return res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
  },
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedUserData = await User.findByIdAndDelete(id);
      if (!deletedUserData)
        return res.status(404).json({ message: "User not found" });
      return res
        .status(200)
        .json({
          message: "Delete user successfully",
          deletedUser: deletedUserData,
        });
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id).populate('vaiTro');
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { ten, email, tenDangNhap, matKhau, soDienThoai, vaiTro, anhDaiDien, trangThai } = req.body;

      const userUpdate = {
        ten,
        email,
        tenDangNhap,
        matKhau,
        soDienThoai,
        vaiTro,
        anhDaiDien,
        trangThai,
      };
      if (matKhau) {
        const hashedPassword = await bcrypt.hash(matKhau, 10);
        userUpdate.matKhau = hashedPassword;
      }


      if (vaiTro) {
        let vaiTroDoc = await VaiTro.findOne({ ten: vaiTro });
        if (!vaiTroDoc) {
          vaiTroDoc = await VaiTro.create({
            ten: vaiTro,
            moTa: `Vai trò ${vaiTro}`
          });
        }
        userUpdate.vaiTro = vaiTroDoc._id;
      }

      const updatedUserData = await User.findByIdAndUpdate(id, userUpdate, {
        new: true,
      });
      if (!updatedUserData)
        return res.status(404).json({ message: "User not found" });
      return res
        .status(200)
        .json({ message: "Update user successfully", updatedUser: updatedUserData });
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  createUser: async (req, res) => {
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

      const hashedPassword = await bcrypt.hash(req.body.matKhau, 10);

      let vaiTro = await VaiTro.findOne({ ten: req.body.vaiTro });
      if (!vaiTro) {
        vaiTro = await VaiTro.create({
          ten: req.body.vaiTro,
          moTa: `Vai trò ${req.body.vaiTro}`
        });
      }

      const newUser = await User.create({
        ten: req.body.ten,
        email: req.body.email,
        tenDangNhap: req.body.tenDangNhap,
        matKhau: hashedPassword,
        soDienThoai: req.body.soDienThoai,
        vaiTro: vaiTro._id,
        anhDaiDien: req.body.anhDaiDien,
        trangThai: req.body.trangThai || "hoat_dong",
      });
      var khachHang = null;
      var chuTro = null;
      var nhanVien = null;
      var phanLoai = null;
      if (req.body.vaiTro === "admin") {
        phanLoai = "admin";
        vaiTro = "admin";
      } else if (req.body.vaiTro === "nhan_vien") {
        phanLoai = "nhan_vien";
        vaiTro = "nhan_vien";
        nhanVien = await NhanVien.create({
          nguoiDungId: newUser._id,
        });
      } else if (req.body.vaiTro === "nguoi_thue") {
        phanLoai = "nguoi_thue";
        vaiTro = "nguoi_thue";
        khachHang = await Customer.create({
          nguoiDungId: newUser._id,
        });
      } else if (req.body.vaiTro === "chu_tro") {
        phanLoai = "chu_tro";
        vaiTro = "chu_tro";
        chuTro = await ChuTNha.create({
          nguoiDungId: newUser._id,
        });
      }

      return res.status(201).json({
        message: "Register successfully",
        user: newUser,
        customer: khachHang,
        chuTro: chuTro,
        nhanVien: nhanVien,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
  },
  updateAvatarLocal: async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng tải lên một hình ảnh" });
      }

      const user = await User.findById(id);
      if (!user) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Xóa avatar cũ nếu có và là ảnh local lưu trong images/
      if (user.anhDaiDien) {
        const oldAvatarPath = user.anhDaiDien.startsWith("/")
          ? user.anhDaiDien.slice(1)
          : user.anhDaiDien;

        if (oldAvatarPath.startsWith("images/")) {
          const fullPath = path.join(__dirname, "..", oldAvatarPath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err) {
              console.error("Lỗi khi xóa ảnh đại diện cũ:", err);
            }
          }
        }
      }

      // Cập nhật đường dẫn avatar mới
      const avatarUrl = `/images/${req.file.filename}`;
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { anhDaiDien: avatarUrl },
        { new: true }
      ).populate("vaiTro");

      return res.status(200).json({
        message: "Cập nhật ảnh đại diện thành công",
        updatedUser,
      });
    } catch (error) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      return res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
  },
  updateAvatarCloudinary: async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng tải lên một hình ảnh" });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Xóa avatar cũ trên Cloudinary nếu có
      if (user.anhDaiDien && user.anhDaiDien.includes("res.cloudinary.com")) {
        try {
          const parts = user.anhDaiDien.split('/');
          const uploadIndex = parts.indexOf('upload');
          if (uploadIndex !== -1 && parts.length > uploadIndex + 2) {
            const fileWithExt = parts[parts.length - 1];
            const publicIdWithFolder = parts
              .slice(uploadIndex + 2, parts.length - 1)
              .concat(fileWithExt.split('.')[0])
              .join('/');
            await cloudinary.uploader.destroy(publicIdWithFolder);
          }
        } catch (err) {
          console.error("Lỗi khi xóa ảnh đại diện cũ trên Cloudinary:", err);
        }
      } else if (user.anhDaiDien) {
        // Xóa ảnh cũ cục bộ nếu có
        const oldAvatarPath = user.anhDaiDien.startsWith("/")
          ? user.anhDaiDien.slice(1)
          : user.anhDaiDien;

        if (oldAvatarPath.startsWith("images/")) {
          const fullPath = path.join(__dirname, "..", oldAvatarPath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err) {
              console.error("Lỗi khi xóa ảnh đại diện cũ local:", err);
            }
          }
        }
      }

      // Upload buffer lên Cloudinary
      const uploadFromBuffer = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "avatars" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(fileBuffer);
        });
      };

      const result = await uploadFromBuffer(req.file.buffer);

      // Cập nhật đường dẫn avatar mới
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { anhDaiDien: result.secure_url },
        { new: true }
      ).populate("vaiTro");

      return res.status(200).json({
        message: "Cập nhật ảnh đại diện lên Cloudinary thành công",
        updatedUser,
      });
    } catch (error) {
      return res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
  },
};

module.exports = userController;
