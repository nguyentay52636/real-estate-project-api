import cloudinary from '#infra/storage/cloudinary.js';
import { uploadFromBuffer } from '#infra/storage/cloudinaryService.js';
import { sanitizeFolder, saveBufferLocal } from '#infra/storage/localUploadService.js';

/**
 * Upload 1 ảnh: thử Cloudinary trước, lỗi thì lưu local images/.
 * @returns {{ url: string, storage: 'cloudinary'|'local', fallbackReason?: string, meta: object }}
 */
export async function uploadBufferWithFallback(buffer, originalName, folder = 'uploads') {
  if (!buffer) {
    throw new Error('Thiếu buffer ảnh');
  }

  const safeFolder = sanitizeFolder(folder);

  try {
    const ready = await cloudinary.verifyConnection();
    if (!ready.ok) {
      throw new Error(ready.message || 'Cloudinary chưa sẵn sàng');
    }

    const result = await uploadFromBuffer(buffer, { folder: safeFolder });
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

export default { uploadBufferWithFallback, sanitizeMediaUrls, sanitizeMediaUrl };
