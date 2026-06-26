import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import { buildEmbeddingText } from '../services/embeddingService.js';
import { cosineSimilarity, getThresholdForMode, VECTOR_THRESHOLD, TEXT_THRESHOLD } from '../services/vectorSearchService.js';
import { shouldHandoffByKeyword } from '../services/aiAdvisoryPipeline.js';

/**
 * Smoke tests for CRM AI pipeline (no live Gemini/DB required for most checks).
 * Run: node scripts/test-crm-ai-pipeline.js
 */

function testBuildEmbeddingText() {
  const text = buildEmbeddingText({
    tieuDe: 'Căn 2PN Quận 2',
    moTa: 'View sông, full nội thất',
    diaChi: '123 Nguyễn Văn Linh',
    quanHuyen: 'Quận 2',
    gia: 12000000,
    phongNgu: 2,
    dienTich: 65,
    loaiBds: 'can_ho',
  });
  assert(text.includes('Căn 2PN Quận 2'));
  assert(text.includes('Quận 2'));
  console.log('✓ buildEmbeddingText');
}

function testCosineSimilarity() {
  const a = [1, 0, 0];
  const b = [1, 0, 0];
  const c = [0, 1, 0];
  assert(Math.abs(cosineSimilarity(a, b) - 1) < 0.001);
  assert(Math.abs(cosineSimilarity(a, c)) < 0.001);
  console.log('✓ cosineSimilarity');
}

function testHandoffKeywords() {
  assert(shouldHandoffByKeyword('Cho em giảm giá 2 triệu được không'));
  assert(shouldHandoffByKeyword('Muốn đặt cọc giữ phòng'));
  assert(!shouldHandoffByKeyword('Căn 2PN Quận 2 giá bao nhiêu'));
  console.log('✓ shouldHandoffByKeyword');
}

function testThreshold() {
  assert(getThresholdForMode('vector') === VECTOR_THRESHOLD);
  assert(getThresholdForMode('text') === TEXT_THRESHOLD);
  console.log(`✓ thresholds vector=${VECTOR_THRESHOLD}, text=${TEXT_THRESHOLD}`);
}

async function testModulesLoad() {
  await import('../models/CrmKnowledge.js');
  await import('../services/crmKnowledgeService.js');
  await import('../services/geminiChatService.js');
  await import('../controllers/crmKnowledgeController.js');
  await import('../routes/crmKnowledge.js');
  console.log('✓ modules load');
}

try {
  testBuildEmbeddingText();
  testCosineSimilarity();
  testHandoffKeywords();
  testThreshold();
  await testModulesLoad();
  console.log('\nAll CRM AI pipeline smoke tests passed.');
} catch (error) {
  console.error('\nTest failed:', error.message);
  process.exit(1);
}
