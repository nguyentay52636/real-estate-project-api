/**
 * Tính khoảng cách Haversine giữa 2 điểm tọa độ (tính theo km)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Khoảng cách tính bằng km
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính Trái Đất tính bằng km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Tọa độ trung tâm mặc định của các Quận/Huyện & Tỉnh/Thành phố
 */
const DISTRICT_COORDINATES = {
  // TP.HCM
  'quận 1': { lat: 10.7756, lng: 106.7004 },
  'quận 2': { lat: 10.7872, lng: 106.7495 },
  'quận 3': { lat: 10.7828, lng: 106.6841 },
  'quận 4': { lat: 10.7578, lng: 106.7013 },
  'quận 5': { lat: 10.7542, lng: 106.6634 },
  'quận 6': { lat: 10.7481, lng: 106.6354 },
  'quận 7': { lat: 10.7340, lng: 106.7218 },
  'quận 8': { lat: 10.7239, lng: 106.6558 },
  'quận 9': { lat: 10.8428, lng: 106.8287 },
  'quận 10': { lat: 10.7715, lng: 106.6681 },
  'quận 11': { lat: 10.7634, lng: 106.6508 },
  'quận 12': { lat: 10.8672, lng: 106.6414 },
  'bình thạnh': { lat: 10.8012, lng: 106.7107 },
  'phú nhận': { lat: 10.7992, lng: 106.6804 },
  'phú nhuận': { lat: 10.7992, lng: 106.6804 },
  'tân bình': { lat: 10.8014, lng: 106.6545 },
  'tân phú': { lat: 10.7915, lng: 106.6281 },
  'gò vấp': { lat: 10.8387, lng: 106.6653 },
  'bình tân': { lat: 10.7653, lng: 106.6039 },
  'thủ đức': { lat: 10.8494, lng: 106.7537 },
  'nhà bè': { lat: 10.6552, lng: 106.7301 },
  'bình chánh': { lat: 10.6874, lng: 106.5938 },
  'hóc môn': { lat: 10.8841, lng: 106.5925 },
  'củ chi': { lat: 11.0067, lng: 106.5136 },
  'cần giờ': { lat: 10.4114, lng: 106.9547 },

  // Hà Nội
  'hoàn kiếm': { lat: 21.0285, lng: 105.8542 },
  'ba đình': { lat: 21.0341, lng: 105.8194 },
  'đống đa': { lat: 21.0122, lng: 105.8278 },
  'cầu giấy': { lat: 21.0362, lng: 105.7906 },
  'tây hồ': { lat: 21.0664, lng: 105.8166 },
  'thanh xuân': { lat: 20.9939, lng: 105.8078 },
  'hai bà trưng': { lat: 21.0084, lng: 105.8576 },
  'hoàng mai': { lat: 20.9764, lng: 105.8451 },
  'nam từ liêm': { lat: 21.0132, lng: 105.7602 },
  'bắc từ liêm': { lat: 21.0645, lng: 105.7483 },
  'hà đông': { lat: 20.9712, lng: 105.7774 },
  'long biên': { lat: 21.0478, lng: 105.8856 },

  // Đà Nẵng
  'hải châu': { lat: 16.0471, lng: 108.2208 },
  'thanh khê': { lat: 16.0647, lng: 108.1884 },
  'sơn trà': { lat: 16.0903, lng: 108.2562 },
  'ngũ hành sơn': { lat: 16.0028, lng: 108.2618 },
  'liên chiểu': { lat: 16.0772, lng: 108.1478 },
  'cẩm lệ': { lat: 16.0142, lng: 108.1964 },
};

const CITY_COORDINATES = {
  'tp.hcm': { lat: 10.7756, lng: 106.7004 },
  'thành phố hồ chí minh': { lat: 10.7756, lng: 106.7004 },
  'hồ chí minh': { lat: 10.7756, lng: 106.7004 },
  'hà nội': { lat: 21.0285, lng: 105.8542 },
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },
  'bình dương': { lat: 11.1604, lng: 106.6520 },
  'đồng nai': { lat: 10.9454, lng: 106.8247 },
};

/**
 * Tra cứu tọa độ trung tâm mặc định theo quận/huyện hoặc tỉnh/thành
 * kèm độ lệch ngẫu nhiên nhỏ (±0.005) để tránh trùng ghim trên bản đồ.
 * 
 * @param {string} quanHuyen 
 * @param {string} tinhThanh 
 * @returns {{ lat: number, lng: number }}
 */
export function getDefaultCoordinates(quanHuyen = '', tinhThanh = '') {
  const normDistrict = String(quanHuyen).trim().toLowerCase();
  const normCity = String(tinhThanh).trim().toLowerCase();

  let base = DISTRICT_COORDINATES[normDistrict];
  if (!base) {
    base = CITY_COORDINATES[normCity] || CITY_COORDINATES['tp.hcm'];
  }

  // Jitter ±0.005 (khoảng ±500m)
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;

  return {
    lat: Math.round((base.lat + latOffset) * 10000) / 10000,
    lng: Math.round((base.lng + lngOffset) * 10000) / 10000,
  };
}

/**
 * Kiểm tra xem tọa độ toaDo có hợp lệ không
 * lat nằm trong [-90, 90], lng nằm trong [-180, 180]
 * 
 * @param {object} toaDo 
 * @returns {boolean}
 */
export function isValidCoordinates(toaDo) {
  if (!toaDo || typeof toaDo !== 'object') return false;
  if (toaDo.lat === undefined || toaDo.lat === null || toaDo.lng === undefined || toaDo.lng === null) return false;
  const lat = Number(toaDo.lat);
  const lng = Number(toaDo.lng);
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}
