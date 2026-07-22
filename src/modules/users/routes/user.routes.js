import express from 'express';
import userController from '#modules/users/controllers/userController.js';
import middlewareController from '#shared/middleware/auth.js';
import { attachAuthUser } from '#shared/middleware/attachAuthUser.js';
import uploadAvatar from '#modules/upload/middleware/uploadAvatar.js';
import uploadMemory from '#modules/upload/middleware/uploadMemory.js';

const router = express.Router();

const requireAuth = [middlewareController.verifyToken, attachAuthUser];

// GET /api/user — danh bạ công khai (ten/avatar/role), cần đăng nhập
router.get('/', ...requireAuth, userController.getAllUser);

// GET /api/user/all — full profile, admin only
router.get('/all', middlewareController.verifyAdmin, userController.getAllUsers);

router.put('/me', ...requireAuth, userController.updateMyProfile);

// GET /api/user/:id — self/staff: full; khác: public fields
router.get('/:id', ...requireAuth, userController.getUserById);

router.post('/', middlewareController.verifyAdmin, userController.createUser);
router.put('/:id', middlewareController.verifyAdmin, userController.updateUser);
router.delete(
  '/:id',
  middlewareController.verifyTokenAndAdminAuth,
  userController.deleteUser,
);

router.patch(
  '/:id/avatar/local',
  ...requireAuth,
  uploadAvatar.single('avatar'),
  userController.updateAvatarLocal,
);

router.patch(
  '/:id/avatar/cloudinary',
  ...requireAuth,
  uploadMemory.single('avatar'),
  userController.updateAvatarCloudinary,
);

export default router;
