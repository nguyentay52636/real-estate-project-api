import { uploadFromBuffer } from '../utils/cloudinaryService.js';
import { sanitizeFolder,
  toPublicUrl,
  toRelativePath, } from '../utils/localUploadService.js';

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
};

export default uploadController;
