/** Chuẩn hóa origin: bỏ trailing slash */
function normalizeOrigin(url) {
  return String(url || '').trim().replace(/\/$/, '')
}

/**
 * Danh sách origin FE được phép CORS (REST + Socket.IO).
 * - Mặc định: localhost (dev) + Vercel production
 * - Thêm từ CLIENT_URL / CLIENT_URLS (phân cách bằng dấu phẩy)
 */
export function getAllowedOrigins() {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://newlive-sable.vercel.app',
  ]

  const fromEnv = [process.env.CLIENT_URL, process.env.CLIENT_URLS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map(normalizeOrigin)
    .filter(Boolean)

  return [...new Set([...defaults, ...fromEnv])]
}

/** Origin chính dùng cho redirect OAuth / email (phần tử đầu của CLIENT_URL) */
export function getPrimaryClientUrl() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173'
  const first = String(raw).split(',')[0]
  return normalizeOrigin(first) || 'http://localhost:5173'
}

/** Callback cho middleware `cors` — hỗ trợ credentials + nhiều origin */
export function corsOriginDelegate(origin, callback) {
  // Request không có Origin (Postman, server-to-server, same-origin)
  if (!origin) {
    callback(null, true)
    return
  }

  const allowed = getAllowedOrigins()
  if (allowed.includes(normalizeOrigin(origin))) {
    callback(null, true)
    return
  }

  callback(new Error(`Not allowed by CORS: ${origin}`))
}
