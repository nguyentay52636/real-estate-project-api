import CrmKnowledge from '#models/CrmKnowledge.js';
import logger from '#shared/utils/logger.js';
import { embed, buildEmbeddingText } from './embeddingService.js';
import { clearCatalogCache } from './crmKnowledgeCatalogClient.js';
import {
  uploadBufferWithFallback,
  sanitizeMediaUrls,
  sanitizeMediaUrl,
} from '#infra/storage/uploadWithFallback.js';

async function safeEmbed(text) {
  try {
    return await embed(text);
  } catch (error) {
    logger.warn('[CrmKnowledge] Embed skipped:', error.message);
    return [];
  }
}

async function createKnowledge(data, userId) {
  const anhUrls = sanitizeMediaUrls(data.anhUrls);
  const anhDaiDien = sanitizeMediaUrl(data.anhDaiDien) || anhUrls[0] || '';
  const url = typeof data.url === 'string' ? data.url.trim() : '';

  const payload = {
    tieuDe: data.tieuDe,
    moTa: data.moTa,
    gia: data.gia,
    diaChi: data.diaChi,
    quanHuyen: data.quanHuyen,
    phongNgu: data.phongNgu,
    dienTich: data.dienTich,
    loaiBds: data.loaiBds,
    anhUrls,
    anhDaiDien,
    url,
    trangThai: data.trangThai,
  };

  const embeddingText = buildEmbeddingText(payload);
  const embedding = await safeEmbed(embeddingText);

  const doc = await CrmKnowledge.create({
    ...payload,
    embedding,
    nguoiTao: userId,
  });

  clearCatalogCache();

  const result = doc.toObject();
  delete result.embedding;
  return result;
}

async function updateKnowledge(id, data) {
  const existing = await CrmKnowledge.findById(id);
  if (!existing) return null;

  const anhUrls =
    data.anhUrls !== undefined ? sanitizeMediaUrls(data.anhUrls) : existing.anhUrls;
  const anhDaiDien =
    data.anhDaiDien !== undefined
      ? sanitizeMediaUrl(data.anhDaiDien) || anhUrls[0] || ''
      : existing.anhDaiDien;

  const merged = {
    tieuDe: data.tieuDe ?? existing.tieuDe,
    moTa: data.moTa ?? existing.moTa,
    gia: data.gia ?? existing.gia,
    diaChi: data.diaChi ?? existing.diaChi,
    quanHuyen: data.quanHuyen ?? existing.quanHuyen,
    phongNgu: data.phongNgu ?? existing.phongNgu,
    dienTich: data.dienTich ?? existing.dienTich,
    loaiBds: data.loaiBds ?? existing.loaiBds,
    anhUrls,
    anhDaiDien,
    url: data.url !== undefined ? String(data.url || '').trim() : existing.url,
    trangThai: data.trangThai ?? existing.trangThai,
  };

  const embeddingText = buildEmbeddingText(merged);
  const embedding = await safeEmbed(embeddingText);

  const updated = await CrmKnowledge.findByIdAndUpdate(
    id,
    { ...merged, embedding },
    { new: true, runValidators: true },
  )
    .select('-embedding')
    .populate('nguoiTao', 'ten email');

  clearCatalogCache();
  return updated;
}

async function listKnowledge({ page = 1, limit = 20, trangThai } = {}) {
  const filter = {};
  if (trangThai) filter.trangThai = trangThai;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CrmKnowledge.find(filter)
      .select('-embedding')
      .populate('nguoiTao', 'ten email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CrmKnowledge.countDocuments(filter),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getKnowledgeById(id) {
  return CrmKnowledge.findById(id)
    .select('-embedding')
    .populate('nguoiTao', 'ten email');
}

async function deleteKnowledge(id) {
  const result = await CrmKnowledge.findByIdAndDelete(id);
  if (result) clearCatalogCache();
  return result;
}

async function getAllActive({ includeEmbedding = false } = {}) {
  const query = CrmKnowledge.find({ trangThai: 'active' }).sort({ createdAt: -1 });

  if (includeEmbedding) {
    return query.lean();
  }

  return query.select('-embedding').lean();
}

/**
 * Upload ảnh đính kèm bài CRM: Cloudinary trước → fallback local images/.
 */
async function addImages(id, files) {
  const doc = await CrmKnowledge.findById(id);
  if (!doc) return null;

  const uploadedUrls = [];
  for (const file of files) {
    const uploaded = await uploadBufferWithFallback(
      file.buffer,
      file.originalname,
      'crm-properties',
    );
    uploadedUrls.push(uploaded.url);
    if (uploaded.storage === 'local') {
      logger.warn(`[CrmKnowledge] Cloudinary lỗi, dùng local: ${uploaded.fallbackReason}`);
    }
  }

  doc.anhUrls.push(...uploadedUrls);
  if (!doc.anhDaiDien && uploadedUrls[0]) {
    doc.anhDaiDien = uploadedUrls[0];
  }
  await doc.save();

  clearCatalogCache();
  const result = doc.toObject();
  delete result.embedding;
  return result;
}

function formatForClient(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  const { embedding, ...rest } = plain;
  return rest;
}

export {
  createKnowledge,
  updateKnowledge,
  listKnowledge,
  getKnowledgeById,
  deleteKnowledge,
  getAllActive,
  addImages,
  formatForClient,
};
export default {
  createKnowledge,
  updateKnowledge,
  listKnowledge,
  getKnowledgeById,
  deleteKnowledge,
  getAllActive,
  addImages,
  formatForClient,
};
