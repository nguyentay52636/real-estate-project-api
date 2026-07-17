import { uploadFromBuffer } from '#infra/storage/cloudinaryService.js';
import cloudinary from '#infra/storage/cloudinary.js';
import {
  sanitizeFolder,
  toPublicUrl,
  toRelativePath,
  saveBufferLocal,
} from '#infra/storage/localUploadService.js';

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
   */
  uploadAuto: async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: 'Vui lòng tải lên file (field: file)' });
      }

      const folder = sanitizeFolder(req.query.folder || 'properties');

      try {
        const ready = await cloudinary.verifyConnection();
        if (!ready.ok) {
          throw new Error(ready.message || 'Cloudinary chưa sẵn sàng');
        }

        const result = await uploadFromBuffer(req.file.buffer, { folder });
        return res.status(201).json({
          message: 'Upload thành công (Cloudinary)',
          storage: 'cloudinary',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            folder: result.folder || folder,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
        });
      } catch (cloudError) {
        const local = saveBufferLocal(req.file.buffer, req.file.originalname, folder);
        return res.status(201).json({
          message: 'Upload thành công (local fallback)',
          storage: 'local',
          fallbackReason: cloudError?.message || String(cloudError),
          data: {
            url: local.url,
            path: local.path,
            filename: local.filename,
            folder: local.folder,
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
        });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload', error: error.message });
    }
  },
};

export default uploadController;
