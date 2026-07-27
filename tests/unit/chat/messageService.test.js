import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createMessageService } from '#modules/chat/services/messageService.js';
import { AppError } from '#shared/errors/AppError.js';

function roomWith(members) {
  return { _id: 'r1', tenPhong: 'Phòng', thanhVien: members };
}

describe('messageService.checkRoomAccess', () => {
  it('throws 404 when room missing', async () => {
    const service = createMessageService({
      Room: { findById: mock.fn(async () => null) },
      Message: {},
      Notification: {},
    });
    await assert.rejects(
      () => service.checkRoomAccess('r1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('throws 403 when user not active member', async () => {
    const service = createMessageService({
      Room: { findById: mock.fn(async () => roomWith([{ nguoiDung: 'u2', trangThai: 'active' }])) },
      Message: {},
      Notification: {},
    });
    await assert.rejects(
      () => service.checkRoomAccess('r1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });

  it('returns room+member when access granted', async () => {
    const room = roomWith([{ nguoiDung: 'u1', trangThai: 'active', vaiTro: 'admin' }]);
    const service = createMessageService({
      Room: { findById: mock.fn(async () => room) },
      Message: {},
      Notification: {},
    });
    const { member } = await service.checkRoomAccess('r1', 'u1');
    assert.equal(member.vaiTro, 'admin');
  });
});

describe('messageService.createMessage', () => {
  it('rejects missing content with 400', async () => {
    const service = createMessageService({ Room: {}, Message: {}, Notification: {} });
    await assert.rejects(
      () => service.createMessage({ roomId: 'r1' }, 'u1'),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('rejects invalid message type with 400', async () => {
    const room = roomWith([{ nguoiDung: 'u1', trangThai: 'active' }]);
    const service = createMessageService({
      Room: { findById: mock.fn(async () => room) },
      Message: {},
      Notification: {},
    });
    await assert.rejects(
      () => service.createMessage({ roomId: 'r1', noiDung: 'hi', loaiTinNhan: 'bad' }, 'u1'),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('accepts audio message with tapTin only', async () => {
    const room = roomWith([
      { nguoiDung: 'u1', trangThai: 'active' },
      { nguoiDung: 'u2', trangThai: 'active' },
    ]);
    const created = { _id: 'm1', roomId: 'r1', tapTin: ['https://res.cloudinary.com/x/v.webm'] };
    const Message = {
      create: mock.fn(async (doc) => ({ ...created, ...doc })),
      findById: mock.fn(() => ({
        populate: () => ({ populate: () => ({ populate: () => Promise.resolve(created) }) }),
      })),
    };
    const Room = {
      findById: mock.fn(async () => room),
      findByIdAndUpdate: mock.fn(async () => ({})),
    };
    const Notification = { insertMany: mock.fn(async () => []) };
    const service = createMessageService({ Room, Message, Notification });

    const result = await service.createMessage(
      {
        roomId: 'r1',
        loaiTinNhan: 'audio',
        tapTin: ['https://res.cloudinary.com/dnltiwxvo/video/upload/v1/chat-audio/v.webm'],
      },
      'u1',
    );
    assert.equal(result.tapTin[0], 'https://res.cloudinary.com/x/v.webm');
  });
});

describe('messageService.updateMessage', () => {
  it('throws 403 when not the sender', async () => {
    const service = createMessageService({
      Message: { findById: mock.fn(async () => ({ _id: 'm1', nguoiGuiId: 'other' })) },
      Room: {},
      Notification: {},
    });
    await assert.rejects(
      () => service.updateMessage('m1', 'u1', { noiDungMoi: 'x' }),
      (err) => err instanceof AppError && err.statusCode === 403,
    );
  });

  it('throws 404 when message missing', async () => {
    const service = createMessageService({
      Message: { findById: mock.fn(async () => null) },
      Room: {},
      Notification: {},
    });
    await assert.rejects(
      () => service.deleteMessage('m1', 'u1'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
