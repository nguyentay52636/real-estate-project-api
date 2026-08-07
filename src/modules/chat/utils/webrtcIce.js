/**
 * ICE servers cho WebRTC — STUN công cộng + TURN từ env (production NAT).
 *
 * Env:
 *   WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
 *   WEBRTC_TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
 *   WEBRTC_TURN_USERNAME=
 *   WEBRTC_TURN_CREDENTIAL=
 */
function splitUrls(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getIceServers() {
  const stunUrls = splitUrls(
    process.env.WEBRTC_STUN_URLS ||
      'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302',
  );

  const servers = [];
  if (stunUrls.length) {
    servers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
  }

  const turnUrls = splitUrls(process.env.WEBRTC_TURN_URLS || '');
  const username = (process.env.WEBRTC_TURN_USERNAME || '').trim();
  const credential = (process.env.WEBRTC_TURN_CREDENTIAL || '').trim();

  if (turnUrls.length && username && credential) {
    servers.push({
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username,
      credential,
    });
  }

  return {
    iceServers: servers,
    hasTurn: Boolean(turnUrls.length && username && credential),
    // 1:1 trong mọi loại phòng (private/group, noi_bo/ho_tro_khach) nếu cả 2 là member
    callModes: {
      privateDm: true,
      groupOneToOne: true,
      cskhOneToOne: true,
      groupConference: false,
    },
  };
}

export default { getIceServers };
