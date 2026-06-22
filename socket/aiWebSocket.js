const { WebSocketServer } = require('ws');
const { processUserMessage } = require('../controllers/aiChatController');
const { createHandoffTicket } = require('../services/handoffService');

const WS_PATH = '/ws';

function parseIncomingPayload(raw) {
  const text = raw.toString().trim();

  if (!text) {
    return { kind: 'invalid', error: 'Tin nhắn trống' };
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return {
      kind: 'chat',
      message: text,
      sessionId: null,
      conversationHistory: [],
    };
  }

  if (typeof payload === 'string') {
    return {
      kind: 'chat',
      message: payload,
      sessionId: null,
      conversationHistory: [],
    };
  }

  const type = payload.type || payload.action || payload.event;

  if (type === 'ping') {
    return { kind: 'ping' };
  }

  const chatTypes = new Set([
    'message', 'chat', 'user_message', 'send', 'ask', 'chat_message', 'user',
  ]);

  const message =
    payload.message ??
    payload.content ??
    payload.text ??
    payload.query ??
    payload.prompt ??
    payload.data?.message ??
    payload.data?.content;

  if (chatTypes.has(type) || (!type && message)) {
    return {
      kind: 'chat',
      message,
      sessionId: payload.sessionId ?? payload.session_id ?? payload.data?.sessionId ?? null,
      userId: payload.userId ?? payload.user_id ?? payload.data?.userId ?? null,
      customerName: payload.customerName ?? payload.customer_name ?? null,
      conversationHistory: payload.conversationHistory ?? payload.history ?? payload.messages ?? [],
    };
  }

  if (message) {
    return {
      kind: 'chat',
      message,
      sessionId: payload.sessionId ?? payload.session_id ?? null,
      userId: payload.userId ?? payload.user_id ?? null,
      customerName: payload.customerName ?? payload.customer_name ?? null,
      conversationHistory: payload.conversationHistory ?? payload.history ?? [],
    };
  }

  return { kind: 'unsupported', type: type || 'unknown', payload };
}

async function handleChatMessage(ws, { message, sessionId, userId, customerName, conversationHistory }) {
  if (!message || !String(message).trim()) {
    ws.send(JSON.stringify({
      type: 'error',
      success: false,
      error: 'message là bắt buộc',
    }));
    return;
  }

  if (!process.env.OPEN_ROUTER_KEY) {
    ws.send(JSON.stringify({
      type: 'error',
      success: false,
      error: 'OPEN_ROUTER_KEY chưa được cấu hình trong .env',
    }));
    return;
  }

  try {
    ws.send(JSON.stringify({
      type: 'typing',
      success: true,
      sessionId: sessionId || null,
    }));

    const result = await processUserMessage(message, sessionId, conversationHistory);
    const responseType = result.requiresHandOff ? 'handoff' : 'ai_response';

    if (result.requiresHandOff) {
      try {
        const { ticket } = await createHandoffTicket({
          sessionId: result.sessionId,
          userId,
          reason: result.handOffReason,
          conversationHistory: [
            ...conversationHistory,
            { role: 'user', message, timestamp: new Date().toISOString() },
          ],
          customerName,
        });

        result.handoffToken = ticket.handoffToken;
        result.ticketId = ticket._id;
        result.status = ticket.trangThai;
      } catch (ticketError) {
        console.error('❌ [AI WS] Create handoff ticket failed:', ticketError.message);
      }
    }

    ws.send(JSON.stringify({
      type: responseType,
      ...result,
      message: result.aiResponse || result.handOffMessage || null,
      content: result.aiResponse || result.handOffMessage || null,
    }));
  } catch (error) {
    console.error('❌ [AI WS] Error:', error.message);
    ws.send(JSON.stringify({
      type: 'error',
      success: false,
      error: 'Lỗi kết nối AI model. Vui lòng thử lại.',
      detail: error.message,
    }));
  }
}

function setupAiWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname !== WS_PATH) {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    console.log('🤖 [AI WS] Client connected');

    ws.send(JSON.stringify({
      type: 'ready',
      success: true,
      message: 'AI server sẵn sàng',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', async (raw) => {
      const parsed = parseIncomingPayload(raw);
      console.log('🤖 [AI WS] Incoming:', parsed.kind === 'unsupported' ? parsed.payload : { kind: parsed.kind, preview: parsed.message?.slice?.(0, 80) });

      if (parsed.kind === 'invalid') {
        ws.send(JSON.stringify({ type: 'error', success: false, error: parsed.error }));
        return;
      }

      if (parsed.kind === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          success: true,
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      if (parsed.kind === 'chat') {
        await handleChatMessage(ws, parsed);
        return;
      }

      ws.send(JSON.stringify({
        type: 'error',
        success: false,
        error: `Loại message không hỗ trợ: ${parsed.type}`,
      }));
    });

    ws.on('close', () => {
      console.log('🤖 [AI WS] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('❌ [AI WS] Socket error:', error.message);
    });
  });

  console.log(`🤖 AI WebSocket server ready at ${WS_PATH}`);
  return wss;
}

module.exports = { setupAiWebSocket, WS_PATH };
