import multer from 'multer';

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

const storage = multer.memoryStorage();

const chatMediaFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').split(';')[0].trim();

  if (IMAGE_TYPES.includes(mime)) {
    cb(null, true);
    return;
  }
  if (AUDIO_TYPES.includes(mime) || mime.startsWith('audio/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Chat chỉ hỗ trợ ảnh hoặc audio (webm, wav, mp3, m4a, ogg)'), false);
};

const uploadChatMemory = multer({
  storage,
  fileFilter: chatMediaFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

export { IMAGE_TYPES, AUDIO_TYPES };
export default uploadChatMemory;
