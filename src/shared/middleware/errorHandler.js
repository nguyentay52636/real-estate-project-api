import { isAppError } from '#shared/errors/AppError.js';
import logger from '#shared/utils/logger.js';

/**
 * Error middleware tập trung — map lỗi nghiệp vụ (AppError) sang HTTP,
 * còn lại trả 500. Đặt SAU tất cả routes trong app.js.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'ID không hợp lệ' });
  }

  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  logger.error(`[Unhandled] ${req.method} ${req.originalUrl}: ${err?.message || err}`);
  return res.status(500).json({ message: 'Server error', error: err?.message || String(err) });
}

export default errorHandler;
