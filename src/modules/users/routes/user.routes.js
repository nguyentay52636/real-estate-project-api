import express from 'express';
import userController from '#modules/users/controllers/userController.js';
import middlewareController from '#shared/middleware/auth.js';
import uploadAvatar from '#modules/upload/middleware/uploadAvatar.js';
import uploadMemory from '#modules/upload/middleware/uploadMemory.js';

const router = express.Router();

// GET /api/user - Get all users (yêu cầu đăng nhập — trang admin và danh bạ chat
// trong app đều chỉ gọi khi đã có phiên; không có lý do để mở công khai)
router.get("/", middlewareController.verifyToken, userController.getAllUser);

// GET /api/user/all - Get all users (dedicated endpoint)
router.get("/all", userController.getAllUsers);

// GET /api/user/:id - Get user by ID
router.get("/:id", userController.getUserById);

// POST /api/user - Create new user (admin only — có thể gán bất kỳ vaiTro nào,
// kể cả admin/nhan_vien, nên KHÔNG được để công khai như /auth/register)
router.post("/", middlewareController.verifyAdmin, userController.createUser);

// PUT /api/user/:id - Update user (admin only — cùng lý do: cho phép đổi vaiTro
// của bất kỳ tài khoản nào, nếu mở công khai thì tự nâng quyền chỉ bằng 1 request)
router.put("/:id", middlewareController.verifyAdmin, userController.updateUser);

// DELETE /api/user/:id (admin or self)
router.delete(
  "/:id",
  middlewareController.verifyTokenAndAdminAuth,
  userController.deleteUser
);

// PATCH /api/user/:id/avatar/local - Update user avatar locally
router.patch(
  "/:id/avatar/local",
  uploadAvatar.single("avatar"),
  userController.updateAvatarLocal
);

// PATCH /api/user/:id/avatar/cloudinary - Update user avatar on Cloudinary
router.patch(
  "/:id/avatar/cloudinary",
  uploadMemory.single("avatar"),
  userController.updateAvatarCloudinary
);

export default router;
