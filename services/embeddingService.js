const { GoogleGenerativeAI } = require('@google/generative-ai');
const { embedWithOpenRouter, hasOpenRouterKey } = require('./openRouterService');
const logger = require('../utils/logger');

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

let openRouterEmbedCreditsUnavailable = false;

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function hasEmbeddingProvider() {
  return hasOpenRouterKey() || Boolean(getGeminiKey());
}

function isCreditError(error) {
  const status = error?.status || error?.statusCode || error?.response?.status;
  const msg = String(error?.message || '');
  return status === 402 || /credit|insufficient/i.test(msg);
}

function shouldSkipEmbedApi() {
  return openRouterEmbedCreditsUnavailable && !getGeminiKey();
}

async function embedWithGemini(text) {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const result = await model.embedContent(text.trim());
  const values = result?.embedding?.values;

  if (!values?.length) {
    throw new Error('Gemini không trả về embedding');
  }

  return values;
}

async function embed(text) {
  if (!text?.trim()) {
    throw new Error('Nội dung embed không được rỗng');
  }

  if (shouldSkipEmbedApi()) {
    throw new Error('Embed skipped: OpenRouter không có credit');
  }

  if (hasOpenRouterKey() && !openRouterEmbedCreditsUnavailable) {
    try {
      return await embedWithOpenRouter(text);
    } catch (error) {
      if (isCreditError(error)) {
        openRouterEmbedCreditsUnavailable = true;
        logger.warn('[Embedding] OpenRouter hết credit — lần sau bỏ qua embed API');

        if (getGeminiKey()) {
          return embedWithGemini(text);
        }
      }
      throw error;
    }
  }

  if (getGeminiKey()) {
    return embedWithGemini(text);
  }

  throw new Error('Cần OPEN_ROUTER_KEY hoặc GEMINI_API_KEY trong .env');
}

function buildEmbeddingText(doc) {
  const parts = [
    doc.tieuDe,
    doc.moTa,
    doc.diaChi,
    doc.quanHuyen,
    doc.gia != null ? `Giá ${doc.gia} VNĐ/tháng` : '',
    doc.phongNgu != null ? `${doc.phongNgu} phòng ngủ` : '',
    doc.dienTich != null ? `Diện tích ${doc.dienTich}m2` : '',
    doc.loaiBds,
  ];
  return parts.filter(Boolean).join('. ');
}

module.exports = {
  embed,
  buildEmbeddingText,
  hasEmbeddingProvider,
  shouldSkipEmbedApi,
  isCreditError,
};
