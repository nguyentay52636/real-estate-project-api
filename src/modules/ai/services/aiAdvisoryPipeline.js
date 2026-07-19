import { hasEmbeddingProvider } from './embeddingService.js';
import { hasChatProvider } from './geminiChatService.js';
import { getChatModelChain } from './openRouterService.js';
import logger from '#shared/utils/logger.js';
import { searchProperties, getThresholdForMode } from './vectorSearchService.js';
import { generateAdvisoryReply } from './geminiChatService.js';
import { fuzzyPhraseIncluded } from '#shared/utils/fuzzyMatch.js';
import { fetchCatalogFromApi } from './crmKnowledgeCatalogClient.js';
import { districtDistance, findNearestByDistrict } from './hcmcGeography.js';

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

// Lời chào / xã giao ngắn — không nên bị coi là "không tìm thấy BĐS" rồi chuyển nhân viên
const GREETING_ONLY_PATTERN =
  /^(a ?lô|alo+|xin chào|chào( bạn| shop| ạ)?|hi|hey|hello+|ê|oi|ơi|test|ok(ay)?|oke|được( không)?|cảm ơn( bạn| nhiều)?|thank(s| you)?|tạm biệt|bye)[\s!.,?]*$/i;

function normalizeHistory(conversationHistory = []) {
  return conversationHistory.map((item) => ({
    role: item.role === 'assistant' || item.role === 'ai' ? 'assistant' : 'user',
    content: item.content || item.message || item.text || '',
  }));
}

function shouldHandoffByKeyword(message) {
  const lower = String(message).toLowerCase();
  // So khớp chính xác trước (nhanh) — chỉ fuzzy khi không match để bắt lỗi gõ thiếu/thừa/sai 1-2 ký tự
  if (HANDOFF_KEYWORDS.some((kw) => lower.includes(kw))) return true;

  const words = lower.split(/\s+/).filter(Boolean);
  return HANDOFF_KEYWORDS.some((kw) => fuzzyPhraseIncluded(kw, words));
}

function isGreetingOrSmallTalk(message) {
  return GREETING_ONLY_PATTERN.test(String(message).trim());
}

/** Trích "Quận N" từ câu hỏi khách, nếu có — dùng để phát hiện gợi ý thay thế khác quận */
function extractRequestedDistrict(message) {
  const match = String(message).match(/quận\s*(\d+)/i);
  return match ? `Quận ${match[1]}` : null;
}

/**
 * Property match được có phải BĐS THAY THẾ (khác quận khách yêu cầu) hay không.
 * Chỉ áp dụng khi khách có hỏi rõ quận cụ thể trong câu hỏi.
 */
function isAlternativeSuggestion(message, property) {
  const requestedDistrict = extractRequestedDistrict(message);
  if (!requestedDistrict) return false;

  const propertyDistrict = String(property.quanHuyen || '').trim();
  if (!propertyDistrict) return false;

  return requestedDistrict.toLowerCase() !== propertyDistrict.toLowerCase();
}

/**
 * Enforce bằng code (không chỉ dựa vào LLM): nếu đây là gợi ý thay thế khác quận,
 * LUÔN thêm câu thông báo rõ ràng ở đầu câu trả lời — tránh việc model :free đôi khi
 * quên nói rõ đây là lựa chọn thay thế, khiến khách hiểu nhầm đúng quận đã hỏi.
 */
function prependAlternativeNotice(answer, message, property) {
  if (!isAlternativeSuggestion(message, property)) return answer;

  const requestedDistrict = extractRequestedDistrict(message);
  const propertyDistrict = property.quanHuyen;
  const notice = `Hiện em chưa có bất động sản nào tại ${requestedDistrict}. Tuy nhiên em có một lựa chọn tương tự tại ${propertyDistrict} mà anh/chị có thể tham khảo:\n\n`;
  return notice + answer;
}

/**
 * true nếu câu trả lời AI gần nhất trong lịch sử có vẻ đang nói về đúng `property` hiện tại
 * (dựa vào quận/địa chỉ) — dùng để quyết định có giữ lịch sử AI cũ trong prompt hay không.
 */
function historyMatchesProperty(history, property) {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return true; // chưa có câu trả lời nào trước đó — không có gì để lẫn

  const text = String(lastAssistant.content || '').toLowerCase();
  const district = String(property.quanHuyen || '').toLowerCase();
  const address = String(property.diaChi || '').toLowerCase();

  if (district && text.includes(district)) return true;
  if (address && text.includes(address)) return true;
  return false;
}

/**
 * BĐS lượt này khác BĐS được nhắc gần nhất trong lịch sử → bỏ các câu trả lời AI cũ
 * khỏi prompt để LLM không lẫn thông tin (giá/địa chỉ/quận) của BĐS cũ vào câu trả lời mới.
 * Tin nhắn của khách vẫn giữ nguyên vì không chứa "sự thật" nào về BĐS, chỉ là câu hỏi.
 */
function sanitizeHistoryForProperty(history, property) {
  if (historyMatchesProperty(history, property)) return history;
  return history.filter((m) => m.role !== 'assistant');
}

/**
 * Prompt có dặn LLM tự chèn URL vào câu trả lời, nhưng đây chỉ là chỉ dẫn mềm —
 * model :free đôi khi bỏ qua. Enforce bằng code: nếu câu trả lời chưa có URL, tự thêm vào
 * để đảm bảo LUÔN có link, không phụ thuộc việc LLM có tuân thủ hay không.
 */
function ensureLinkInAnswer(answer, property) {
  const url = property.url;
  if (!url) return answer;
  if (answer.includes(url)) return answer;
  return `${answer}\n\nXem chi tiết tại đây: ${url}`;
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
    handOffMessage: 'Vui lòng chọn nút "Kết nối với nhân viên" bên dưới để em chuyển bạn tới nhân viên hỗ trợ nhé.',
    handOffReason: reason,
    timestamp: new Date().toISOString(),
  };
}

function buildInfoResult({ sessionId, answer, searchScore = null }) {
  return {
    success: true,
    requiresHandOff: false,
    sessionId,
    aiResponse: answer,
    message: answer,
    media: [],
    apartments: [],
    matchedProperties: [],
    searchScore,
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

  if (isGreetingOrSmallTalk(message)) {
    logger.info('[AI Pipeline] Lời chào/xã giao — trả lời gợi ý, không handoff');
    return buildInfoResult({
      sessionId: resolvedSessionId,
      answer:
        'Xin chào! 😊 Tôi là trợ lý AI tư vấn bất động sản. Bạn đang tìm căn hộ ở khu vực nào, ngân sách khoảng bao nhiêu và cần mấy phòng ngủ? Cho tôi biết để tư vấn phù hợp nhé!',
    });
  }

  try {
    const { results, mode } = await searchProperties(message, { limit: 3 });
    let top = results[0];
    let score = top?.score ?? 0;
    const threshold = getThresholdForMode(mode);
    const passesTextThreshold = Boolean(top) && score >= threshold;

    logger.info(
      `[AI Pipeline] Search mode=${mode}, top score=${score.toFixed(3)}, threshold=${threshold}`,
    );

    // Khách hỏi rõ quận cụ thể mà chưa đúng quận đó (dù text search dưới ngưỡng hay match
    // nhầm quận khác) → thử tìm BĐS ở quận GẦN NHẤT về địa lý thực tế TP.HCM trước khi bỏ cuộc.
    // Đáng tin cậy hơn nhiều so với việc để model chat :free tự "đoán" khu vực gần.
    const requestedDistrict = extractRequestedDistrict(message);
    let usedGeoFallback = false;

    if (requestedDistrict) {
      const currentDistance = passesTextThreshold
        ? districtDistance(requestedDistrict, top.quanHuyen)
        : Infinity;

      if (currentDistance > 0) {
        const catalog = await fetchCatalogFromApi();
        const nearest = findNearestByDistrict(catalog, requestedDistrict);

        // Chỉ coi là "gần" nếu tối đa 3 quận giáp ranh — xa hơn thì không đủ tin cậy để gợi ý
        if (nearest.property && nearest.distance <= 3 && nearest.distance < currentDistance) {
          logger.info(
            `[AI Pipeline] Geo fallback: ${requestedDistrict} không có sẵn — chọn BĐS tại ${nearest.property.quanHuyen} (cách ${nearest.distance} quận về địa lý)`,
          );
          top = nearest.property;
          score = threshold; // đây là lựa chọn theo địa lý có chủ đích, không phải theo điểm text
          usedGeoFallback = true;
        }
      }
    }

    if (!top || (!passesTextThreshold && !usedGeoFallback)) {
      logger.info(
        `[AI Pipeline] Không khớp BĐS (mode=${mode}, score=${score.toFixed(3)} < ${threshold}) — hỏi thêm thông tin, không handoff`,
      );
      return buildInfoResult({
        sessionId: resolvedSessionId,
        answer:
          'Hiện tại tôi chưa tìm thấy bất động sản phù hợp với yêu cầu này trong danh mục. Bạn có thể cho tôi biết thêm về khu vực, ngân sách hoặc số phòng ngủ mong muốn để tôi tìm chính xác hơn không?',
        searchScore: score,
      });
    }

    const sanitizedHistory = sanitizeHistoryForProperty(history, top);
    if (sanitizedHistory.length !== history.length) {
      logger.info('[AI Pipeline] BĐS đổi khác lượt trước — bỏ câu trả lời AI cũ khỏi prompt để tránh lẫn thông tin');
    }

    const isAlternative = isAlternativeSuggestion(message, top);
    if (isAlternative) {
      logger.info(`[AI Pipeline] Gợi ý thay thế: khách hỏi ${extractRequestedDistrict(message)}, match được ${top.quanHuyen}`);
    }

    const rawAnswer = await generateAdvisoryReply({
      userQuestion: message,
      property: top,
      conversationHistory: sanitizedHistory,
      isAlternative,
    });
    const answer = ensureLinkInAnswer(prependAlternativeNotice(rawAnswer, message, top), top);

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
        `Xin lỗi, AI tạm thời không phản hồi được.${hint} Vui lòng chọn nút "Kết nối với nhân viên" bên dưới để được hỗ trợ.`,
    };
  }
}

export { processAdvisoryMessage, shouldHandoffByKeyword };
export default { processAdvisoryMessage, shouldHandoffByKeyword };