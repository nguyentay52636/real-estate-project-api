import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, isAppError } from '#shared/errors/AppError.js';

describe('AppError', () => {
  it('stores message and statusCode', () => {
    const err = new AppError('Not found', 404);
    assert.equal(err.message, 'Not found');
    assert.equal(err.statusCode, 404);
    assert.equal(err.name, 'AppError');
    assert.ok(isAppError(err));
  });

  it('defaults statusCode to 500', () => {
    const err = new AppError('boom');
    assert.equal(err.statusCode, 500);
  });

  it('isAppError returns false for plain Error', () => {
    assert.equal(isAppError(new Error('x')), false);
    assert.equal(isAppError(null), false);
  });
});
