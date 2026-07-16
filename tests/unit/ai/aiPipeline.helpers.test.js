import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmbeddingText } from '#modules/ai/services/embeddingService.js';
import {
  cosineSimilarity,
  getThresholdForMode,
  searchByText,
  VECTOR_THRESHOLD,
  TEXT_THRESHOLD,
} from '#modules/ai/services/vectorSearchService.js';
import { shouldHandoffByKeyword } from '#modules/ai/services/aiAdvisoryPipeline.js';

describe('AI pure helpers (no DB / no LLM)', () => {
  it('buildEmbeddingText joins property fields', () => {
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
    assert.match(text, /Căn 2PN Quận 2/);
    assert.match(text, /Quận 2/);
    assert.match(text, /Giá 12000000/);
  });

  it('cosineSimilarity returns 1 for identical vectors', () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0, 0], [1, 0, 0]) - 1) < 0.001);
    assert.ok(Math.abs(cosineSimilarity([1, 0, 0], [0, 1, 0])) < 0.001);
    assert.equal(cosineSimilarity([], [1]), 0);
  });

  it('shouldHandoffByKeyword detects negotiation / deposit intent', () => {
    assert.equal(shouldHandoffByKeyword('Cho em giảm giá 2 triệu được không'), true);
    assert.equal(shouldHandoffByKeyword('Muốn đặt cọc giữ phòng'), true);
    assert.equal(shouldHandoffByKeyword('Căn 2PN Quận 2 giá bao nhiêu'), false);
  });

  it('thresholds follow mode', () => {
    assert.equal(getThresholdForMode('vector'), VECTOR_THRESHOLD);
    assert.equal(getThresholdForMode('text'), TEXT_THRESHOLD);
  });

  it('searchByText ranks by keyword hits', () => {
    const catalog = [
      { _id: '1', tieuDe: 'Studio Quận 1', moTa: 'Nhỏ', quanHuyen: 'Quận 1', gia: 5, phongNgu: 1 },
      { _id: '2', tieuDe: 'Căn 2PN Quận 2', moTa: 'View sông', quanHuyen: 'Quận 2', gia: 12, phongNgu: 2 },
    ];
    const results = searchByText('căn 2pn quận 2', catalog, { limit: 3 });
    assert.ok(results.length >= 1);
    assert.equal(results[0]._id, '2');
    assert.ok(results[0].score > 0);
  });
});
