import { uploadFromBuffer } from '#infra/storage/cloudinaryService.js';
import {
  sanitizeFolder,
  toPublicUrl,
  toRelativePath,
} from '#infra/storage/localUploadService.js';
import { uploadBufferWithFallback } from '#infra/storage/uploadWithFallback.js';

const uploadController = {
  uploadLocal: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder);
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

  uploadCloudinary: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'uploads');
      const result = await uploadFromBuffer(req.file.buffer, { folder });

      return res.status(201).json({
        message: 'Upload file lên Cloudinary thành công',
        storage: 'cloudinary',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          folder: result.folder,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload Cloudinary', error: error.message });
    }
  },

  /**
   * Ưu tiên Cloudinary; nếu thiếu config / lỗi mạng → lưu local.
   * Field multipart: `file`
   * (Tương đương FE: thử /cloudinary rồi fallback /local)
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

      return res.status(201).json({
        message:
          uploaded.storage === 'cloudinary'
            ? 'Upload thành công (Cloudinary)'
            : 'Upload thành công (local fallback)',
        storage: uploaded.storage,
        ...(uploaded.fallbackReason ? { fallbackReason: uploaded.fallbackReason } : {}),
        data: {
          url: uploaded.url,
          ...uploaded.meta,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload', error: error.message });
    }
  },
};

export default uploadController;
