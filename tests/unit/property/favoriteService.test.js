import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFavoriteService } from '#modules/property/services/favoriteService.js';
import { AppError } from '#shared/errors/AppError.js';

describe('favoriteService.addFavorite', () => {
  it('throws 400 when missing ids', async () => {
    const service = createFavoriteService({ Favorite: {} });
    await assert.rejects(
      () => service.addFavorite({ nguoiDungId: 'u1' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 400 when already favorited', async () => {
    const service = createFavoriteService({
      Favorite: { findOne: mock.fn(async () => ({ _id: 'f1' })) },
    });
    await assert.rejects(
      () => service.addFavorite({ nguoiDungId: 'u1', batDongSanId: 'p1' }),
      (err) => err instanceof AppError && err.message === 'Already in favorites',
    );
  });

  it('creates favorite when valid', async () => {
    const saved = [];
    function Favorite(data) {
      Object.assign(this, data);
      this.save = mock.fn(async () => {
        saved.push(data);
        return this;
      });
    }
    Favorite.findOne = mock.fn(async () => null);

    const service = createFavoriteService({ Favorite });
    const fav = await service.addFavorite({ nguoiDungId: 'u1', batDongSanId: 'p1' });

    assert.equal(fav.nguoiDungId, 'u1');
    assert.equal(saved.length, 1);
  });
});

describe('favoriteService.removeFavorite', () => {
  it('throws 404 when not found', async () => {
    const service = createFavoriteService({
      Favorite: { findOneAndDelete: mock.fn(async () => null) },
    });
    await assert.rejects(
      () => service.removeFavorite({ nguoiDungId: 'u1', batDongSanId: 'p1' }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
