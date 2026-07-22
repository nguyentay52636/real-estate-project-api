import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, decryptPayload } from '#shared/utils/cryptoPayload.js';

describe('cryptoPayload utils', () => {
  const sampleData = {
    id: '6a6022d92b9eadf5cf73f0fe',
    tieuDe: 'Căn hộ Quận 3',
    gia: 4500000000,
    chuNha: { ten: 'Nguyen Van A' },
  };
  const secretKey = 'test_secret_key_32_bytes_len_ok!';

  it('encrypts payload into hex string with iv:encrypted format', () => {
    const encrypted = encryptPayload(sampleData, secretKey);
    assert.equal(typeof encrypted, 'string');
    assert.ok(encrypted.includes(':'));
    const [iv, cipherText] = encrypted.split(':');
    assert.equal(iv.length, 32); // 16 bytes = 32 hex chars
    assert.ok(cipherText.length > 0);
  });

  it('decrypts encrypted payload back into original object', () => {
    const encrypted = encryptPayload(sampleData, secretKey);
    const decrypted = decryptPayload(encrypted, secretKey);
    assert.deepEqual(decrypted, sampleData);
  });

  it('handles null/undefined data safely', () => {
    assert.equal(encryptPayload(null), null);
    assert.equal(encryptPayload(undefined), undefined);
  });
});
