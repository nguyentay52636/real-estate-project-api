import { hasEmbeddingProvider } from './embeddingService.js';
import { hasChatProvider } from './geminiChatService.js';
import { getChatModelChain } from './openRouterService.js';
import logger from '#shared/utils/logger.js';
import { searchProperties, getThresholdForMode } from './vectorSearchService.js';
import { generateAdvisoryReply } from './geminiChatService.js';

const HANDOFF_KEYWORDS = [
  'mặc cả',
  'giảm giá',
  'đặt cọc',
  'giữ phòng',
  'đặt phòng',
  'khiếu nại',
  'phàn nàn',
  'hoàn tiền',
  'bồi thường',
  'gặp trực tiếp',
  'gặp nhân viên',
  'ký hợp đồng',
  'thủ tục pháp lý',
];

function normalizeHistory(conversationHistory = []) {
  return conversationHistory.map((item) => ({
    role: item.role === 'assistant' || item.role === 'ai' ? 'assistant' : 'user',
    content: item.content || item.message || item.text || '',
  }));
}

function shouldHandoffByKeyword(message) {
  const lower = String(message).toLowerCase();
  return HANDOFF_KEYWORDS.some((kw) => lower.includes(kw));
}

function buildHandoffResult({ sessionId, reason, searchScore = null }) {
  return {
    success: true,
    requiresHandOff: true,
    sessionId: sessionId || `session_${Date.now()}`,
    intent: 'HANDOFF',
    aiResponse: null,
    media: [],
    matchedProperties: [],
    searchScore,
    handOffMessage: 'Tôi sẽ kết nối bạn với nhân viên hỗ trợ ngay bây giờ. Vui lòng đợi trong giây lát...',
    handOffReason: reason,
    timestamp: new Date().toISOString(),
  };
}

function buildSuccessResult({ sessionId, answer, property, searchScore }) {
  const media = property.anhUrls?.length ? property.anhUrls : [];
  const matched = {
    _id: property._id,
    tieuDe: property.tieuDe,
    moTa: property.moTa,
    gia: property.gia,
    diaChi: property.diaChi,
    quanHuyen: property.quanHuyen,
    phongNgu: property.phongNgu,
    dienTich: property.dienTich,
    loaiBds: property.loaiBds,
    anhUrls: property.anhUrls,
    anhDaiDien: property.anhDaiDien,
    url: property.url,
  };

  return {
    success: true,
    requiresHandOff: false,
    sessionId,
    aiResponse: answer,
    message: answer,
    media,
    apartments: [matched],
    matchedProperties: [matched],
    searchScore,
    timestamp: new Date().toISOString(),
  };
}

function hasAiProvider() {
  return hasEmbeddingProvider() && hasChatProvider();
}

async function processAdvisoryMessage(message, sessionId, conversationHistory = []) {

  const resolvedSessionId = sessionId || `session_${Date.now()}`;
  const history = normalizeHistory(conversationHistory);

  if (!hasAiProvider()) {
    throw new Error('Cần OPEN_ROUTER_KEY trong .env');
  }

  if (shouldHandoffByKeyword(message)) {
    logger.info('[AI Pipeline] Handoff: từ khóa đặc biệt — chat không gọi');
    return buildHandoffResult({
      sessionId: resolvedSessionId,
      reason: 'Khách hỏi về thương lượng/đặt cọc/khiếu nại — cần nhân viên',
    });
  }

  try {
    const { results, mode } = await searchProperties(message, { limit: 3 });
    const top = results[0];
    const score = top?.score ?? 0;
    const threshold = getThresholdForMode(mode);

    logger.info(
      `[AI Pipeline] Search mode=${mode}, top score=${score.toFixed(3)}, threshold=${threshold}`,
    );

    if (!top || score < threshold) {
      logger.info(
        `[AI Pipeline] Handoff: không khớp BĐS (mode=${mode}, score=${score.toFixed(3)} < ${threshold}) — chat không gọi`,
      );
      return buildHandoffResult({
        sessionId: resolvedSessionId,
        reason: 'Không tìm thấy BĐS phù hợp với yêu cầu',
        searchScore: score,
      });
    }

    const answer = await generateAdvisoryReply({
      userQuestion: message,
      property: top,
      conversationHistory: history,
    });

    return buildSuccessResult({
      sessionId: resolvedSessionId,
      answer,
      property: top,
      searchScore: score,
    });
  } catch (apiError) {
    const modelChain = getChatModelChain();
    const modelSummary = apiError.modelSummary || apiError.message;
    const triedCount = apiError.modelFailures?.length || modelChain.length;

    logger.error(
      `[AI Pipeline] Handoff: hết ${triedCount}/${modelChain.length} model chat — ${modelSummary}`,
    );

    const isCreditError = /402|credit|insufficient/i.test(apiError.message);
    const hint = isCreditError
      ? ' Kiểm tra credit tại https://openrouter.ai/settings/credits hoặc đổi sang model :free trong AI_CHAT_MODELS.'
      : '';

    return {
      ...buildHandoffResult({
        sessionId: resolvedSessionId,
        reason: `Lỗi AI: ${apiError.message}`,
      }),
      handOffMessage:
        `Xin lỗi, AI tạm thời không phản hồi được.${hint} Tôi sẽ kết nối bạn với nhân viên hỗ trợ.`,
    };
  }
}

export { processAdvisoryMessage, shouldHandoffByKeyword };
export default { processAdvisoryMessage, shouldHandoffByKeyword };