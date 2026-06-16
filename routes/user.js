const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const middlewareController = require("../controllers/middlewareController");
const uploadAvatar = require("../middleware/uploadAvatar");
const uploadMemory = require("../middleware/uploadMemory");

// GET /api/user - Get all users
router.get("/", userController.getAllUser);

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

module.exports = router;
