import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOAuthExchangeCode,
  consumeOAuthExchangeCode,
  _clearOAuthExchangeStore,
} from '#modules/auth/services/oauthExchangeStore.js';

describe('oauthExchangeStore', () => {
  beforeEach(() => {
    _clearOAuthExchangeStore();
  });

  it('exchanges code once then invalidates', () => {
    const code = createOAuthExchangeCode({ accessToken: 'tok', user: { _id: 'u1' } });
    const first = consumeOAuthExchangeCode(code);
    assert.equal(first.accessToken, 'tok');
    assert.equal(consumeOAuthExchangeCode(code), null);
  });

  it('rejects missing or garbage code', () => {
    assert.equal(consumeOAuthExchangeCode(''), null);
    assert.equal(consumeOAuthExchangeCode('nope'), null);
  });
});
