/**
 * Logger gọn — mặc định chỉ info/warn/error.
 * Bật log chi tiết (socket connect, AI retry từng model...): DEBUG_LOGS=true
 */
const VERBOSE = process.env.DEBUG_LOGS === 'true';

const logger = {
  debug: (...args) => {
    if (VERBOSE) console.log(...args);
  },
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

module.exports = logger;
