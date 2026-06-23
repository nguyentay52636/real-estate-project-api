const logger = require('../utils/logger');
const { getAllActive } = require('./crmKnowledgeService');

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

function stripEmbedding(doc) {
  const { embedding, ...rest } = doc;
  return rest;
}

function scoreDocByText(doc, terms) {
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

  return { ...stripEmbedding(doc), score: hits / terms.length };
}

async function searchWithAtlas(queryVector, catalog, { limit = 3 } = {}) {
  const CrmKnowledge = require('../models/CrmKnowledge');
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

async function searchWithFallback(queryVector, catalog, { limit = 3 } = {}) {
  return catalog
    .filter((doc) => doc.embedding?.length)
    .map((doc) => ({
      ...stripEmbedding(doc),
      score: cosineSimilarity(queryVector, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchSimilar(queryVector, catalog, options = {}) {
  const { limit = 3, minScore = 0 } = options;

  try {
    const results = await searchWithAtlas(queryVector, catalog, { limit });
    return results.filter((r) => r.score >= minScore);
  } catch (error) {
    logger.warn('[VectorSearch] Atlas $vectorSearch failed, using fallback:', error.message);
    const results = await searchWithFallback(queryVector, catalog, { limit });
    return results.filter((r) => r.score >= minScore);
  }
}

/** Tìm theo từ khóa trên catalog CrmKnowledge (getAllActive) */
async function searchByText(query, catalog, { limit = 3 } = {}) {
  const terms = String(query)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length >= 2);

  if (!terms.length || !catalog?.length) return [];

  return catalog
    .map((doc) => scoreDocByText(doc, terms))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchProperties(message, options = {}) {
  const { embed, shouldSkipEmbedApi } = require('./embeddingService');
  const catalog = await getAllActive({ includeEmbedding: true });

  logger.debug(`[VectorSearch] Catalog active: ${catalog.length} bài`);

  if (!catalog.length) {
    return { results: [], mode: 'catalog' };
  }

  if (shouldSkipEmbedApi()) {
    logger.info('[VectorSearch] Embed skipped (no credits), dùng text search trên catalog');
    return { results: await searchByText(message, catalog, options), mode: 'text' };
  }

  try {
    const queryVector = await embed(message);
    return { results: await searchSimilar(queryVector, catalog, options), mode: 'vector' };
  } catch (error) {
    logger.warn('[VectorSearch] Embed failed, dùng text search trên catalog:', error.message);
    return { results: await searchByText(message, catalog, options), mode: 'text' };
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
