import {
  uploadBufferWithFallback,
  sanitizeMediaUrls,
} from '#infra/storage/uploadWithFallback.js';

const AUDIO_EXT = /\.(webm|mp3|m4a|ogg|wav|aac|opus)(\?|$)/i;

export function parseTapTinBody(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* single URL string */
    }
    return [trimmed];
  }
  return [];
}

export async function uploadChatAttachments(files = []) {
  const urls = [];
  for (const file of files) {
    if (!file?.buffer) continue;
    const folder = file.mimetype?.startsWith('audio/') ? 'chat-audio' : 'chat-media';
    const uploaded = await uploadBufferWithFallback(
      file.buffer,
      file.originalname,
      folder,
      { mimetype: file.mimetype },
    );
    urls.push(uploaded.url);
  }
  return urls;
}

export function inferLoaiTinNhan({ loaiTinNhan, tapTin = [], files = [] }) {
  if (loaiTinNhan && !['text', ''].includes(loaiTinNhan)) return loaiTinNhan;

  const hasAudioFile = files.some((f) => f.mimetype?.startsWith('audio/'));
  const hasAudioUrl = tapTin.some((u) => AUDIO_EXT.test(u) || u.includes('/chat-audio/'));
  if (hasAudioFile || hasAudioUrl) return 'audio';

  if (tapTin.length || files.some((f) => f.mimetype?.startsWith('image/'))) return 'image';
  return loaiTinNhan || 'text';
}

export function buildMessagePayload(body = {}, files = []) {
  const bodyUrls = sanitizeMediaUrls(parseTapTinBody(body.tapTin));
  const loaiTinNhan = inferLoaiTinNhan({ loaiTinNhan: body.loaiTinNhan, tapTin: bodyUrls, files });

  return {
    roomId: body.roomId,
    noiDung: body.noiDung || '',
    tapTin: bodyUrls,
    phanHoiTinNhan: body.phanHoiTinNhan || null,
    loaiTinNhan,
    mentions: body.mentions || undefined,
  };
}

export async function buildMessagePayloadWithUploads(body = {}, files = []) {
  const uploadedUrls = await uploadChatAttachments(files);
  const bodyUrls = sanitizeMediaUrls(parseTapTinBody(body.tapTin));
  const tapTin = [...uploadedUrls, ...bodyUrls];
  const loaiTinNhan = inferLoaiTinNhan({ loaiTinNhan: body.loaiTinNhan, tapTin, files });

  return {
    roomId: body.roomId,
    noiDung: body.noiDung || '',
    tapTin,
    phanHoiTinNhan: body.phanHoiTinNhan || null,
    loaiTinNhan,
    mentions: body.mentions || undefined,
  };
}
