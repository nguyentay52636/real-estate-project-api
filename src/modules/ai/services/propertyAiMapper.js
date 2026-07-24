/**
 * Map Property (BatDongSan) → shape catalog AI (tương thích pipeline cũ CrmKnowledge).
 */
function getClientOrigin() {
  const raw = process.env.CLIENT_URL || process.env.CLIENT_URLS || '';
  const first = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (first || 'http://localhost:5173').replace(/\/$/, '');
}

/**
 * @param {object} property — lean Property document
 * @returns {object} catalog item for AI
 */
export function toAiCatalogItem(property) {
  if (!property) return null;

  const gallery = Array.isArray(property.gallery) ? property.gallery.filter(Boolean) : [];
  const anhDaiDien = property.anhDaiDien || '';
  const anhUrls = gallery.length ? gallery : anhDaiDien ? [anhDaiDien] : [];
  const slug = property.slug || '';
  const client = getClientOrigin();

  return {
    _id: property._id,
    tieuDe: property.tieuDe,
    moTa: property.moTa,
    gia: property.gia,
    diaChi: property.diaChi,
    quanHuyen: property.quanHuyen,
    tinhThanh: property.tinhThanh,
    phongNgu: property.phongNgu,
    phongTam: property.phongTam,
    dienTich: property.dienTich,
    loaiBds: property.loaiBds,
    loaiGiaoDich: property.loaiGiaoDich,
    slug,
    anhDaiDien,
    anhUrls,
    url: slug ? `${client}/products/${slug}` : '',
    trangThai: property.trangThai === 'dang_hoat_dong' ? 'active' : property.trangThai,
    embedding: Array.isArray(property.embedding) ? property.embedding : [],
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

export { getClientOrigin };
export default { toAiCatalogItem, getClientOrigin };
