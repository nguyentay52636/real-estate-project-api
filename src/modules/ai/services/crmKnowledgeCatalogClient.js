import logger from '#shared/utils/logger.js';
import { getAllActive } from './crmKnowledgeService.js';

const CACHE_TTL_MS = parseInt(process.env.CRM_CATALOG_CACHE_MS || '30000', 10);

let cache = { items: null, fetchedAt: 0 };
let embeddingCache = { items: null, fetchedAt: 0 };

function getCatalogApiUrl() {
  const base = (
    process.env.CRM_CATALOG_API_URL ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 8000}`
  ).replace(/\/$/, '');

  return `${base}/api/crm-knowledge-catalog`;
}

function clearCatalogCache() {
  cache = { items: null, fetchedAt: 0 };
  embeddingCache = { items: null, fetchedAt: 0 };
}

/**
 * Catalog kèm embedding — gọi DB trực tiếp (không qua HTTP catalog công khai,
 * vốn luôn strip embedding) để dùng cho semantic search nội bộ.
 */
async function fetchCatalogWithEmbeddings({ bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && embeddingCache.items && now - embeddingCache.fetchedAt < CACHE_TTL_MS) {
    return embeddingCache.items;
  }

  const items = await getAllActive({ includeEmbedding: true });
  embeddingCache = { items, fetchedAt: now };
  return items;
}

async function fetchCatalogFromApi({ bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && cache.items && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  const url = getCatalogApiUrl();
  logger.debug(`[CatalogClient] GET ${url}`);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Catalog API trả về ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];

    cache = { items, fetchedAt: now };
    logger.info(`[CatalogClient] Đã tải ${items.length} bài từ API catalog`);

    return items;
  } catch (error) {
    logger.warn(`[CatalogClient] API lỗi (${error.message}), fallback getAllActive`);

    const items = await getAllActive();
    cache = { items, fetchedAt: now };
    return items;
  }
}

export { fetchCatalogFromApi, fetchCatalogWithEmbeddings, getCatalogApiUrl, clearCatalogCache };
export default { fetchCatalogFromApi, fetchCatalogWithEmbeddings, getCatalogApiUrl, clearCatalogCache };