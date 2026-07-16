import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from '#modules/chat/services/notificationService.js';
import { AppError } from '#shared/errors/AppError.js';

describe('notificationService.markAsRead', () => {
  it('throws 404 when notification missing', async () => {
    const service = createNotificationService({
      Notification: { findById: mock.fn(async () => null) },
    });
    await assert.rejects(
      () => service.markAsRead('n1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('throws 403 when not the recipient', async () => {
    const service = createNotificationService({
      Notification: {
        findById: mock.fn(async () => ({ _id: 'n1', nguoiNhan: 'other', save: mock.fn() })),
      },
    });
    await assert.rejects(
      () => service.markAsRead('n1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });
});

describe('notificationService.deleteNotification', () => {
  it('throws 403 when not the recipient', async () => {
    const service = createNotificationService({
      Notification: {
        findById: mock.fn(async () => ({ _id: 'n1', nguoiNhan: 'other' })),
        findByIdAndDelete: mock.fn(),
      },
    });
    await assert.rejects(
      () => service.deleteNotification('n1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });
});
