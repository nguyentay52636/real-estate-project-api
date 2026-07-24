import Property from '#models/Property.js';
import logger from '#shared/utils/logger.js';
import { embed, buildEmbeddingText, hasEmbeddingProvider } from './embeddingService.js';
import { toAiCatalogItem } from './propertyAiMapper.js';

const ACTIVE_STATUS = 'dang_hoat_dong';

const CATALOG_FIELDS =
  'tieuDe slug moTa gia diaChi quanHuyen tinhThanh phongNgu phongTam dienTich loaiBds loaiGiaoDich anhDaiDien gallery trangThai createdAt updatedAt';

/**
 * Catalog AI = tin Property đang hoạt động (single source of truth).
 */
async function getActivePropertiesForAi({ includeEmbedding = false } = {}) {
  const select = includeEmbedding ? `${CATALOG_FIELDS} embedding` : CATALOG_FIELDS;
  const rows = await Property.find({ trangThai: ACTIVE_STATUS })
    .select(select)
    .sort({ updatedAt: -1 })
    .lean();

  return rows.map(toAiCatalogItem);
}

async function refreshPropertyEmbedding(propertyId) {
  if (!hasEmbeddingProvider()) {
    logger.debug('[PropertyAI] Skip embed — chưa cấu hình embedding provider');
    return null;
  }

  const doc = await Property.findById(propertyId);
  if (!doc) return null;

  try {
    const text = buildEmbeddingText({
      tieuDe: doc.tieuDe,
      moTa: doc.moTa,
      diaChi: doc.diaChi,
      quanHuyen: doc.quanHuyen,
      gia: doc.gia,
      phongNgu: doc.phongNgu,
      dienTich: doc.dienTich,
      loaiBds: doc.loaiBds,
    });
    const vector = await embed(text);
    doc.embedding = vector;
    await doc.save();
    logger.info(`[PropertyAI] Đã cập nhật embedding: ${doc.slug || doc._id}`);
    return vector;
  } catch (error) {
    logger.warn(`[PropertyAI] Embed thất bại (${propertyId}): ${error.message}`);
    return null;
  }
}

export {
  ACTIVE_STATUS,
  getActivePropertiesForAi,
  refreshPropertyEmbedding,
  toAiCatalogItem,
};
export default {
  getActivePropertiesForAi,
  refreshPropertyEmbedding,
  toAiCatalogItem,
};
