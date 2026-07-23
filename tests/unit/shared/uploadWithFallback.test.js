import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeMediaUrls,
  sanitizeMediaUrl,
} from '#infra/storage/uploadWithFallback.js';

describe('sanitizeMediaUrls', () => {
  it('drops swagger placeholder "string" and empty values', () => {
    assert.deepEqual(sanitizeMediaUrls(['string', '', 'null', 'undefined']), []);
  });

  it('keeps http(s) and /images/ paths', () => {
    assert.deepEqual(
      sanitizeMediaUrls([
        'https://res.cloudinary.com/x/a.jpg',
        '/images/crm-properties/1.jpg',
        'ftp://bad',
        'string',
      ]),
      ['https://res.cloudinary.com/x/a.jpg', '/images/crm-properties/1.jpg'],
    );
  });
});

describe('sanitizeMediaUrl', () => {
  it('returns empty for invalid', () => {
    assert.equal(sanitizeMediaUrl('string'), '');
    assert.equal(sanitizeMediaUrl(''), '');
  });
});
