import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyService } from '#modules/property/services/propertyService.js';
import { AppError } from '#shared/errors/AppError.js';

function chainable(result) {
  const q = {
    populate: mock.fn(() => q),
    sort: mock.fn(() => q),
    skip: mock.fn(() => q),
    limit: mock.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  };
  return q;
}

describe('propertyService.getAllProperties', () => {
  it('builds filter + pagination and returns data', async () => {
    const docs = [{ _id: 'p1' }, { _id: 'p2' }];
    const Property = {
      find: mock.fn(() => chainable(docs)),
      countDocuments: mock.fn(async () => 2),
    };

    const service = createPropertyService({ Property, User: {} });
    const { data, pagination } = await service.getAllProperties({ page: 1, limit: 10 });

    assert.deepEqual(data, docs);
    assert.equal(pagination.total, 2);
    assert.equal(pagination.page, 1);
    assert.equal(pagination.totalPages, 1);
  });
});

describe('propertyService.getPropertyById', () => {
  it('throws 404 when not found', async () => {
    const Property = {
      findById: mock.fn(() => ({ populate: mock.fn(async () => null) })),
    };
    const service = createPropertyService({ Property, User: {} });

    await assert.rejects(
      () => service.getPropertyById('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('returns property when found', async () => {
    const doc = { _id: 'p1' };
    const Property = {
      findById: mock.fn(() => ({ populate: mock.fn(async () => doc) })),
    };
    const service = createPropertyService({ Property, User: {} });
    const result = await service.getPropertyById('p1');
    assert.equal(result, doc);
  });
});

describe('propertyService.createProperty', () => {
  it('throws 404 when owner user missing', async () => {
    const service = createPropertyService({
      Property: {},
      User: { findById: mock.fn(async () => null) },
    });

    await assert.rejects(
      () => service.createProperty({ nguoiDungId: 'u1' }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('propertyService.updatePropertyStatus', () => {
  it('rejects invalid status with 400', async () => {
    const service = createPropertyService({ Property: {}, User: {} });
    await assert.rejects(
      () => service.updatePropertyStatus('p1', 'khong_hop_le'),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('updates when status valid', async () => {
    const updated = { _id: 'p1', trangThai: 'da_cho_thue' };
    const service = createPropertyService({
      Property: { findByIdAndUpdate: mock.fn(async () => updated) },
      User: {},
    });
    const result = await service.updatePropertyStatus('p1', 'da_cho_thue');
    assert.equal(result.trangThai, 'da_cho_thue');
  });
});

describe('propertyService.deleteProperty', () => {
  it('throws 404 when nothing deleted', async () => {
    const service = createPropertyService({
      Property: { findByIdAndDelete: mock.fn(async () => null) },
      User: {},
    });
    await assert.rejects(
      () => service.deleteProperty('x'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
