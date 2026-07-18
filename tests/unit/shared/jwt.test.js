import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '#shared/utils/jwt.js';

const ACCESS = 'test-access-secret-min-32-chars!!';
const REFRESH = 'test-refresh-secret-min-32-chars!';

describe('jwt utils', () => {
  const user = { _id: 'user123', vaiTro: 'nguoi_thue' };

  it('generateAccessToken signs id and vaiTro', () => {
    const token = generateAccessToken(user, ACCESS);
    const payload = jwt.verify(token, ACCESS);
    assert.equal(payload.id, 'user123');
    assert.equal(payload.vaiTro, 'nguoi_thue');
  });

  it('access token default TTL is ~7 days', () => {
    const token = generateAccessToken(user, ACCESS);
    const payload = jwt.verify(token, ACCESS);
    const ttlSec = payload.exp - payload.iat;
    // 7d = 604800s (±60s tolerance)
    assert.ok(ttlSec >= 604800 - 60 && ttlSec <= 604800 + 60);
  });

  it('generateRefreshToken verifies with refresh secret', () => {
    const token = generateRefreshToken(user, REFRESH);
    const payload = verifyRefreshToken(token, REFRESH);
    assert.equal(payload.id, 'user123');
  });

  it('accepts user.id when _id missing', () => {
    const token = generateAccessToken({ id: 'abc', vaiTro: 'admin' }, ACCESS);
    const payload = jwt.verify(token, ACCESS);
    assert.equal(payload.id, 'abc');
  });
});
