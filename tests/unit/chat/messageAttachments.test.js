import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCloudinaryResourceType,
} from '#infra/storage/uploadWithFallback.js';
import {
  parseTapTinBody,
  inferLoaiTinNhan,
} from '#modules/chat/utils/messageAttachments.js';

describe('resolveCloudinaryResourceType', () => {
  it('maps audio to video resource type', () => {
    assert.equal(resolveCloudinaryResourceType('audio/webm'), 'video');
    assert.equal(resolveCloudinaryResourceType('audio/mpeg'), 'video');
  });

  it('maps image to image', () => {
    assert.equal(resolveCloudinaryResourceType('image/jpeg'), 'image');
  });
});

describe('parseTapTinBody', () => {
  it('parses JSON array string', () => {
    assert.deepEqual(
      parseTapTinBody('["https://res.cloudinary.com/x/a.webm"]'),
      ['https://res.cloudinary.com/x/a.webm'],
    );
  });

  it('wraps single URL', () => {
    assert.deepEqual(parseTapTinBody('https://cdn.test/a.mp3'), ['https://cdn.test/a.mp3']);
  });
});

describe('inferLoaiTinNhan', () => {
  it('detects audio from file mimetype', () => {
    assert.equal(
      inferLoaiTinNhan({
        files: [{ mimetype: 'audio/webm' }],
        tapTin: ['https://res.cloudinary.com/x/a.webm'],
      }),
      'audio',
    );
  });

  it('detects image from tapTin without explicit type', () => {
    assert.equal(
      inferLoaiTinNhan({ tapTin: ['https://res.cloudinary.com/x/a.jpg'] }),
      'image',
    );
  });

  it('keeps explicit loaiTinNhan', () => {
    assert.equal(inferLoaiTinNhan({ loaiTinNhan: 'system', tapTin: [] }), 'system');
  });
});
