/**
 * Mẫu tích hợp FE — Người thuê (nguoi_thue)
 * Copy/adapt vào React/Vue project.
 */
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

/**
 * Bước 1: Gửi tin nhắn AI — bắt buộc có userId + sessionId
 */
export async function sendAIMessage({ message, sessionId, userId, customerName, conversationHistory = [], accessToken }) {
  const res = await fetch(`${API_BASE}/ai-chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { token: accessToken } : {}),
    },
    body: JSON.stringify({
      message,
      sessionId,
      userId,
      customerName,
      conversationHistory,
    }),
  });
  return res.json();
}

/**
 * Bước 2 (tuỳ chọn): Tạo ticket thủ công
 */
export async function createHandoffTicket({ sessionId, userId, reason, conversationHistory = [] }) {
  const res = await fetch(`${API_BASE}/ai-chat/handoff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userId, reason, conversationHistory }),
  });
  return res.json();
}

/**
 * Bước 3a: Poll trạng thái (fallback nếu không dùng socket)
 */
export async function pollHandoffStatus(handoffToken, { intervalMs = 4000, onActive } = {}) {
  const timer = setInterval(async () => {
    const res = await fetch(`${API_BASE}/ai-chat/handoff/${handoffToken}/status`);
    const data = await res.json();
    if (data.status === 'active') {
      clearInterval(timer);
      onActive?.(data);
    }
  }, intervalMs);
  return () => clearInterval(timer);
}

/**
 * Bước 3b: Chờ nhân viên qua Socket.IO (khuyến nghị)
 */
export function waitForAgentViaSocket({ accessToken, handoffToken, onAccepted }) {
  const socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket.emit('handoff:join', { handoffToken });
  });

  socket.on('handoff:accepted', (data) => {
    onAccepted?.(data);
  });

  return () => socket.disconnect();
}

/**
 * Bước 4: Vào phòng chat sau khi nhân viên nhận
 */
export function joinChatRoom(socket, roomId) {
  socket.emit('joinRoom', roomId);
  socket.on('message:new', (message) => {
    // render message UI
    console.log('new message', message);
  });
}

/**
 * Luồng đầy đủ — ví dụ gọi từ component
 */
export async function tenantHandoffFlow({ user, accessToken, message, sessionId }) {
  const ai = await sendAIMessage({
    message,
    sessionId,
    userId: user._id || user.id,
    customerName: user.ten,
    accessToken,
  });

  if (!ai.requiresHandOff) {
    return { type: 'ai', response: ai };
  }

  const handoffToken = ai.handoffToken;
  if (!handoffToken) {
    const ticket = await createHandoffTicket({
      sessionId: ai.sessionId,
      userId: user._id || user.id,
      reason: ai.handOffReason,
    });
    return waitForAgent({ accessToken, handoffToken: ticket.handoffToken });
  }

  return waitForAgent({ accessToken, handoffToken });
}

function waitForAgent({ accessToken, handoffToken }) {
  return new Promise((resolve) => {
    waitForAgentViaSocket({
      accessToken,
      handoffToken,
      onAccepted: (data) => resolve({ type: 'handoff', ...data }),
    });
  });
}
