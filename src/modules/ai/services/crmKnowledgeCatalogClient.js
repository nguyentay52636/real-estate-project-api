import logger from '#shared/utils/logger.js';
import {
  getActivePropertiesForAi,
} from './propertyAiCatalog.js';
import { cacheGet, cacheSet, cacheDel } from '#infra/cache/redisCache.js';

const CACHE_TTL_MS = parseInt(process.env.CRM_CATALOG_CACHE_MS || '30000', 10);
const CACHE_TTL_SEC = Math.max(1, Math.ceil(CACHE_TTL_MS / 1000));
/** Redis keys giữ tên cũ để tương thích deploy — nội dung giờ là Property catalog */
const REDIS_CATALOG_KEY = 'crm:catalog';
const REDIS_EMBED_KEY = 'crm:catalog:embeddings';

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
  cacheDel(REDIS_CATALOG_KEY);
  cacheDel(REDIS_EMBED_KEY);
}

async function fetchCatalogWithEmbeddings({ bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && embeddingCache.items && now - embeddingCache.fetchedAt < CACHE_TTL_MS) {
    return embeddingCache.items;
  }

  if (!bypassCache) {
    const redisCached = await cacheGet(REDIS_EMBED_KEY);
    if (redisCached) {
      embeddingCache = { items: redisCached, fetchedAt: now };
      return redisCached;
    }
  }

  const items = await getActivePropertiesForAi({ includeEmbedding: true });
  embeddingCache = { items, fetchedAt: now };
  await cacheSet(REDIS_EMBED_KEY, items, CACHE_TTL_SEC);
  return items;
}

/**
 * Catalog cho AI — ưu tiên HTTP self-call (multi-instance), fallback đọc Property trực tiếp.
 */
async function fetchCatalogFromApi({ bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && cache.items && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  if (!bypassCache) {
    const redisCached = await cacheGet(REDIS_CATALOG_KEY);
    if (redisCached) {
      cache = { items: redisCached, fetchedAt: now };
      return redisCached;
    }
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
    await cacheSet(REDIS_CATALOG_KEY, items, CACHE_TTL_SEC);
    logger.info(`[CatalogClient] Đã tải ${items.length} tin Property từ catalog API`);

    return items;
  } catch (error) {
    logger.warn(`[CatalogClient] API lỗi (${error.message}), fallback Property DB`);

    const items = await getActivePropertiesForAi({ includeEmbedding: false });
    cache = { items, fetchedAt: now };
    await cacheSet(REDIS_CATALOG_KEY, items, CACHE_TTL_SEC);
    return items;
  }
}

export { fetchCatalogFromApi, fetchCatalogWithEmbeddings, getCatalogApiUrl, clearCatalogCache };
export default {
  fetchCatalogFromApi,
  fetchCatalogWithEmbeddings,
  getCatalogApiUrl,
  clearCatalogCache,
};
