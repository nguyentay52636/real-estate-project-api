import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAccessToken,
  extractSocketAccessToken,
} from '#shared/utils/extractAccessToken.js';
import { durationToMs, getAuthCookieOptions } from '#shared/utils/authCookies.js';
import { createCircuitBreaker, withTimeout } from '#shared/utils/circuitBreaker.js';

describe('extractAccessToken', () => {
  it('prefers Authorization Bearer over cookie', () => {
    const token = extractAccessToken({
      headers: { authorization: 'Bearer header-tok' },
      cookies: { accessToken: 'cookie-tok' },
    });
    assert.equal(token, 'header-tok');
  });

  it('falls back to accessToken cookie', () => {
    const token = extractAccessToken({
      headers: {},
      cookies: { accessToken: 'cookie-tok' },
    });
    assert.equal(token, 'cookie-tok');
  });

  it('returns null when missing', () => {
    assert.equal(extractAccessToken({ headers: {}, cookies: {} }), null);
  });
});

describe('extractSocketAccessToken', () => {
  it('reads cookie from handshake', () => {
    const token = extractSocketAccessToken({
      handshake: {
        auth: {},
        headers: { cookie: 'refreshToken=r; accessToken=sock-tok; other=1' },
      },
    });
    assert.equal(token, 'sock-tok');
  });
});

describe('authCookies.durationToMs', () => {
  it('parses common JWT duration strings', () => {
    assert.equal(durationToMs('15m', 0), 15 * 60_000);
    assert.equal(durationToMs('1h', 0), 3_600_000);
    assert.equal(durationToMs('30d', 0), 30 * 86_400_000);
  });
});

describe('authCookies.getAuthCookieOptions', () => {
  it('returns httpOnly cookie options', () => {
    const opts = getAuthCookieOptions({ kind: 'access' });
    assert.equal(opts.httpOnly, true);
    assert.ok(opts.maxAge > 0);
    assert.equal(opts.path, '/');
  });
});

describe('circuitBreaker', () => {
  it('opens after threshold failures', () => {
    const cb = createCircuitBreaker({ name: 't', threshold: 2, cooldownMs: 60_000 });
    cb.recordFailure();
    assert.equal(cb.isOpen(), false);
    cb.recordFailure();
    assert.equal(cb.isOpen(), true);
    assert.throws(() => cb.assertClosed(), (err) => err.code === 'CIRCUIT_OPEN');
  });

  it('withTimeout rejects slow promises', async () => {
    await assert.rejects(
      () => withTimeout(new Promise(() => {}), 20, 'slow'),
      (err) => err.code === 'TIMEOUT',
    );
  });
});
