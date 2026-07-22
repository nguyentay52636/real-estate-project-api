/**
 * CDN / media helpers — ưu tiên URL Cloudinary tuyệt đối, không proxy qua API.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';

export function isCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url).hostname;
    return host === CLOUDINARY_HOST || host.endsWith('.cloudinary.com');
  } catch {
    return url.includes('cloudinary.com');
  }
}

/**
 * Chuẩn hóa URL media cho response: giữ Cloudinary CDN; local path giữ nguyên (FE tự ghép BASE).
 */
export function toCdnMediaUrl(url, { baseUrl } = {}) {
  if (!url) return url;
  if (isCloudinaryUrl(url) || /^https?:\/\//i.test(url)) return url;
  const base = (baseUrl || process.env.BASE_URL || '').replace(/\/$/, '');
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

/** Cache-Control cho GET public (list/detail property). */
export function publicApiCacheHeaders(maxAgeSeconds = 30) {
  return {
    'Cache-Control': `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
  };
}

export default { isCloudinaryUrl, toCdnMediaUrl, publicApiCacheHeaders };
