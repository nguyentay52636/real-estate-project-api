const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const middlewareController = require('../controllers/middlewareController');
const uploadLocal = require('../middleware/uploadLocal');
const uploadMemory = require('../middleware/uploadMemory');

const handleUploadError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Lỗi upload file' });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: API upload file (local & Cloudinary)
 */

/**
 * @swagger
 * /api/upload/local:
 *   post:
 *     summary: Upload ảnh lưu vào thư mục images/ trong source
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: uploads
 *         description: Thư mục con trong images/ (vd. avatars, properties)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Upload thành công
 *       400:
 *         description: Thiếu file hoặc định dạng không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/local',
  middlewareController.verifyToken,
  uploadLocal.single('file'),
  handleUploadError,
  uploadController.uploadLocal
);

/**
 * @swagger
 * /api/upload/cloudinary:
 *   post:
 *     summary: Upload ảnh lên Cloudinary
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: uploads
 *         description: Folder trên Cloudinary (vd. avatars, properties)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Upload thành công
 *       400:
 *         description: Thiếu file hoặc định dạng không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/cloudinary',
  middlewareController.verifyToken,
  uploadMemory.single('file'),
  handleUploadError,
  uploadController.uploadCloudinary
);

module.exports = router;
