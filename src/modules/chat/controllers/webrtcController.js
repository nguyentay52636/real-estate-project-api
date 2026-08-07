import { getIceServers } from '#modules/chat/utils/webrtcIce.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

/** GET /api/webrtc/ice-servers — FE dùng khi tạo RTCPeerConnection */
export const getIceServersHandler = asyncHandler(async (_req, res) => {
  return res.status(200).json(getIceServers());
});

export default { getIceServersHandler };
