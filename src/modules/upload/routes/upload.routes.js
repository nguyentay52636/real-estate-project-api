import express from 'express';
import uploadController from '#modules/upload/controllers/uploadController.js';
import middlewareController from '#shared/middleware/auth.js';
import uploadLocal from '#modules/upload/middleware/uploadLocal.js';
import uploadMediaMemory from '#modules/upload/middleware/uploadMediaMemory.js';
import uploadChatMemory from '#modules/upload/middleware/uploadChatMemory.js';

const router = express.Router();

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
 *     summary: Upload ảnh (ưu tiên Cloudinary, lỗi → local)
 *     description: |
 *       Thử Cloudinary trước. Nếu thiếu env / lỗi mạng thì lưu `images/{folder}/`.
 *       Response `storage: cloudinary | local`. Dùng cho đăng tin Property.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: properties
 *         description: Folder Cloudinary hoặc thư mục con trong images/
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
 *         description: Upload thành công (cloudinary hoặc local fallback)
 *       400:
 *         description: Thiếu file hoặc định dạng không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/cloudinary',
  middlewareController.verifyToken,
  uploadMediaMemory.single('file'),
  handleUploadError,
  uploadController.uploadCloudinary
);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload 1 ảnh (Cloudinary → local) — khuyến nghị cho Property
 *     description: |
 *       Giống `/cloudinary`: thử Cloudinary trước, lỗi thì local.
 *       `folder` mặc định `properties`.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: properties
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
 *         description: Thiếu file
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/',
  middlewareController.verifyToken,
  uploadMediaMemory.single('file'),
  handleUploadError,
  uploadController.uploadAuto
);

/**
 * @swagger
 * /api/upload/many:
 *   post:
 *     summary: Upload nhiều ảnh gallery Property (Cloudinary → local từng file)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: properties
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Upload thành công — data.urls[]
 *       400:
 *         description: Thiếu files
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/many',
  middlewareController.verifyToken,
  uploadMediaMemory.array('files', 12),
  handleUploadError,
  uploadController.uploadMany
);

/**
 * @swagger
 * /api/upload/chat-audio:
 *   post:
 *     summary: Upload audio tin nhắn chat (Cloudinary → local)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           default: chat-audio
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
 *         description: Upload audio thành công — dùng data.url trong tapTin khi gửi tin nhắn
 *       400:
 *         description: Thiếu file hoặc định dạng không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/chat-audio',
  middlewareController.verifyToken,
  uploadChatMemory.single('file'),
  handleUploadError,
  uploadController.uploadChatAudio
);

export default router;
