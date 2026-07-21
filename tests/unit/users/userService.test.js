import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createUserService } from '#modules/users/services/userService.js';
import { AppError } from '#shared/errors/AppError.js';

function baseDeps(overrides = {}) {
  return {
    User: {
      findOne: mock.fn(async () => null),
      create: mock.fn(async (data) => ({ _id: 'u1', ...data })),
      ...overrides.User,
    },
    Role: {
      findOne: mock.fn(async () => ({ _id: 'role1', ten: 'nguoi_thue' })),
      create: mock.fn(async (data) => ({ _id: 'role1', ...data })),
      ...overrides.Role,
    },
    Customer: { create: mock.fn(async (d) => ({ _id: 'c1', ...d })), ...overrides.Customer },
    Owner: { create: mock.fn(async (d) => ({ _id: 'o1', ...d })), ...overrides.Owner },
    Employee: { create: mock.fn(async (d) => ({ _id: 'e1', ...d })), ...overrides.Employee },
    hashPassword: mock.fn(async (pw) => `hashed:${pw}`),
  };
}

describe('userService.createUser', () => {
  it('creates customer profile for nguoi_thue', async () => {
    const deps = baseDeps();
    const service = createUserService(deps);
    const result = await service.createUser({
      ten: 'An',
      email: 'an@example.com',
      tenDangNhap: 'an01',
      matKhau: 'secret12',
      soDienThoai: '0901234567',
      vaiTro: 'nguoi_thue',
    });

    assert.equal(result.user.matKhau, 'hashed:secret12');
    assert.ok(result.customer);
    assert.equal(result.chuTro, null);
    assert.equal(result.nhanVien, null);
  });

  it('creates owner profile for chu_tro (bug ChuTNha fixed)', async () => {
    const deps = baseDeps({ Role: { findOne: mock.fn(async () => ({ _id: 'r', ten: 'chu_tro' })) } });
    const service = createUserService(deps);
    const result = await service.createUser({
      ten: 'B',
      email: 'b@example.com',
      tenDangNhap: 'b01',
      matKhau: 'secret12',
      soDienThoai: '0901234568',
      vaiTro: 'chu_tro',
    });

    assert.ok(result.chuTro);
    assert.equal(result.customer, null);
  });

  it('creates employee profile for nhan_vien', async () => {
    const deps = baseDeps();
    const service = createUserService(deps);
    const result = await service.createUser({
      ten: 'C',
      email: 'c@example.com',
      tenDangNhap: 'c01',
      matKhau: 'secret12',
      soDienThoai: '0901234569',
      vaiTro: 'nhan_vien',
    });

    assert.ok(result.nhanVien);
  });

  it('rejects duplicate email with 400', async () => {
    const deps = baseDeps({
      User: { findOne: mock.fn(async (q) => (q.email ? { _id: 'x' } : null)) },
    });
    const service = createUserService(deps);
    await assert.rejects(
      () =>
        service.createUser({
          email: 'dup@example.com',
          tenDangNhap: 'x',
          matKhau: 'secret12',
          vaiTro: 'nguoi_thue',
        }),
      (err) => err instanceof AppError && err.message === 'Email already exists',
    );
  });
});

describe('userService.getUserById', () => {
  it('throws 404 when missing', async () => {
    const service = createUserService(
      baseDeps({
        User: {
          findById: mock.fn(() => ({
            select: mock.fn(() => ({
              populate: mock.fn(async () => null),
            })),
          })),
        },
      }),
    );
    await assert.rejects(
      () => service.getUserById('missing'),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });
});
