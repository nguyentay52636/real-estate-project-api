import {
  sanitizeFolder,
  toPublicUrl,
  toRelativePath,
} from '#infra/storage/localUploadService.js';
import { uploadBufferWithFallback } from '#infra/storage/uploadWithFallback.js';

function buildUploadResponse(uploaded, file) {
  return {
    message:
      uploaded.storage === 'cloudinary'
        ? 'Upload thành công (Cloudinary)'
        : 'Upload thành công (local fallback sau khi Cloudinary lỗi)',
    storage: uploaded.storage,
    ...(uploaded.fallbackReason ? { fallbackReason: uploaded.fallbackReason } : {}),
    data: {
      url: uploaded.url,
      ...uploaded.meta,
      mimetype: file.mimetype,
      size: file.size,
    },
  };
}

const uploadController = {
  uploadLocal: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'properties');
      const url = toPublicUrl(folder, req.file.filename);

      return res.status(201).json({
        message: 'Upload file local thành công',
        storage: 'local',
        data: {
          url,
          path: toRelativePath(folder, req.file.filename),
          filename: req.file.filename,
          folder,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload local', error: error.message });
    }
  },

  /**
   * Ưu tiên Cloudinary; lỗi config/mạng → local images/.
   * Dùng cho đăng tin Property (anhDaiDien / gallery).
   */
  uploadCloudinary: async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'properties');
      const uploaded = await uploadBufferWithFallback(
        req.file.buffer,
        req.file.originalname,
        folder,
      );

      return res.status(201).json(buildUploadResponse(uploaded, req.file));
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload', error: error.message });
    }
  },

  /**
   * Cùng logic Cloudinary → local (alias khuyến nghị cho FE property).
   */
  uploadAuto: async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'properties');
      const uploaded = await uploadBufferWithFallback(
        req.file.buffer,
        req.file.originalname,
        folder,
      );

      return res.status(201).json(buildUploadResponse(uploaded, req.file));
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload', error: error.message });
    }
  },

  /**
   * Upload nhiều ảnh (gallery property) — từng file Cloudinary → local.
   * Field multipart: `files` (array).
   */
  uploadMany: async (req, res) => {
    try {
      const files = req.files?.length ? req.files : [];
      if (!files.length) {
        return res.status(400).json({ message: 'Vui lòng tải lên ít nhất một ảnh (field: files)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'properties');
      const items = [];

      for (const file of files) {
        if (!file?.buffer) continue;
        const uploaded = await uploadBufferWithFallback(
          file.buffer,
          file.originalname,
          folder,
        );
        items.push({
          storage: uploaded.storage,
          ...(uploaded.fallbackReason ? { fallbackReason: uploaded.fallbackReason } : {}),
          url: uploaded.url,
          ...uploaded.meta,
          mimetype: file.mimetype,
          size: file.size,
        });
      }

      if (!items.length) {
        return res.status(400).json({ message: 'Không có file hợp lệ để upload' });
      }

      return res.status(201).json({
        message: 'Upload nhiều ảnh thành công (Cloudinary ưu tiên, fallback local)',
        total: items.length,
        data: {
          urls: items.map((i) => i.url),
          items,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload nhiều ảnh', error: error.message });
    }
  },
};

export default uploadController;
