import multer from 'multer';
import path from 'path';
import { getLocalDir } from '../utils/localUploadService.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { dir } = getLocalDir(req.query.folder);
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ hỗ trợ file ảnh (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

const uploadLocal = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default uploadLocal;
