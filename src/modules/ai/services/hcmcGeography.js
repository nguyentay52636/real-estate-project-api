/**
 * Bản đồ quận/huyện giáp ranh thực tế của TP.HCM — dùng để chọn gợi ý thay thế
 * gần nhất về mặt địa lý khi không có BĐS đúng quận khách hỏi, thay vì chọn bừa
 * theo điểm khớp từ khóa (không đáng tin cậy khi dùng model chat :free).
 */
const DISTRICT_ADJACENCY = {
  'Quận 1': ['Quận 3', 'Quận 4', 'Quận 5', 'Bình Thạnh', 'Quận 2'],
  'Quận 2': ['Quận 1', 'Quận 4', 'Quận 7', 'Quận 9', 'Bình Thạnh', 'Thủ Đức'],
  'Quận 3': ['Quận 1', 'Quận 10', 'Quận 5', 'Phú Nhuận', 'Bình Thạnh', 'Tân Bình'],
  'Quận 4': ['Quận 1', 'Quận 2', 'Quận 7', 'Quận 8'],
  'Quận 5': ['Quận 1', 'Quận 3', 'Quận 6', 'Quận 8', 'Quận 10', 'Quận 11'],
  'Quận 6': ['Quận 5', 'Quận 8', 'Quận 11', 'Bình Tân', 'Tân Phú'],
  'Quận 7': ['Quận 4', 'Quận 8', 'Nhà Bè'],
  'Quận 8': ['Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Bình Chánh'],
  'Quận 9': ['Quận 2', 'Thủ Đức', 'Quận 12'],
  'Quận 10': ['Quận 3', 'Quận 5', 'Quận 11', 'Tân Bình'],
  'Quận 11': ['Quận 5', 'Quận 6', 'Quận 10', 'Tân Bình', 'Tân Phú'],
  'Quận 12': ['Gò Vấp', 'Hóc Môn', 'Tân Bình', 'Tân Phú', 'Quận 9', 'Thủ Đức'],
  'Bình Thạnh': ['Quận 1', 'Quận 2', 'Quận 3', 'Phú Nhuận', 'Gò Vấp'],
  'Phú Nhuận': ['Quận 1', 'Quận 3', 'Bình Thạnh', 'Tân Bình'],
  'Tân Bình': ['Quận 3', 'Quận 10', 'Quận 11', 'Phú Nhuận', 'Tân Phú', 'Gò Vấp', 'Quận 12'],
  'Tân Phú': ['Tân Bình', 'Quận 6', 'Quận 11', 'Bình Tân'],
  'Gò Vấp': ['Quận 12', 'Bình Thạnh', 'Tân Bình', 'Phú Nhuận'],
  'Bình Tân': ['Quận 6', 'Quận 8', 'Tân Phú', 'Bình Chánh'],
  'Thủ Đức': ['Quận 1', 'Quận 2', 'Quận 9', 'Quận 12', 'Bình Thạnh'],
  'Nhà Bè': ['Quận 7', 'Bình Chánh'],
  'Bình Chánh': ['Quận 8', 'Bình Tân', 'Nhà Bè'],
  'Hóc Môn': ['Quận 12', 'Củ Chi'],
  'Củ Chi': ['Hóc Môn'],
};

const MAX_HOPS = 6;

function normalize(district) {
  return String(district || '').trim();
}

/** Số bước giáp ranh giữa 2 quận (0 = cùng quận, Infinity = không rõ/không tìm thấy đường đi) */
function districtDistance(from, to) {
  const a = normalize(from);
  const b = normalize(to);
  if (!a || !b) return Infinity;
  if (a === b) return 0;
  if (!DISTRICT_ADJACENCY[a]) return Infinity;

  const visited = new Set([a]);
  let frontier = [a];

  for (let hop = 1; hop <= MAX_HOPS; hop += 1) {
    const next = [];
    for (const node of frontier) {
      for (const neighbor of DISTRICT_ADJACENCY[node] || []) {
        if (neighbor === b) return hop;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }

  return Infinity;
}

/** Trong `catalog`, tìm BĐS thuộc quận gần `requestedDistrict` nhất về mặt địa lý thực tế */
function findNearestByDistrict(catalog, requestedDistrict) {
  let best = null;
  let bestDistance = Infinity;

  for (const doc of catalog) {
    const distance = districtDistance(requestedDistrict, doc.quanHuyen);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = doc;
    }
  }

  return { property: best, distance: bestDistance };
}

export { districtDistance, findNearestByDistrict, DISTRICT_ADJACENCY };
export default { districtDistance, findNearestByDistrict, DISTRICT_ADJACENCY };
