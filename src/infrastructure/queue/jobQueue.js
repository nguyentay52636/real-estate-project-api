import { Queue, Worker } from 'bullmq';
import logger from '#shared/utils/logger.js';

const handlers = new Map();
let queue = null;
let worker = null;
let useInline = true;

function redisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }
  return null;
}

function isQueueEnabled() {
  if (process.env.QUEUE_ENABLED === 'false') return false;
  return Boolean(redisConnection());
}

export function registerJobHandler(name, handler) {
  handlers.set(name, handler);
}

/**
 * Enqueue background job. Falls back to setImmediate when Redis/BullMQ unavailable.
 */
export async function enqueueJob(name, payload = {}, opts = {}) {
  const handler = handlers.get(name);
  if (!handler) {
    logger.error(`[Queue] No handler for job: ${name}`);
    return { queued: false, mode: 'none' };
  }

  if (!isQueueEnabled()) {
    setImmediate(() => {
      Promise.resolve(handler(payload)).catch((err) => {
        logger.error(`[Queue:inline] ${name} failed: ${err.message}`);
      });
    });
    return { queued: true, mode: 'inline' };
  }

  try {
    if (!queue) {
      queue = new Queue('app-jobs', { connection: redisConnection() });
    }
    await queue.add(name, { name, payload }, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: opts.attempts ?? 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
    useInline = false;
    return { queued: true, mode: 'bullmq' };
  } catch (err) {
    logger.error(`[Queue] enqueue failed (${err.message}), fallback inline`);
    setImmediate(() => {
      Promise.resolve(handler(payload)).catch((e) => {
        logger.error(`[Queue:inline] ${name} failed: ${e.message}`);
      });
    });
    return { queued: true, mode: 'inline-fallback' };
  }
}

/**
 * Start BullMQ worker (call once from server bootstrap).
 */
export function startJobWorker() {
  if (!isQueueEnabled()) {
    logger.info('[Queue] Redis chưa cấu hình — dùng inline async jobs');
    return null;
  }

  if (worker) return worker;

  worker = new Worker(
    'app-jobs',
    async (job) => {
      const name = job.name || job.data?.name;
      const payload = job.data?.payload ?? job.data ?? {};
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`No handler for job: ${name}`);
      }
      return handler(payload);
    },
    { connection: redisConnection(), concurrency: Number(process.env.QUEUE_CONCURRENCY || 5) },
  );

  worker.on('failed', (job, err) => {
    logger.error(`[Queue] job ${job?.name} failed: ${err.message}`);
  });

  logger.info('[Queue] BullMQ worker started');
  return worker;
}

export function getQueueMode() {
  if (!isQueueEnabled()) return 'inline';
  return useInline ? 'bullmq-pending' : 'bullmq';
}

export default { enqueueJob, registerJobHandler, startJobWorker, getQueueMode };
