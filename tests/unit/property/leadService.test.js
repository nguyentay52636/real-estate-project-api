import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createLeadService } from '#modules/property/services/leadService.js';
import { AppError } from '#shared/errors/AppError.js';

describe('leadService.createLead', () => {
  it('throws 400 when missing fields', async () => {
    const service = createLeadService({ Lead: {}, Property: {}, User: {} });
    await assert.rejects(
      () => service.createLead({}, { id: 'v1', vaiTro: 'nguoi_thue' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 400 when viewer is owner', async () => {
    const service = createLeadService({
      Lead: {},
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner-1' })),
        })),
      },
      User: {},
    });

    await assert.rejects(
      () =>
        service.createLead(
          { propertyId: 'p1', type: 'PHONE' },
          { id: 'owner-1', vaiTro: 'nguoi_thue' },
        ),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('creates lead with owner from property', async () => {
    const created = { _id: 'lead1' };
    const populated = {
      _id: 'lead1',
      propertyId: { _id: 'p1', tieuDe: 'Tin A' },
      ownerId: { _id: 'owner-1', ten: 'Chu' },
      viewerId: {
        _id: 'viewer-1',
        ten: 'Khach',
        soDienThoai: '090',
        vaiTro: { ten: 'nguoi_thue' },
      },
      type: 'PHONE',
      status: 'NEW',
      toObject() {
        return { ...this };
      },
    };

    function chainPopulate(result) {
      const q = {
        populate: mock.fn(() => q),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return q;
    }

    const Lead = {
      create: mock.fn(async (payload) => {
        assert.equal(payload.ownerId, 'owner-1');
        assert.equal(payload.viewerId, 'viewer-1');
        assert.equal(payload.type, 'PHONE');
        return created;
      }),
      findById: mock.fn(() => chainPopulate(populated)),
    };

    const service = createLeadService({
      Lead,
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner-1' })),
        })),
      },
      User: {},
    });

    const result = await service.createLead(
      { propertyId: 'p1', type: 'PHONE' },
      { id: 'viewer-1', vaiTro: 'nguoi_thue' },
    );

    assert.equal(result.viewer.ten, 'Khach');
    assert.equal(result.type, 'PHONE');
  });
});

describe('leadService.getLeadsForOwner', () => {
  it('scopes chu_tro to own ownerId', async () => {
    const filterCaptured = [];
    function chain(result) {
      const q = {
        populate: mock.fn(() => q),
        sort: mock.fn(() => q),
        skip: mock.fn(() => q),
        limit: mock.fn(() => Promise.resolve(result)),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return q;
    }

    const Lead = {
      find: mock.fn((filter) => {
        filterCaptured.push(filter);
        return chain([]);
      }),
      countDocuments: mock.fn(async () => 0),
    };

    const service = createLeadService({ Lead, Property: {}, User: {} });
    await service.getLeadsForOwner({ id: 'owner-1', vaiTro: 'chu_tro' }, {});

    assert.equal(filterCaptured[0].ownerId, 'owner-1');
  });
});

describe('leadService.updateLeadStatus', () => {
  it('rejects invalid status', async () => {
    const service = createLeadService({ Lead: {}, Property: {}, User: {} });
    await assert.rejects(
      () => service.updateLeadStatus('l1', 'WRONG', { id: 'o1', vaiTro: 'chu_tro' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });
});
