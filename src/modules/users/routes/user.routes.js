import express from 'express';
import userController from '#modules/users/controllers/userController.js';
import middlewareController from '#shared/middleware/auth.js';
import uploadAvatar from '#modules/upload/middleware/uploadAvatar.js';
import uploadMemory from '#modules/upload/middleware/uploadMemory.js';

const router = express.Router();

// GET /api/user - Get all users
router.get("/", userController.getAllUser);

// GET /api/user/all - Get all users (dedicated endpoint)
router.get("/all", userController.getAllUsers);

// GET /api/user/:id - Get user by ID
router.get("/:id", userController.getUserById);

// POST /api/user - Create new user
router.post("/", userController.createUser);

// PUT /api/user/:id - Update user
router.put("/:id", userController.updateUser);

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
