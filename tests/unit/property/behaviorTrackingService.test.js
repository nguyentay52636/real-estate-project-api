import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createBehaviorTrackingService } from '#modules/property/services/behaviorTrackingService.js';
import { AppError } from '#shared/errors/AppError.js';

describe('behaviorTrackingService.trackBehavior', () => {
  it('rejects invalid action', async () => {
    const service = createBehaviorTrackingService({
      Property: {},
      Behavior: {},
      Lead: {},
    });
    await assert.rejects(
      () => service.trackBehavior('p1', { action: 'NOPE', sessionId: 's1' }, {}),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('requires sessionId or viewerId', async () => {
    const service = createBehaviorTrackingService({
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner' })),
        })),
      },
      Behavior: {},
      Lead: {},
    });
    await assert.rejects(
      () => service.trackBehavior('p1', { action: 'VIEW_DETAIL' }, {}),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('creates behavior and upserts lead with score', async () => {
    const service = createBehaviorTrackingService({
      debounceMs: 0,
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner-1' })),
        })),
      },
      Behavior: {
        findOne: mock.fn(() => ({ lean: mock.fn(async () => null) })),
        create: mock.fn(async (doc) => ({
          ...doc,
          _id: 'b1',
          createdAt: new Date(),
        })),
      },
      Lead: {
        findOneAndUpdate: mock.fn(async (_q, update) => ({
          _id: 'l1',
          score: update.$inc.score,
          lastAction: update.$set.lastAction,
          status: 'NEW',
          actions: [update.$set.lastAction],
        })),
      },
    });

    const result = await service.trackBehavior(
      'p1',
      { action: 'VIEW_PHONE', sessionId: 's1' },
      { viewerId: 'viewer-1' },
    );

    assert.equal(result.success, true);
    assert.equal(result.data.pointsAdded, 10);
    assert.equal(result.data.lead.score, 10);
    assert.equal(result.data.lead.lastAction, 'VIEW_PHONE');
  });

  it('skips debounce spam', async () => {
    const service = createBehaviorTrackingService({
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner-1' })),
        })),
      },
      Behavior: {
        findOne: mock.fn(() => ({
          lean: mock.fn(async () => ({ _id: 'recent' })),
        })),
        create: mock.fn(async () => {
          throw new Error('should not create');
        }),
      },
      Lead: {},
    });

    const result = await service.trackBehavior(
      'p1',
      { action: 'VIEW_DETAIL', sessionId: 's1' },
      { viewerId: 'viewer-1' },
    );
    assert.equal(result.data.skipped, true);
    assert.equal(result.data.reason, 'debounce');
  });
});

describe('behaviorTrackingService ownership', () => {
  it('forbids non-owner analytics', async () => {
    const service = createBehaviorTrackingService({
      Property: {
        findById: mock.fn(() => ({
          select: mock.fn(async () => ({ _id: 'p1', nguoiDungId: 'owner-1' })),
        })),
      },
      Behavior: {},
      Lead: {},
    });

    await assert.rejects(
      () =>
        service.getAnalytics('p1', { id: 'other', vaiTro: 'chu_tro' }, {}),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });
});
