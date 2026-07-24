import mongoose from 'mongoose';
import connectDB from '#config/db.js';
import Property from '#models/Property.js';
import { embed, buildEmbeddingText, hasEmbeddingProvider } from '#modules/ai/services/embeddingService.js';
import { clearCatalogCache } from '#modules/ai/services/crmKnowledgeCatalogClient.js';

/**
 * Backfill embedding cho Property đang hoạt động.
 * Usage: npm run backfill:property-embeddings
 */
async function main() {
  if (!hasEmbeddingProvider()) {
    console.error('Cần OPEN_ROUTER_KEY hoặc GEMINI_API_KEY trong .env');
    process.exit(1);
  }

  await connectDB();

  const missing = await Property.find({
    trangThai: 'dang_hoat_dong',
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  }).select('tieuDe moTa diaChi quanHuyen gia phongNgu dienTich loaiBds slug');

  console.log(`Tìm thấy ${missing.length} tin Property thiếu embedding`);

  let done = 0;
  let failed = 0;

  for (const doc of missing) {
    try {
      const text = buildEmbeddingText(doc);
      const vector = await embed(text);
      doc.embedding = vector;
      await doc.save();
      done += 1;
      console.log(`  ✓ ${doc.slug || doc.tieuDe}`);
    } catch (error) {
      failed += 1;
      console.log(`  ✗ ${doc.slug || doc.tieuDe}: ${error.message}`);
    }
  }

  if (done > 0) clearCatalogCache();

  console.log(`\nHoàn tất. Thành công: ${done}. Lỗi: ${failed}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
