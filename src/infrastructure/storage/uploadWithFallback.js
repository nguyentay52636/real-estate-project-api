import cloudinary from '#infra/storage/cloudinary.js';
import { uploadFromBuffer } from '#infra/storage/cloudinaryService.js';
import { sanitizeFolder, saveBufferLocal } from '#infra/storage/localUploadService.js';

/** Cloudinary dùng resource_type video cho audio (webm, mp3, …). */
export function resolveCloudinaryResourceType(mimetype = '') {
  const mime = String(mimetype).split(';')[0].trim().toLowerCase();
  if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'raw';
}

/**
 * Upload 1 file (ảnh/audio/…): thử Cloudinary trước, lỗi thì lưu local images/.
 * @param {{ mimetype?: string, resourceType?: string }} [opts]
 * @returns {{ url: string, storage: 'cloudinary'|'local', fallbackReason?: string, meta: object }}
 */
export async function uploadBufferWithFallback(buffer, originalName, folder = 'uploads', opts = {}) {
  if (!buffer) {
    throw new Error('Thiếu buffer file');
  }

  const safeFolder = sanitizeFolder(folder);
  const resource_type = opts.resourceType || resolveCloudinaryResourceType(opts.mimetype);

  try {
    const ready = await cloudinary.verifyConnection();
    if (!ready.ok) {
      throw new Error(ready.message || 'Cloudinary chưa sẵn sàng');
    }

    const result = await uploadFromBuffer(buffer, { folder: safeFolder, resource_type });
    return {
      url: result.secure_url,
      storage: 'cloudinary',
      meta: {
        publicId: result.public_id,
        folder: result.folder || safeFolder,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    };
  } catch (cloudError) {
    const local = saveBufferLocal(buffer, originalName, safeFolder);
    return {
      url: local.url,
      storage: 'local',
      fallbackReason: cloudError?.message || String(cloudError),
      meta: {
        path: local.path,
        filename: local.filename,
        folder: local.folder,
      },
    };
  }
}

/** Bỏ URL giả từ Swagger ("string") / rỗng — chỉ giữ http(s) hoặc /images/... */
export function sanitizeMediaUrls(urls = []) {
  const list = Array.isArray(urls) ? urls : urls ? [urls] : [];
  return list
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => {
      if (!u) return false;
      const lower = u.toLowerCase();
      if (lower === 'string' || lower === 'null' || lower === 'undefined') return false;
      return (
        u.startsWith('http://') ||
        u.startsWith('https://') ||
        u.startsWith('/images/')
      );
    });
}

export function sanitizeMediaUrl(url) {
  const [first] = sanitizeMediaUrls(url ? [url] : []);
  return first || '';
}

export default { uploadBufferWithFallback, sanitizeMediaUrls, sanitizeMediaUrl, resolveCloudinaryResourceType };
