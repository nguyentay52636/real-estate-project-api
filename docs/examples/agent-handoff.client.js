/**
 * Mẫu tích hợp FE — Nhân viên (nhan_vien)
 * Copy/adapt vào React/Vue project.
 */
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

/**
 * Kết nối Socket.IO — gọi ngay sau login nếu user.vaiTro.ten === 'nhan_vien'
 */
export function connectAgentHandoffSocket({ accessToken, handlers = {} }) {
  const socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  socket.on('connect', () => handlers.onConnect?.());

  socket.on('handoff:pendingList', ({ tickets }) => {
    handlers.onPendingList?.(tickets);
  });

  socket.on('handoff:newTicket', ({ ticket }) => {
    handlers.onNewTicket?.(ticket);
  });

  socket.on('handoff:ticketRemoved', ({ handoffToken }) => {
    handlers.onTicketRemoved?.(handoffToken);
  });

  socket.on('handoff:notificationRemoved', ({ handoffToken, notificationId }) => {
    handlers.onNotificationRemoved?.({ handoffToken, notificationId });
  });

  socket.on('newNotification', (notification) => {
    if (notification.loai === 'handoff_ticket') {
      handlers.onBellNotification?.(notification);
    }
  });

  socket.on('error', (err) => handlers.onError?.(err));

  return socket;
}

/**
 * REST: Lấy danh sách ticket chờ
 */
export async function fetchPendingTickets(accessToken) {
  const res = await fetch(`${API_BASE}/ai-chat/handoff/pending`, {
    headers: { token: accessToken },
  });
  return res.json();
}

/**
 * Nhận ticket — Cách 1: Socket
 */
export function acceptTicketViaSocket(socket, handoffToken) {
  return new Promise((resolve, reject) => {
    const onSuccess = (data) => {
      cleanup();
      resolve(data);
    };
    const onError = (err) => {
      if (err?.code === 'HANDOFF_ACCEPT_FAILED') {
        cleanup();
        reject(new Error(err.message));
      }
    };
    const cleanup = () => {
      socket.off('handoff:acceptSuccess', onSuccess);
      socket.off('error', onError);
    };

    socket.on('handoff:acceptSuccess', onSuccess);
    socket.on('error', onError);
    socket.emit('handoff:accept', { handoffToken });
  });
}

/**
 * Nhận ticket — Cách 2: REST
 */
export async function acceptTicketViaRest(accessToken, handoffToken) {
  const res = await fetch(`${API_BASE}/ai-chat/handoff/${handoffToken}/accept`, {
    method: 'POST',
    headers: { token: accessToken },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Accept failed');
  return data;
}

/**
 * Refresh danh sách qua socket
 */
export function refreshTicketList(socket) {
  socket.emit('handoff:list');
}

/**
 * Vào phòng chat sau accept
 */
export function openHandoffChatRoom(socket, roomId) {
  socket.emit('joinRoom', roomId);
  return {
    sendMessage(noiDung) {
      socket.emit('message:create', { roomId, noiDung });
    },
    onMessage(callback) {
      socket.on('message:new', callback);
      return () => socket.off('message:new', callback);
    },
  };
}

/**
 * Hook khởi tạo — ví dụ React useEffect
 */
export function setupAgentHandoffUI({ accessToken, onTicketsChange, onNavigateToRoom }) {
  const tickets = new Map();

  const socket = connectAgentHandoffSocket({
    accessToken,
    onPendingList: (list) => {
      tickets.clear();
      list.forEach((t) => tickets.set(t.handoffToken, t));
      onTicketsChange?.(Array.from(tickets.values()));
    },
    onNewTicket: (ticket) => {
      tickets.set(ticket.handoffToken, ticket);
      onTicketsChange?.(Array.from(tickets.values()));
    },
    onTicketRemoved: (handoffToken) => {
      tickets.delete(handoffToken);
      onTicketsChange?.(Array.from(tickets.values()));
    },
    onError: console.error,
  });

  const accept = async (handoffToken) => {
    const result = await acceptTicketViaSocket(socket, handoffToken);
    onNavigateToRoom?.(result.room._id, result);
    return result;
  };

  return { socket, accept, refresh: () => refreshTicketList(socket) };
}
