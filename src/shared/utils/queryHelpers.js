/**
 * Gọi .lean() / .select() nếu query hỗ trợ (Mongoose). Mock unit test có thể bỏ qua.
 */
export function maybeLean(query) {
  if (query && typeof query.lean === 'function') {
    return query.lean();
  }
  return query;
}

export function maybeSelect(query, fields) {
  if (query && typeof query.select === 'function') {
    return query.select(fields);
  }
  return query;
}

export default { maybeLean, maybeSelect };
