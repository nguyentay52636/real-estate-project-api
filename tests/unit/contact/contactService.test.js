import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createContactService } from '#modules/contact/services/contactService.js';
import { AppError } from '#shared/errors/AppError.js';

const validBody = {
  chuDe: 'Thông tin chung',
  hoTen: 'Nguyễn Văn A',
  soDienThoai: '0912345678',
  email: 'a@example.com',
  noiDung: 'Tôi cần hỗ trợ về tài khoản',
};

describe('contactService.createContact', () => {
  it('throws 400 when required fields missing', async () => {
    const service = createContactService({ Contact: {} });

    await assert.rejects(
      () => service.createContact({}),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 400 when email invalid', async () => {
    const service = createContactService({ Contact: {} });

    await assert.rejects(
      () => service.createContact({ ...validBody, email: 'not-an-email' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('creates contact with trangThai moi and optional userId', async () => {
    const created = {
      ...validBody,
      email: 'a@example.com',
      trangThai: 'moi',
      nguoiDungId: 'u1',
      toObject() {
        return { ...this };
      },
    };

    const service = createContactService({
      Contact: {
        create: mock.fn(async (payload) => {
          assert.equal(payload.trangThai, 'moi');
          assert.equal(payload.nguoiDungId, 'u1');
          assert.equal(payload.email, 'a@example.com');
          return created;
        }),
      },
    });

    const result = await service.createContact(validBody, 'u1');
    assert.equal(result.trangThai, 'moi');
    assert.equal(result.hoTen, 'Nguyễn Văn A');
  });
});

describe('contactService.getContactById', () => {
  it('throws 404 when not found', async () => {
    const q = {
      populate: mock.fn(async () => null),
    };
    const service = createContactService({
      Contact: {
        findById: mock.fn(() => q),
      },
    });

    await assert.rejects(
      () => service.getContactById('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('contactService.updateStatus', () => {
  it('rejects invalid trangThai with 400', async () => {
    const service = createContactService({ Contact: {} });

    await assert.rejects(
      () => service.updateStatus('c1', 'sai'),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('throws 404 when contact not found', async () => {
    const chain = {
      populate: mock.fn(async () => null),
    };
    const service = createContactService({
      Contact: {
        findByIdAndUpdate: mock.fn(() => chain),
      },
    });

    await assert.rejects(
      () => service.updateStatus('missing', 'dang_xu_ly'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});

describe('contactService.updateNote', () => {
  it('throws 400 when ghiChuNoiBo missing', async () => {
    const service = createContactService({ Contact: {} });

    await assert.rejects(
      () => service.updateNote('c1', undefined),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });
});
