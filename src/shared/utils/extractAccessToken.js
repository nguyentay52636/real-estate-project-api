import { ACCESS_COOKIE } from '#shared/utils/authCookies.js';

/**
 * Dual auth: Authorization / token header trước, rồi cookie httpOnly accessToken.
 */
export function extractAccessToken(req) {
  const header = req.headers?.token || req.headers?.authorization;
  if (header) {
    return String(header).replace(/^bearer\s+/i, '').trim() || null;
  }
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  return fromCookie ? String(fromCookie).trim() : null;
}

/** Socket.IO handshake — auth.token | Authorization | cookie */
export function extractSocketAccessToken(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (fromAuth) return String(fromAuth).replace(/^bearer\s+/i, '').trim();

  const authHeader = socket.handshake?.headers?.authorization;
  if (authHeader) return String(authHeader).replace(/^bearer\s+/i, '').trim();

  const raw = socket.handshake?.headers?.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default { extractAccessToken, extractSocketAccessToken };
