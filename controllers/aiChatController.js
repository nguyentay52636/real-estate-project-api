
const OpenAI = require('openai');
const logger = require('../utils/logger');
const {
  createHandoffTicket,
  getHandoffStatus,
  acceptHandoffTicket,
  getPendingTickets,
  getActiveNhanVienUsers,
  formatTicketForClient,
  isNhanVien,
  dismissHandoffTicket,
  dismissAllHandoffNotifications,
} = require('../services/handoffService');

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

const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPEN_ROUTER_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
    'X-Title': 'Real Estate CRM',
  },
});

const MODEL_FALLBACK_CHAIN = [
  process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

const AI_MODEL = MODEL_FALLBACK_CHAIN[0];

const apartments = [
  {
    id: 'APT001', title: 'Studio hiện đại Quận 7',
    price: 7500000, district: 'Quận 7', area: 28,
    furniture: 'Đầy đủ nội thất (giường, tủ, bếp, máy lạnh)',
    petPolicy: 'Không cho phép nuôi thú cưng',
    viewingHours: 'Thứ 2 - Thứ 7, 9:00 - 18:00',
    serviceFee: '200.000 VNĐ/tháng (điện nước tính riêng)',
    images: ['https://example.com/apt001_1.jpg', 'https://example.com/apt001_2.jpg'],
    address: '12 Nguyễn Thị Thập, Quận 7, TP.HCM',
  },
  {
    id: 'APT002', title: 'Căn 1 phòng ngủ Quận 1',
    price: 14000000, district: 'Quận 1', area: 45,
    furniture: 'Nội thất cơ bản (giường, tủ, bếp)',
    petPolicy: 'Cho phép nuôi thú cưng nhỏ (dưới 5kg)',
    viewingHours: 'Hàng ngày, 8:00 - 20:00',
    serviceFee: '500.000 VNĐ/tháng (bao gồm điện nước)',
    images: ['https://example.com/apt002_1.jpg'],
    address: '88 Lê Lợi, Quận 1, TP.HCM',
  },
  {
    id: 'APT003', title: 'Studio giá rẻ Bình Thạnh',
    price: 5500000, district: 'Bình Thạnh', area: 22,
    furniture: 'Không nội thất',
    petPolicy: 'Không cho phép nuôi thú cưng',
    viewingHours: 'Thứ 2 - Thứ 6, 8:00 - 17:00',
    serviceFee: '100.000 VNĐ/tháng',
    images: [],
    address: '45 Bùi Hữu Nghĩa, Bình Thạnh, TP.HCM',
  },
];

function buildSystemPrompt() {
  const aptList = apartments.map(a =>
    `- [${a.id}] ${a.title}: Giá ${a.price.toLocaleString('vi-VN')} VNĐ/tháng | ${a.area}m² | ${a.furniture} | Thú cưng: ${a.petPolicy} | Giờ xem: ${a.viewingHours} | Phí DV: ${a.serviceFee} | Địa chỉ: ${a.address}`
  ).join('\n');

  return `Bạn là AI tư vấn bất động sản thông minh của hệ thống Real Estate CRM.

DANH SÁCH CĂN HỘ HIỆN CÓ:
${aptList}

NHIỆM VỤ CỦA BẠN:
Bạn có thể tự trả lời các câu hỏi sau:
- Tìm kiếm căn hộ theo quận, giá, diện tích
- Giá thuê, diện tích, nội thất của từng căn
- Chính sách nuôi thú cưng
- Địa chỉ, khu vực
- Giờ xem phòng
- Phí dịch vụ
- Thông tin chung về thuê nhà

QUAN TRỌNG - KHI NÀO CẦN CHUYỂN NHÂN VIÊN:
Nếu khách hỏi về BẤT KỲ điều nào dưới đây, bạn PHẢI trả về JSON với requiresHandOff: true:
- Thương lượng / mặc cả / giảm giá
- Đặt cọc / giữ phòng / đặt phòng
- Khiếu nại / phàn nàn / không hài lòng  
- Hoàn tiền / bồi thường
- Gặp trực tiếp / gặp nhân viên
- Ký hợp đồng / thủ tục pháp lý phức tạp
- Câu hỏi bạn không chắc chắn

ĐỊNH DẠNG TRẢ LỜI (luôn dùng JSON):
Trường hợp AI trả lời được:
{
  "requiresHandOff": false,
  "answer": "Câu trả lời chi tiết bằng tiếng Việt",
  "matchedApartments": ["APT001", "APT002"]
}

Trường hợp cần nhân viên thực:
{
  "requiresHandOff": true,
  "answer": null,
  "reason": "Lý do cần nhân viên"
}

Luôn trả lời bằng tiếng Việt. Thân thiện, chuyên nghiệp. Chỉ trả về JSON hợp lệ, không thêm text ngoài JSON.`;
}

async function callAIModel(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let lastError = null;
  const failures = [];

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      logger.debug(`[AI] Trying model: ${model}`);
      const completion = await openRouterClient.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 800,
      });

      const rawContent = completion.choices[0]?.message?.content || '{}';

      if (failures.length > 0) {
        logger.info(`[AI] OK ${model} (sau ${failures.length} model lỗi)`);
      } else {
        logger.debug(`[AI] OK ${model}`);
      }

      const jsonMatch =
        rawContent.match(/```json\s*([\s\S]*?)\s*```/) ||
        rawContent.match(/```\s*([\s\S]*?)\s*```/) ||
        rawContent.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;

      try {
        return JSON.parse(jsonStr.trim());
      } catch {
        return { requiresHandOff: false, answer: rawContent, matchedApartments: [] };
      }

    } catch (err) {
      const status = err?.status || err?.response?.status;
      failures.push({ model, status, message: err.message });
      logger.debug(`[AI] ${model} failed (${status}): ${err.message}`);
      lastError = err;

      if (status !== 429 && status < 500) break;
    }
  }

  const summary = failures.map((f) => `${f.model}(${f.status || 'err'})`).join(' → ');
  logger.warn(`[AI] Hết model khả dụng: ${summary}`);
  throw lastError || new Error('All AI models are currently unavailable');
}

async function processUserMessage(message, sessionId, conversationHistory = []) {
  logger.debug(`[AI] Processing: "${String(message).slice(0, 80)}"`);

  const aiResult = await callAIModel(message, conversationHistory);
  const resolvedSessionId = sessionId || `session_${Date.now()}`;

  if (aiResult.requiresHandOff) {
    logger.info(`[AI] Handoff → ${aiResult.reason || 'không rõ lý do'}`);
    return {
      success: true,
      requiresHandOff: true,
      sessionId: resolvedSessionId,
      intent: 'HANDOFF',
      aiResponse: null,
      handOffMessage: 'Tôi sẽ kết nối bạn với nhân viên hỗ trợ ngay bây giờ. Vui lòng đợi trong giây lát...',
      handOffReason: aiResult.reason || 'AI chuyển nhân viên',
      timestamp: new Date().toISOString(),
    };
  }

  const matchedApartments = apartments.filter(a =>
    (aiResult.matchedApartments || []).includes(a.id)
  );

  logger.debug(`[AI] Answered, matched: ${JSON.stringify(aiResult.matchedApartments)}`);

  return {
    success: true,
    requiresHandOff: false,
    sessionId: resolvedSessionId,
    model: AI_MODEL,
    aiResponse: aiResult.answer,
    apartments: matchedApartments,
    timestamp: new Date().toISOString(),
  };
}

exports.processUserMessage = processUserMessage;

exports.sendAIMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const handoffInput = normalizeHandoffPayload(req.body);

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message là bắt buộc' });
    }

    if (!process.env.OPEN_ROUTER_KEY) {
      return res.status(500).json({ success: false, error: 'OPEN_ROUTER_KEY chưa được cấu hình trong .env' });
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


exports.requestHandoff = async (req, res) => {
  try {
    const { sessionId, userId, reason, conversationHistory, customerName } = normalizeHandoffPayload(req.body);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId là bắt buộc (id người thuê đã đăng nhập)',
      });
    }

    const NguoiDung = require('../models/Nguoidung');
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


exports.getHandoffStatus = async (req, res) => {
  try {
    const { handoffToken } = req.params;
    const status = await getHandoffStatus(handoffToken);

    if (!status) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ticket handoff' });
    }

    return res.status(200).json(status);

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


exports.acceptHandoff = async (req, res) => {
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


exports.getPendingHandoffs = async (req, res) => {
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


exports.dismissHandoff = async (req, res) => {
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


exports.dismissAllHandoffs = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const result = await dismissAllHandoffNotifications(agentId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('nhân viên') ? 403 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};


exports.sendHumanMessage = (req, res) => {
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


exports.searchApartment = (req, res) => {
  try {
    const { district, maxPrice, minPrice, furniture, petAllowed } = req.body;

    let results = [...apartments];

    if (district) results = results.filter(a => a.district.toLowerCase().includes(district.toLowerCase()));
    if (maxPrice) results = results.filter(a => a.price <= maxPrice);
    if (minPrice) results = results.filter(a => a.price >= minPrice);
    if (furniture !== undefined) {
      results = results.filter(a =>
        furniture ? !a.furniture.startsWith('Không') : a.furniture.startsWith('Không')
      );
    }
    if (petAllowed !== undefined) {
      results = results.filter(a =>
        petAllowed ? a.petPolicy.startsWith('Cho phép') : !a.petPolicy.startsWith('Cho phép')
      );
    }

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
