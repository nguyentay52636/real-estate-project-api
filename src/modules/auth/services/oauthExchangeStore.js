import crypto from 'crypto';

/** One-time OAuth exchange codes (in-memory). TTL mặc định 60s. */
const store = new Map();
const DEFAULT_TTL_MS = 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [code, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(code);
  }
}

/**
 * Lưu payload tạm, trả one-time code.
 * @param {object} payload — { accessToken, user }
 * @param {number} [ttlMs]
 */
export function createOAuthExchangeCode(payload, ttlMs = DEFAULT_TTL_MS) {
  purgeExpired();
  const code = crypto.randomBytes(32).toString('hex');
  store.set(code, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
  return code;
}

/**
 * Đổi code lấy payload (một lần). Trả null nếu hết hạn / đã dùng / không tồn tại.
 */
export function consumeOAuthExchangeCode(code) {
  if (!code || typeof code !== 'string') return null;
  purgeExpired();
  const entry = store.get(code);
  if (!entry) return null;
  store.delete(code);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.payload;
}

/** Test helper */
export function _clearOAuthExchangeStore() {
  store.clear();
}

export default { createOAuthExchangeCode, consumeOAuthExchangeCode };
