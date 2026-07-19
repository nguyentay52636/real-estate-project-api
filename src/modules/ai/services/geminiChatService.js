import { GoogleGenerativeAI } from '@google/generative-ai';
import { chatWithOpenRouter, hasOpenRouterKey } from './openRouterService.js';

const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function hasChatProvider() {
  return hasOpenRouterKey() || Boolean(getGeminiKey());
}

function formatPropertyFacts(property) {
  const lines = [
    `Tiêu đề: ${property.tieuDe}`,
    `Mô tả: ${property.moTa}`,
    `Giá: ${Number(property.gia).toLocaleString('vi-VN')} VNĐ/tháng`,
    `Địa chỉ: ${property.diaChi}`,
    `Quận/Huyện: ${property.quanHuyen}`,
    `Phòng ngủ: ${property.phongNgu ?? 'N/A'}`,
    property.dienTich != null ? `Diện tích: ${property.dienTich}m²` : null,
    property.loaiBds ? `Loại BĐS: ${property.loaiBds}` : null,
    property.url ? `URL bài viết: ${property.url}` : null,
  ];
  return lines.filter(Boolean).join('\n');
}

function buildAdvisoryPrompt({ userQuestion, propertyFacts, conversationHistory = [], isAlternative = false }) {
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Khách' : 'AI'}: ${m.content || m.message}`)
    .join('\n');

  const alternativeRule = isAlternative
    ? '- Đây là BĐS THAY THẾ vì không có BĐS đúng khu vực khách hỏi — hệ thống ĐÃ tự thông báo phần "chưa có ở khu vực khách hỏi" trước câu trả lời của bạn rồi. KHÔNG lặp lại việc xin lỗi/thông báo không tìm thấy đó nữa — chỉ mô tả ngắn gọn, tự nhiên vì sao BĐS này là lựa chọn đáng cân nhắc.\n'
    : '';

  return `Bạn là AI tư vấn bất động sản thân thiện, chuyên nghiệp.

QUY TẮC NGHIÊM NGẶT:
- CHỈ dùng thông tin trong "DỮ LIỆU BĐS THỰC TẾ" bên dưới.
- KHÔNG bịa giá, địa chỉ, số phòng hoặc tiện ích không có trong dữ liệu.
- LỊCH SỬ HỘI THOẠI (nếu có) chỉ để hiểu ngữ cảnh khách đang muốn gì — TUYỆT ĐỐI KHÔNG lấy giá/địa chỉ/quận/tiện ích của BĐS được nhắc trong lịch sử để trả lời, nếu nó khác với DỮ LIỆU BĐS THỰC TẾ bên dưới. DỮ LIỆU BĐS THỰC TẾ luôn là nguồn thông tin duy nhất và đúng nhất cho BĐS đang tư vấn ở lượt này.
- Trả lời bằng tiếng Việt, tự nhiên, ngắn gọn (3-6 câu).
- Nếu khách hỏi xem ảnh, nói rằng ảnh sẽ hiển thị bên dưới tin nhắn.
- Nếu trong DỮ LIỆU BĐS THỰC TẾ có URL bài viết, hãy chèn ĐÚNG URL đó vào câu trả lời (bắt đầu bằng http:// hoặc https://, copy nguyên văn, không rút gọn, không thay bằng chữ "tại đây" mà thiếu link).
- KHÔNG trả HTML/Markdown/JSON. Chỉ trả plain text (FE sẽ tự biến URL thành link bấm được).
${alternativeRule}
${historyText ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n` : ''}
DỮ LIỆU BĐS THỰC TẾ:
${propertyFacts}

CÂU HỎI KHÁCH: ${userQuestion}`;
}

async function generateWithGemini(prompt) {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_CHAT_MODEL });
  const result = await model.generateContent(prompt);
  const text = result?.response?.text()?.trim();

  if (!text) {
    throw new Error('Gemini không trả về câu trả lời');
  }

  return text;
}

async function generateAdvisoryReply({ userQuestion, property, conversationHistory = [], isAlternative = false }) {
  const propertyFacts = formatPropertyFacts(property);
  const prompt = buildAdvisoryPrompt({ userQuestion, propertyFacts, conversationHistory, isAlternative });
  const systemPrompt = prompt.split('CÂU HỎI KHÁCH:')[0].trim();
  const userPrompt = `CÂU HỎI KHÁCH: ${userQuestion}`;

  // Ưu tiên OpenRouter — một API key, nhiều model (Gemma, Llama, GPT...)
  if (hasOpenRouterKey()) {
    return chatWithOpenRouter(systemPrompt, userPrompt);
  }

  if (getGeminiKey()) {
    return generateWithGemini(prompt);
  }

  throw new Error('Cần OPEN_ROUTER_KEY trong .env');
}

export { formatPropertyFacts, generateAdvisoryReply, hasChatProvider };
export default { formatPropertyFacts, generateAdvisoryReply, hasChatProvider };