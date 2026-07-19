import mongoose from 'mongoose';
import connectDB from '#config/db.js';
import CrmKnowledge from '#models/CrmKnowledge.js';
import { embed, buildEmbeddingText } from '#modules/ai/services/embeddingService.js';
import { clearCatalogCache } from '#modules/ai/services/crmKnowledgeCatalogClient.js';

/**
 * Tạo embedding cho các BĐS đang thiếu (VD seed trực tiếp vào DB, không qua createKnowledge()).
 * Cần thiết để semantic search (vectorSearchService.js) có dữ liệu để so cosine similarity.
 *
 * Run: npm run backfill:embeddings
 */

async function main() {
  await connectDB();

  const missing = await CrmKnowledge.find({
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  });

  console.log(`Tìm thấy ${missing.length} bài thiếu embedding`);

  let done = 0;
  let failed = 0;

  for (const doc of missing) {
    try {
      const text = buildEmbeddingText(doc);
      const vector = await embed(text);
      doc.embedding = vector;
      await doc.save();
      done += 1;
      console.log(`  ✓ ${doc.tieuDe}`);
    } catch (error) {
      failed += 1;
      console.log(`  ✗ ${doc.tieuDe}: ${error.message}`);
    }
  }

  if (done > 0) clearCatalogCache();

  console.log(`\nHoàn tất. Thành công: ${done}. Lỗi: ${failed}.`);
  if (failed > 0) {
    console.log('Gợi ý: lỗi thường do hết credit OpenRouter hoặc thiếu OPEN_ROUTER_KEY/GEMINI_API_KEY trong .env.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
