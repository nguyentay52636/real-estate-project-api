import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createViewingService } from '#modules/property/services/viewingService.js';
import { AppError } from '#shared/errors/AppError.js';

function populateChain(result) {
  const q = {
    populate: mock.fn(() => q),
    sort: mock.fn(() => q),
    skip: mock.fn(() => q),
    limit: mock.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
}

describe('viewingService.createViewing', () => {
  it('throws 400 when required fields missing', async () => {
    const service = createViewingService({
      Viewing: {},
      Property: {},
      User: {},
    });

    await assert.rejects(
      () => service.createViewing({}),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 404 when user not found', async () => {
    const service = createViewingService({
      Viewing: {},
      Property: { findById: mock.fn(async () => ({ _id: 'p1' })) },
      User: { findById: mock.fn(async () => null) },
    });

    await assert.rejects(
      () =>
        service.createViewing({
          nguoiDungId: 'u1',
          batDongSanId: 'p1',
          thoiGian: '2026-07-20T09:00:00.000Z',
        }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('viewingService.getViewingById', () => {
  it('throws 404 when not found', async () => {
    const service = createViewingService({
      Viewing: {
        findById: mock.fn(() => populateChain(null)),
      },
      Property: {},
      User: {},
    });

    await assert.rejects(
      () => service.getViewingById('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('viewingService.updateViewing', () => {
  it('rejects invalid trangThai with 400', async () => {
    const service = createViewingService({ Viewing: {}, Property: {}, User: {} });
    await assert.rejects(
      () => service.updateViewing('v1', { trangThai: 'sai' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });
});

describe('viewingService.deleteViewing', () => {
  it('throws 404 when not found', async () => {
    const service = createViewingService({
      Viewing: { findByIdAndDelete: mock.fn(async () => null) },
      Property: {},
      User: {},
    });

    await assert.rejects(
      () => service.deleteViewing('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
