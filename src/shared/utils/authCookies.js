/**
 * Cookie JWT — access + refresh.
 * Cross-site FE↔API production: SameSite=None + Secure.
 */

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

function isProd() {
  return process.env.NODE_ENV === 'production';
}

/** Parse "15m" | "1h" | "30d" → ms (fallback nếu không parse được). */
export function durationToMs(value, fallbackMs) {
  if (!value || typeof value !== 'string') return fallbackMs;
  const m = value.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (mult[unit] || 1);
}

export function getAuthCookieOptions({ kind = 'access' } = {}) {
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE || (isProd() ? 'none' : 'lax')).toLowerCase();
  const maxAge =
    kind === 'refresh'
      ? durationToMs(process.env.JWT_REFRESH_EXPIRES, 30 * 86_400_000)
      : durationToMs(process.env.JWT_ACCESS_EXPIRES, 15 * 60_000);

  return {
    httpOnly: true,
    secure: isProd() || sameSite === 'none',
    sameSite,
    maxAge,
    path: '/',
  };
}

export function isAccessCookieEnabled() {
  return process.env.AUTH_ACCESS_COOKIE !== 'false';
}

export function setAuthCookies(res, { accessToken, refreshToken } = {}) {
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, getAuthCookieOptions({ kind: 'refresh' }));
  }
  if (accessToken && isAccessCookieEnabled()) {
    res.cookie(ACCESS_COOKIE, accessToken, getAuthCookieOptions({ kind: 'access' }));
  }
}

export function clearAuthCookies(res) {
  const base = {
    httpOnly: true,
    secure: isProd() || (process.env.AUTH_COOKIE_SAMESITE || '').toLowerCase() === 'none',
    sameSite: (process.env.AUTH_COOKIE_SAMESITE || (isProd() ? 'none' : 'lax')).toLowerCase(),
    path: '/',
  };
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(ACCESS_COOKIE, base);
}

export { ACCESS_COOKIE, REFRESH_COOKIE };

export default {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  durationToMs,
  getAuthCookieOptions,
  isAccessCookieEnabled,
  setAuthCookies,
  clearAuthCookies,
};
