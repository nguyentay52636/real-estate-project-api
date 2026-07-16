/**
 * Bọc async controller: tự forward lỗi sang error middleware.
 * Nhờ vậy controller không cần try/catch lặp lại.
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
