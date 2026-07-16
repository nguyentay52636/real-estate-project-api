import logger from '#shared/utils/logger.js';

/** Danh sách model :free mặc định — thử lần lượt khi model trước lỗi */
const DEFAULT_FREE_CHAT_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:free',
];

let openRouterInstance = null;

function getOpenRouterKey() {
  return (process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_API_KEY || '').trim();
}

function getChatModelChain() {
  const raw = process.env.AI_CHAT_MODELS || process.env.AI_MODEL || process.env.GEMINI_CHAT_MODEL;

  if (raw?.trim()) {
    return raw
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }

  return [...DEFAULT_FREE_CHAT_MODELS];
}

function getEmbeddingModel() {
  return (
    process.env.AI_EMBEDDING_MODEL ||
    process.env.OPENROUTER_EMBEDDING_MODEL ||
    'openai/text-embedding-3-small'
  ).trim();
}

async function getOpenRouter() {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error('OPEN_ROUTER_KEY chưa được cấu hình');
  }

  if (!openRouterInstance) {
    const { OpenRouter } = await import('@openrouter/sdk');
    openRouterInstance = new OpenRouter({
      apiKey,
      httpReferer: process.env.CLIENT_URL || 'http://localhost:5173',
      appTitle: 'Real Estate CRM',
    });
  }

  return openRouterInstance;
}

async function embedWithOpenRouter(text) {
  const openrouter = await getOpenRouter();
  const model = getEmbeddingModel();

  const response = await openrouter.embeddings.generate({
    requestBody: {
      model,
      input: text.trim(),
    },
  });

  const item = response?.data?.[0];
  const values = Array.isArray(item?.embedding) ? item.embedding : null;
  if (!values?.length) {
    throw new Error('OpenRouter không trả về embedding');
  }

  return values;
}

async function chatWithOpenRouter(systemPrompt, userPrompt) {
  const openrouter = await getOpenRouter();
  const models = getChatModelChain();
  const failures = [];
  let lastError = null;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      logger.info(`[OpenRouter] Thử chat: ${model} (${i + 1}/${models.length})`);

      const response = await openrouter.chat.send({
        chatRequest: {
          model,
          messages,
          stream: false,
          maxTokens: 800,
          temperature: 0.3,
        },
      });

      const content = response?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('OpenRouter không trả về câu trả lời');
      }

      if (failures.length) {
        logger.info(`[OpenRouter] Chat OK với ${model} (sau ${failures.length} model lỗi)`);
      }

      return content;
    } catch (error) {
      const status = error?.status || error?.statusCode || error?.response?.status;
      failures.push({ model, status, message: error.message });
      logger.info(`[OpenRouter] ${model} failed (${status || 'err'}): ${error.message}`);
      lastError = error;

      if (status === 401 || status === 403) {
        break;
      }
    }
  }

  const summary = failures.map((f) => `${f.model}(${f.status || 'err'})`).join(' → ');
  const err = lastError || new Error(`Hết model khả dụng: ${summary}`);
  err.modelFailures = failures;
  err.modelSummary = summary;
  throw err;
}

function hasOpenRouterKey() {
  return Boolean(getOpenRouterKey());
}

export { embedWithOpenRouter, chatWithOpenRouter, hasOpenRouterKey, getOpenRouterKey, getChatModelChain, getEmbeddingModel, DEFAULT_FREE_CHAT_MODELS };
export default { embedWithOpenRouter, chatWithOpenRouter, hasOpenRouterKey, getOpenRouterKey, getChatModelChain, getEmbeddingModel, DEFAULT_FREE_CHAT_MODELS };