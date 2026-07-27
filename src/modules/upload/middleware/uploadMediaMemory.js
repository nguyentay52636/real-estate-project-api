import multer from 'multer';
import { AUDIO_TYPES, IMAGE_TYPES } from './uploadChatMemory.js';

const storage = multer.memoryStorage();

function allowsAudioFolder(req) {
  const folder = String(req.query?.folder || '');
  return folder === 'chat-audio' || folder.startsWith('chat');
}

const mediaFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').split(';')[0].trim();

  if (IMAGE_TYPES.includes(mime)) {
    cb(null, true);
    return;
  }
  if (allowsAudioFolder(req) && (AUDIO_TYPES.includes(mime) || mime.startsWith('audio/'))) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      allowsAudioFolder(req)
        ? 'Chỉ hỗ trợ ảnh hoặc audio (webm, wav, mp3, m4a, ogg)'
        : 'Chỉ hỗ trợ file ảnh (JPEG, JPG, PNG, GIF, WEBP). Audio: dùng ?folder=chat-audio',
    ),
    false,
  );
};

const uploadMediaMemory = multer({
  storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

export default uploadMediaMemory;
