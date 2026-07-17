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
  it('builds filter + pagination and embeds chuNha', async () => {
    const chuNha = {
      _id: 'u1',
      ten: 'Nguyễn Văn Tay',
      vaiTro: { ten: 'chu_tro' },
    };
    const docs = [
      { _id: 'p1', tieuDe: 'A', nguoiDungId: chuNha, toObject() { return { _id: 'p1', tieuDe: 'A', nguoiDungId: chuNha }; } },
      { _id: 'p2', tieuDe: 'B', nguoiDungId: chuNha, toObject() { return { _id: 'p2', tieuDe: 'B', nguoiDungId: chuNha }; } },
    ];
    const Property = {
      find: mock.fn(() => chainable(docs)),
      countDocuments: mock.fn(async () => 2),
    };

    const service = createPropertyService({ Property, User: {} });
    const { data, pagination } = await service.getAllProperties({ page: 1, limit: 10 });

    assert.equal(data.length, 2);
    assert.equal(data[0].chuNha.ten, 'Nguyễn Văn Tay');
    assert.equal(data[0].chuNha.vaiTro.ten, 'chu_tro');
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

  it('returns property with chuNha when found', async () => {
    const chuNha = {
      _id: 'u1',
      ten: 'Nguyễn Văn Tay',
      email: 'tay@gmail.com',
      soDienThoai: '0846777900',
      vaiTro: { ten: 'chu_tro' },
    };
    const doc = {
      _id: 'p1',
      tieuDe: 'Căn hộ',
      nguoiDungId: chuNha,
      toObject() {
        return { _id: 'p1', tieuDe: 'Căn hộ', nguoiDungId: chuNha };
      },
    };
    const Property = {
      findById: mock.fn(() => ({ populate: mock.fn(async () => doc) })),
    };
    const service = createPropertyService({ Property, User: {} });
    const result = await service.getPropertyById('p1');
    assert.equal(result._id, 'p1');
    assert.equal(result.chuNha.ten, 'Nguyễn Văn Tay');
    assert.equal(result.chuNha.soDienThoai, '0846777900');
    assert.equal(result.chuNha.vaiTro.ten, 'chu_tro');
  });
});

describe('propertyService.getPropertyAuthor', () => {
  it('throws 404 when property not found', async () => {
    const Property = {
      findById: mock.fn(() => ({ populate: mock.fn(async () => null) })),
    };
    const service = createPropertyService({ Property, User: {} });

    await assert.rejects(
      () => service.getPropertyAuthor('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('returns chuNha with role when found', async () => {
    const chuNha = {
      _id: 'u1',
      ten: 'Nguyễn Văn Tay',
      vaiTro: { _id: 'r1', ten: 'chu_tro' },
    };
    const Property = {
      findById: mock.fn(() => ({
        populate: mock.fn(async () => ({
          _id: 'p1',
          tieuDe: 'Căn hộ Vinhomes',
          slug: 'can-ho-vinhomes',
          nguoiDungId: chuNha,
        })),
      })),
    };
    const service = createPropertyService({ Property, User: {} });
    const result = await service.getPropertyAuthor('p1');

    assert.equal(result.propertyId, 'p1');
    assert.equal(result.chuNha.ten, 'Nguyễn Văn Tay');
    assert.equal(result.chuNha.vaiTro.ten, 'chu_tro');
  });
});

describe('propertyService.createProperty', () => {
  it('throws 400 when nguoiDungId missing', async () => {
    const service = createPropertyService({ Property: {}, User: {} });
    await assert.rejects(
      () => service.createProperty({ tieuDe: 'Tin A' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 404 when owner user missing', async () => {
    const service = createPropertyService({
      Property: {},
      User: { findById: mock.fn(() => ({ populate: mock.fn(async () => null) })) },
    });

    await assert.rejects(
      () => service.createProperty({ nguoiDungId: 'u1' }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('throws 403 when role is not chu_tro/admin', async () => {
    const service = createPropertyService({
      Property: {},
      User: {
        findById: mock.fn(() => ({
          populate: mock.fn(async () => ({
            _id: 'u1',
            trangThai: 'hoat_dong',
            vaiTro: { ten: 'nguoi_thue' },
          })),
        })),
      },
    });

    await assert.rejects(
      () => service.createProperty({ nguoiDungId: 'u1', tieuDe: 'Tin' }),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });

  it('creates when user is chu_tro and strips chuNha from body', async () => {
    const chuNha = {
      _id: 'u1',
      ten: 'Tay',
      vaiTro: { ten: 'chu_tro' },
    };
    const savedDoc = {
      _id: 'p1',
      tieuDe: 'Tin',
      nguoiDungId: chuNha,
      toObject() {
        return { _id: 'p1', tieuDe: 'Tin', nguoiDungId: chuNha };
      },
    };

    let receivedPayload;
    function FakeProperty(payload) {
      receivedPayload = payload;
      this.save = mock.fn(async () => ({ _id: 'p1' }));
    }

    const service = createPropertyService({
      Property: FakeProperty,
      User: {
        findById: mock.fn((id) => {
          if (id === 'p1') {
            return { populate: mock.fn(async () => savedDoc) };
          }
          return {
            populate: mock.fn(async () => ({
              _id: 'u1',
              trangThai: 'hoat_dong',
              vaiTro: { ten: 'chu_tro' },
            })),
          };
        }),
      },
    });
    // Override: after save, getPropertyById uses Property.findById
    FakeProperty.findById = mock.fn(() => ({
      populate: mock.fn(async () => savedDoc),
    }));

    const result = await service.createProperty({
      tieuDe: 'Tin',
      nguoiDungId: 'u1',
      chuNha: { ten: 'hack' },
      gia: 1000,
    });

    assert.equal(receivedPayload.chuNha, undefined);
    assert.equal(receivedPayload.nguoiDungId, 'u1');
    assert.equal(result.chuNha.ten, 'Tay');
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
    const chuNha = { _id: 'u1', ten: 'Tay', vaiTro: { ten: 'chu_tro' } };
    const updated = {
      _id: 'p1',
      trangThai: 'da_cho_thue',
      nguoiDungId: chuNha,
      toObject() {
        return { _id: 'p1', trangThai: 'da_cho_thue', nguoiDungId: chuNha };
      },
    };
    const service = createPropertyService({
      Property: {
        findByIdAndUpdate: mock.fn(async () => ({ _id: 'p1', trangThai: 'da_cho_thue' })),
        findById: mock.fn(() => ({ populate: mock.fn(async () => updated) })),
      },
      User: {},
    });
    const result = await service.updatePropertyStatus('p1', 'da_cho_thue');
    assert.equal(result.trangThai, 'da_cho_thue');
    assert.equal(result.chuNha.ten, 'Tay');
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
