import logger from '../utils/logger.js';
import CrmKnowledge from '../models/CrmKnowledge.js';
import { createHandoffTicket,
  getHandoffStatus as fetchHandoffStatus,
  acceptHandoffTicket,
  getPendingTickets,
  getActiveNhanVienUsers,
  formatTicketForClient,
  isNhanVien,
  dismissHandoffTicket,
  dismissAllHandoffNotifications, } from '../services/handoffService.js';
import { processAdvisoryMessage } from '../services/aiAdvisoryPipeline.js';
import { hasEmbeddingProvider } from '../services/embeddingService.js';
import { hasChatProvider } from '../services/geminiChatService.js';
import NguoiDung from '../models/User.js';

function normalizeHandoffPayload(body = {}) {
  const userId =
    body.userId ||
    body.user_id ||
    body.id ||
    body.user?._id ||
    body.user?.id ||
    null;

  const sessionId =
    body.sessionId ||
    body.session_id ||
    (userId ? `session_${userId}_${Date.now()}` : `session_${Date.now()}`);

  return {
    sessionId,
    userId,
    customerName:
      body.customerName ||
      body.customer_name ||
      body.ten ||
      body.user?.ten ||
      null,
    reason:
      body.reason ||
      body.message ||
      body.lyDo ||
      body.handOffReason ||
      'Yêu cầu kết nối nhân viên',
    conversationHistory:
      body.conversationHistory ||
      body.history ||
      body.messages ||
      [],
  };
}

export async function processUserMessage(message, sessionId, conversationHistory = []) {
  return processAdvisoryMessage(message, sessionId, conversationHistory);
}

export const sendAIMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const handoffInput = normalizeHandoffPayload(req.body);

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message là bắt buộc' });
    }

    if (!hasEmbeddingProvider() || !hasChatProvider()) {
      return res.status(500).json({
        success: false,
        error: 'Cần OPEN_ROUTER_KEY trong .env',
      });
    }

    const result = await processUserMessage(message, handoffInput.sessionId, conversationHistory);

    if (result.requiresHandOff && handoffInput.userId) {
      const { ticket } = await createHandoffTicket({
        sessionId: result.sessionId || handoffInput.sessionId,
        userId: handoffInput.userId,
        reason: result.handOffReason || handoffInput.reason,
        conversationHistory: [
          ...handoffInput.conversationHistory,
          { role: 'user', message, timestamp: new Date().toISOString() },
        ],
        customerName: handoffInput.customerName,
      });
      result.handoffToken = ticket.handoffToken;
      result.ticketId = ticket._id;
      result.status = ticket.trangThai;
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [AI] Error calling OpenRouter:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Lỗi kết nối AI model. Vui lòng thử lại.',
      detail: error.message,
    });
  }
};

export const requestHandoff = async (req, res) => {
  try {
    const { sessionId, userId, reason, conversationHistory, customerName } = normalizeHandoffPayload(req.body);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId là bắt buộc (id người thuê đã đăng nhập)',
      });
    }

    const customer = await NguoiDung.findById(userId).populate('vaiTro', 'ten');
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
    }

    const roleName = customer.vaiTro?.ten;
    const allowedCustomerRoles = ['nguoi_dung', 'nguoi_thue'];
    if (roleName && !allowedCustomerRoles.includes(roleName)) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ tài khoản người dùng (nguoi_thue/nguoi_dung) mới có thể yêu cầu kết nối nhân viên',
      });
    }

    const employees = await getActiveNhanVienUsers();
    if (employees.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'Hiện không có nhân viên (nhan_vien) trực tuyến để hỗ trợ',
      });
    }

    const { ticket, isNew } = await createHandoffTicket({
      sessionId,
      userId,
      reason,
      conversationHistory,
      customerName: customerName || customer.ten,
    });

    return res.status(200).json({
      success: true,
      handoffToken: ticket.handoffToken,
      sessionId: ticket.sessionId,
      status: ticket.trangThai,
      ticket: formatTicketForClient(ticket),
      isNew,
      estimatedWaitTime: '1-3 phút',
      message: 'Yêu cầu chuyển nhân viên đã được ghi nhận. Nhân viên sẽ tham gia cuộc trò chuyện sớm nhất có thể.',
      agentInfo: null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [Handoff] Create ticket failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getHandoffStatus = async (req, res) => {
  try {
    const { handoffToken } = req.params;
    const status = await fetchHandoffStatus(handoffToken);

    if (!status) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ticket handoff' });
    }

    return res.status(200).json(status);

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const acceptHandoff = async (req, res) => {
  try {
    const { handoffToken } = req.params;
    const agentId = req.user?.id;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Bạn chưa đăng nhập' });
    }

    const agentIsNhanVien = await isNhanVien(agentId);
    if (!agentIsNhanVien) {
      return res.status(403).json({ success: false, error: 'Chỉ nhân viên mới có thể nhận ticket' });
    }

    const result = await acceptHandoffTicket(handoffToken, agentId);
    return res.status(200).json(result);

  } catch (error) {
    const statusCode = error.message.includes('đã được') ? 409 : 400;
    return res.status(statusCode).json({ success: false, error: error.message });
  }
};

export const getPendingHandoffs = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const agentIsNhanVien = await isNhanVien(agentId);

    if (!agentIsNhanVien) {
      return res.status(403).json({ success: false, error: 'Chỉ nhân viên mới xem được danh sách ticket' });
    }

    const tickets = await getPendingTickets(agentId);
    return res.status(200).json({
      success: true,
      total: tickets.length,
      tickets,
      data: tickets,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const dismissHandoff = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const { handoffToken } = req.params;

    if (!handoffToken) {
      return res.status(400).json({ success: false, error: 'handoffToken là bắt buộc' });
    }

    const result = await dismissHandoffTicket(handoffToken, agentId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('nhân viên') ? 403 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};

export const dismissAllHandoffs = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const result = await dismissAllHandoffNotifications(agentId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('nhân viên') ? 403 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};

export const sendHumanMessage = (req, res) => {
  try {
    const { handoffToken, agentId, agentName, message, sessionId } = req.body;

    if (!handoffToken || !message || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'handoffToken, agentId và message là bắt buộc',
      });
    }

    console.log(`👤 [Agent] ${agentName || agentId} sent message to session ${sessionId}`);

    // TODO: Broadcast via Socket.IO to customer session
    return res.status(200).json({
      success: true,
      messageId: `msg_${Date.now()}`,
      handoffToken,
      sessionId,
      sender: {
        type: 'human_agent',
        agentId,
        agentName: agentName || 'Nhân viên hỗ trợ',
      },
      message,
      deliveredAt: new Date().toISOString(),
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const searchApartment = async (req, res) => {
  try {
    const { district, maxPrice, minPrice, quanHuyen } = req.body;

    const filter = { trangThai: 'active' };
    if (district || quanHuyen) {
      filter.quanHuyen = new RegExp(district || quanHuyen, 'i');
    }
    if (maxPrice) filter.gia = { ...filter.gia, $lte: maxPrice };
    if (minPrice) filter.gia = { ...filter.gia, $gte: minPrice };

    const results = await CrmKnowledge.find(filter)
      .select('-embedding')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      total: results.length,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
