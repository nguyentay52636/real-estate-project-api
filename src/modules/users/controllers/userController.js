import fs from 'fs';
import path from 'path';
import userService from '#modules/users/services/userService.js';
import { adminCreateUserValidation } from '#modules/auth/validations/authValidation.js';
import { uploadFromBuffer, destroyByUrl } from '#infra/storage/cloudinaryService.js';
import { getDirname } from '#shared/utils/esm.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';
import { AppError } from '#shared/errors/AppError.js';

const dirname = getDirname(import.meta.url);

function removeLocalAvatar(anhDaiDien) {
  if (!anhDaiDien) return;
  const relativePath = anhDaiDien.startsWith('/') ? anhDaiDien.slice(1) : anhDaiDien;
  if (!relativePath.startsWith('images/')) return;

  const fullPath = path.join(dirname, '..', relativePath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error('Lỗi khi xóa ảnh đại diện cũ:', err);
    }
  }
}

const userController = {
  getAllUser: asyncHandler(async (req, res) => {
    const users = await userService.getAllUser();
    return res.status(200).json({ message: 'get all users success', users });
  }),

  getAllUsers: asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    return res.status(200).json({
      message: 'Lấy danh sách tất cả người dùng thành công',
      users,
    });
  }),

  deleteUser: asyncHandler(async (req, res) => {
    const deletedUser = await userService.deleteUser(req.params.id);
    return res.status(200).json({ message: 'Delete user successfully', deletedUser });
  }),

  getUserById: asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json(user);
  }),

  updateUser: asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    return res.status(200).json({ message: 'Update user successfully', updatedUser });
  }),

  createUser: asyncHandler(async (req, res) => {
    const { error } = adminCreateUserValidation(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { user, customer, chuTro, nhanVien } = await userService.createUser(req.body);
    return res.status(201).json({
      message: 'Register successfully',
      user,
      customer,
      chuTro,
      nhanVien,
    });
  }),

  updateAvatarLocal: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('Vui lòng tải lên một hình ảnh', 400);
    }

    const user = await userService.findRawUserById(id);
    if (!user) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        /* ignore */
      }
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    removeLocalAvatar(user.anhDaiDien);

    const avatarUrl = `/images/${req.file.filename}`;
    const updatedUser = await userService.setAvatar(id, avatarUrl);

    return res.status(200).json({
      message: 'Cập nhật ảnh đại diện thành công',
      updatedUser,
    });
  }),

  updateAvatarCloudinary: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('Vui lòng tải lên một hình ảnh', 400);
    }

    const user = await userService.findRawUserById(id);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    if (user.anhDaiDien?.includes('res.cloudinary.com')) {
      try {
        await destroyByUrl(user.anhDaiDien);
      } catch (err) {
        console.error('Lỗi khi xóa ảnh đại diện cũ trên Cloudinary:', err);
      }
    } else {
      removeLocalAvatar(user.anhDaiDien);
    }

    const result = await uploadFromBuffer(req.file.buffer, {
      folder: 'avatars',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    const updatedUser = await userService.setAvatar(id, result.secure_url);

    return res.status(200).json({
      message: 'Cập nhật ảnh đại diện lên Cloudinary thành công',
      updatedUser,
    });
  }),
};

export default userController;
