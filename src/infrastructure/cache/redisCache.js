import crypto from 'crypto';
import Redis from 'ioredis';
import logger from '#shared/utils/logger.js';

let client = null;
let disabled = false;

function isRedisEnabled() {
  if (disabled) return false;
  if (process.env.REDIS_ENABLED === 'false') return false;
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function getRedisClient() {
  if (!isRedisEnabled()) return null;
  if (client) return client;

  try {
    if (process.env.REDIS_URL) {
      client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });
    } else {
      client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }

    client.on('error', (err) => {
      logger.error(`[Redis] ${err.message}`);
    });

    return client;
  } catch (err) {
    logger.error(`[Redis] init failed: ${err.message}`);
    disabled = true;
    return null;
  }
}

async function ensureConnected() {
  const redis = getRedisClient();
  if (!redis) return null;
  if (redis.status === 'ready' || redis.status === 'connecting') return redis;
  try {
    await redis.connect();
    return redis;
  } catch (err) {
    logger.error(`[Redis] connect failed: ${err.message}`);
    disabled = true;
    return null;
  }
}

/** Query params FE hay dùng để bust cache — bỏ khỏi Redis key để hit cache ổn định. */
const CACHE_BUST_QUERY_KEYS = new Set(['_t', '_', 't', 'ts', 'timestamp', 'cacheBust', 'nocache']);

export function stripCacheBustParams(query = {}) {
  if (!query || typeof query !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(query)) {
    if (CACHE_BUST_QUERY_KEYS.has(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function hashKey(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export async function cacheGet(key) {
  const redis = await ensureConnected();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  const redis = await ensureConnected();
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDel(key) {
  const redis = await ensureConnected();
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDelByPrefix(prefix) {
  const redis = await ensureConnected();
  if (!redis) return 0;
  try {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  } catch {
    return 0;
  }
}

/**
 * Cache-aside helper: get from Redis or compute + set.
 */
export async function cacheGetOrSet(key, ttlSeconds, loader) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export function getCacheStatus() {
  return {
    enabled: isRedisEnabled() && !disabled,
    status: client?.status || 'disconnected',
  };
}

export default {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPrefix,
  cacheGetOrSet,
  hashKey,
  stripCacheBustParams,
  getCacheStatus,
};
