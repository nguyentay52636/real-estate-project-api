import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createViewingService } from '#modules/property/services/viewingService.js';
import { AppError } from '#shared/errors/AppError.js';

const guest = { id: 'u1', vaiTro: 'nguoi_thue', isStaff: false };

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
  it('throws 401 when actor missing', async () => {
    const service = createViewingService({ Viewing: {}, Property: {}, User: {} });
    await assert.rejects(
      () => service.createViewing({}),
      (err) => err instanceof AppError && err.statusCode === 401,
    );
  });

  it('throws 400 when required fields missing', async () => {
    const service = createViewingService({
      Viewing: {},
      Property: {},
      User: {},
    });

    await assert.rejects(
      () => service.createViewing({}, guest),
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
        service.createViewing(
          {
            batDongSanId: 'p1',
            thoiGian: '2026-07-20T09:00:00.000Z',
          },
          guest,
        ),
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
      () => service.getViewingById('missing', guest),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('viewingService.updateViewing', () => {
  it('rejects invalid trangThai with 400', async () => {
    const service = createViewingService({
      Viewing: {
        findById: mock.fn(async () => ({ _id: 'v1', nguoiDungId: 'u1', batDongSanId: 'p1' })),
      },
      Property: {},
      User: {},
    });
    await assert.rejects(
      () => service.updateViewing('v1', { trangThai: 'sai' }, guest),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('rejects access for other user with 403', async () => {
    const service = createViewingService({
      Viewing: {
        findById: mock.fn(async () => ({
          _id: 'v1',
          nguoiDungId: 'other',
          batDongSanId: 'p1',
        })),
      },
      Property: {
        findById: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner1' })),
      },
      User: {},
    });
    await assert.rejects(
      () => service.updateViewing('v1', { ghiChu: 'x' }, guest),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });
});

describe('viewingService.deleteViewing', () => {
  it('throws 404 when not found', async () => {
    const service = createViewingService({
      Viewing: { findById: mock.fn(async () => null) },
      Property: {},
      User: {},
    });

    await assert.rejects(
      () => service.deleteViewing('missing', guest),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
