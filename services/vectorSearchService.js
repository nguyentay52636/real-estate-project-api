const CrmKnowledge = require('../models/CrmKnowledge');
const logger = require('../utils/logger');

const INDEX_NAME = process.env.VECTOR_SEARCH_INDEX || 'crm_knowledge_vector_index';

const VECTOR_THRESHOLD = parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || '0.6');
const TEXT_THRESHOLD = parseFloat(process.env.VECTOR_TEXT_SEARCH_THRESHOLD || '0.3');

function getThresholdForMode(mode) {
  return mode === 'text' ? TEXT_THRESHOLD : VECTOR_THRESHOLD;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function searchWithAtlas(queryVector, { limit = 3 } = {}) {
  return CrmKnowledge.aggregate([
    {
      $vectorSearch: {
        index: INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 20, 50),
        limit,
        filter: { trangThai: { $eq: 'active' } },
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $project: {
        embedding: 0,
      },
    },
  ]);
}

async function searchWithFallback(queryVector, { limit = 3 } = {}) {
  const docs = await CrmKnowledge.find({
    trangThai: 'active',
    embedding: { $exists: true, $not: { $size: 0 } },
  }).lean();

  return docs
    .map((doc) => {
      const { embedding, ...rest } = doc;
      return {
        ...rest,
        score: cosineSimilarity(queryVector, embedding),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchSimilar(queryVector, options = {}) {
  const { limit = 3, minScore = 0 } = options;

  try {
    const results = await searchWithAtlas(queryVector, { limit });
    return results.filter((r) => r.score >= minScore);
  } catch (error) {
    logger.warn('[VectorSearch] Atlas $vectorSearch failed, using fallback:', error.message);
    const results = await searchWithFallback(queryVector, { limit });
    return results.filter((r) => r.score >= minScore);
  }
}

/** Tìm theo từ khóa khi embedding API không khả dụng (vd. OpenRouter hết credit) */
async function searchByText(query, { limit = 3 } = {}) {
  const terms = String(query)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length >= 2);

  if (!terms.length) return [];

  const docs = await CrmKnowledge.find({ trangThai: 'active' }).lean();
  const scored = docs
    .map((doc) => {
      const haystack = [
        doc.tieuDe,
        doc.moTa,
        doc.diaChi,
        doc.quanHuyen,
        String(doc.phongNgu),
        String(doc.gia),
      ]
        .join(' ')
        .toLowerCase();

      let hits = 0;
      for (const term of terms) {
        if (haystack.includes(term)) hits += 1;
      }

      const { embedding, ...rest } = doc;
      return { ...rest, score: hits / terms.length };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

async function searchProperties(message, options = {}) {
  const { embed, shouldSkipEmbedApi } = require('./embeddingService');

  if (shouldSkipEmbedApi()) {
    logger.info('[VectorSearch] Embed skipped (no credits), dùng text search');
    return { results: await searchByText(message, options), mode: 'text' };
  }

  try {
    const queryVector = await embed(message);
    return { results: await searchSimilar(queryVector, options), mode: 'vector' };
  } catch (error) {
    logger.warn('[VectorSearch] Embed failed, dùng text search:', error.message);
    return { results: await searchByText(message, options), mode: 'text' };
  }
}

module.exports = {
  searchSimilar,
  searchByText,
  searchProperties,
  cosineSimilarity,
  getThresholdForMode,
  VECTOR_THRESHOLD,
  TEXT_THRESHOLD,
};
