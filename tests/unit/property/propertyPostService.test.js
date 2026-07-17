import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyPostService } from '#modules/property/services/propertyPostService.js';
import { AppError } from '#shared/errors/AppError.js';

describe('propertyPostService.createPost', () => {
  it('uses authenticated account as owner and ignores client owner fields', async () => {
    const createProperty = mock.fn(async (payload) => payload);
    const service = createPropertyPostService({
      propertyService: { createProperty },
    });

    const result = await service.createPost(
      {
        tieuDe: 'Căn hộ',
        nguoiDungId: 'fake-user',
        chuNha: { _id: 'fake-user' },
        slug: 'client-slug',
      },
      { id: 'auth-user', vaiTro: 'chu_tro' },
    );

    assert.equal(result.nguoiDungId, 'auth-user');
    assert.equal(result.chuNha, undefined);
    assert.equal(result.slug, undefined);
  });
});

describe('propertyPostService ownership', () => {
  const property = {
    _id: 'p1',
    nguoiDungId: { _id: 'owner-1' },
  };

  it('allows chu_tro to update own post', async () => {
    const updateProperty = mock.fn(async () => ({ ...property, tieuDe: 'Mới' }));
    const service = createPropertyPostService({
      propertyService: {
        getPropertyById: mock.fn(async () => property),
        updateProperty,
      },
    });

    await service.updatePost(
      'p1',
      { tieuDe: 'Mới', nguoiDungId: 'other-user' },
      { id: 'owner-1', vaiTro: 'chu_tro' },
    );

    assert.deepEqual(updateProperty.mock.calls[0].arguments[1], { tieuDe: 'Mới' });
  });

  it('rejects chu_tro managing another owner post', async () => {
    const service = createPropertyPostService({
      propertyService: {
        getPropertyById: mock.fn(async () => property),
      },
    });

    await assert.rejects(
      () =>
        service.deletePost('p1', {
          id: 'owner-2',
          vaiTro: 'chu_tro',
        }),
      (error) => error instanceof AppError && error.statusCode === 403,
    );
  });

  it('allows nhan_vien to manage any post', async () => {
    const deleteProperty = mock.fn(async () => property);
    const service = createPropertyPostService({
      propertyService: {
        getPropertyById: mock.fn(async () => property),
        deleteProperty,
      },
    });

    await service.deletePost('p1', { id: 'staff-1', vaiTro: 'nhan_vien' });
    assert.equal(deleteProperty.mock.callCount(), 1);
  });

  it('allows admin to manage any post', async () => {
    const updatePropertyStatus = mock.fn(async () => ({
      ...property,
      trangThai: 'da_ban',
    }));
    const service = createPropertyPostService({
      propertyService: {
        getPropertyById: mock.fn(async () => property),
        updatePropertyStatus,
      },
    });

    const result = await service.updatePostStatus(
      'p1',
      'da_ban',
      { id: 'admin-1', vaiTro: 'admin' },
    );
    assert.equal(result.trangThai, 'da_ban');
  });
});

describe('propertyPostService.getPosts', () => {
  it('returns only own posts for chu_tro', async () => {
    const getPropertiesByUser = mock.fn(async () => ({ data: [], pagination: {} }));
    const service = createPropertyPostService({
      propertyService: { getPropertiesByUser },
    });

    await service.getPosts({ id: 'owner-1', vaiTro: 'chu_tro' }, { page: 2 });

    assert.deepEqual(getPropertiesByUser.mock.calls[0].arguments, [
      'owner-1',
      { page: 2 },
    ]);
  });

  it('returns all posts for nhan_vien', async () => {
    const getAllProperties = mock.fn(async () => ({ data: [], pagination: {} }));
    const service = createPropertyPostService({
      propertyService: { getAllProperties },
    });

    await service.getPosts({ id: 'staff-1', vaiTro: 'nhan_vien' }, {});
    assert.equal(getAllProperties.mock.callCount(), 1);
  });
});
