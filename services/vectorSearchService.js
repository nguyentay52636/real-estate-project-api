const logger = require('../utils/logger');
const { fetchCatalogFromApi } = require('./crmKnowledgeCatalogClient');

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

/** Tìm theo từ khóa trên danh sách catalog (từ API hoặc DB) */
function searchByText(query, catalog, { limit = 3 } = {}) {
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

/**
 * AI pipeline: GET /api/crm-knowledge-catalog → tìm trên danh sách → trả kết quả
 */
async function searchProperties(message, options = {}) {
  const catalog = await fetchCatalogFromApi();

  logger.debug(`[VectorSearch] Catalog từ API: ${catalog.length} bài`);

  if (!catalog.length) {
    return { results: [], mode: 'catalog' };
  }

  const results = searchByText(message, catalog, options);
  return { results, mode: 'text' };
}

module.exports = {
  searchByText,
  searchProperties,
  cosineSimilarity,
  getThresholdForMode,
  VECTOR_THRESHOLD,
  TEXT_THRESHOLD,
  scoreDocByText,
};
