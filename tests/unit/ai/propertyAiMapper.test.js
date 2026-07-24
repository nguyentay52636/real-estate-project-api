import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toAiCatalogItem } from '#modules/ai/services/propertyAiMapper.js';

describe('toAiCatalogItem', () => {
  it('maps Property to AI catalog shape with FE product url', () => {
    process.env.CLIENT_URL = 'https://newlive-sable.vercel.app,http://localhost:5173';
    const item = toAiCatalogItem({
      _id: 'p1',
      tieuDe: 'Căn hộ Q2',
      moTa: 'View sông',
      gia: 12000000,
      diaChi: 'Nguyễn Văn Linh',
      quanHuyen: 'Quận 2',
      tinhThanh: 'TP.HCM',
      phongNgu: 2,
      dienTich: 65,
      loaiBds: 'can_ho',
      loaiGiaoDich: 'cho_thue',
      slug: 'can-ho-q2',
      anhDaiDien: 'https://cdn.example/a.jpg',
      gallery: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
      trangThai: 'dang_hoat_dong',
      embedding: [0.1, 0.2],
    });

    assert.equal(item.url, 'https://newlive-sable.vercel.app/products/can-ho-q2');
    assert.equal(item.trangThai, 'active');
    assert.deepEqual(item.anhUrls, ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']);
    assert.equal(item.anhDaiDien, 'https://cdn.example/a.jpg');
    assert.deepEqual(item.embedding, [0.1, 0.2]);
  });

  it('falls back anhUrls to anhDaiDien when gallery empty', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const item = toAiCatalogItem({
      _id: 'p2',
      tieuDe: 'Studio',
      slug: 'studio-1',
      anhDaiDien: '/images/x.jpg',
      gallery: [],
      trangThai: 'dang_hoat_dong',
    });
    assert.deepEqual(item.anhUrls, ['/images/x.jpg']);
  });
});
