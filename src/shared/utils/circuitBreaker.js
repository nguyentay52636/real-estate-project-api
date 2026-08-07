/**
 * Circuit breaker đơn giản (in-process) — fail-fast khi upstream lỗi liên tục.
 */
export function createCircuitBreaker({
  name = 'circuit',
  threshold = 5,
  cooldownMs = 60_000,
} = {}) {
  let failures = 0;
  let openUntil = 0;

  function isOpen() {
    return Date.now() < openUntil;
  }

  function assertClosed() {
    if (isOpen()) {
      const waitSec = Math.ceil((openUntil - Date.now()) / 1000);
      const err = new Error(
        `${name} tạm ngắt (circuit open). Thử lại sau ~${waitSec}s.`,
      );
      err.statusCode = 503;
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }
  }

  function recordSuccess() {
    failures = 0;
  }

  function recordFailure() {
    failures += 1;
    if (failures >= threshold) {
      openUntil = Date.now() + cooldownMs;
      failures = 0;
    }
  }

  function getState() {
    return {
      name,
      open: isOpen(),
      failures,
      openUntil: openUntil || null,
      threshold,
      cooldownMs,
    };
  }

  /** Test helper */
  function _reset() {
    failures = 0;
    openUntil = 0;
  }

  return { assertClosed, recordSuccess, recordFailure, isOpen, getState, _reset };
}

export async function withTimeout(promise, ms, label = 'timeout') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} sau ${ms}ms`);
          err.statusCode = 408;
          err.code = 'TIMEOUT';
          reject(err);
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default { createCircuitBreaker, withTimeout };
