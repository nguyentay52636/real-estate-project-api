import multer from 'multer';
import path from 'path';
import { getLocalDir } from '#infra/storage/localUploadService.js';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/opus',
];

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

const mediaFilter = (req, file, cb) => {
  const folder = String(req.query.folder || '');
  const allowAudio = folder === 'chat-audio' || folder.startsWith('chat');
  const mime = String(file.mimetype || '').split(';')[0].trim();

  if (IMAGE_TYPES.includes(mime)) {
    cb(null, true);
    return;
  }
  if (allowAudio && (AUDIO_TYPES.includes(mime) || mime.startsWith('audio/'))) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      allowAudio
        ? 'Chỉ hỗ trợ ảnh hoặc audio (webm, wav, mp3, m4a, ogg)'
        : 'Chỉ hỗ trợ file ảnh (JPEG, JPG, PNG, GIF, WEBP)',
    ),
  );
};

const uploadLocal = multer({
  storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

export default uploadLocal;
