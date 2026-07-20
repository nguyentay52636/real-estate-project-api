import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createEmployeeService } from '#modules/users/services/employeeService.js';
import { AppError } from '#shared/errors/AppError.js';

const roleNv = { _id: 'role_nv', ten: 'nhan_vien' };

function leanUsersChain(users) {
  return {
    select: () => ({
      populate: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => users,
            }),
          }),
        }),
      }),
    }),
  };
}

function baseDeps(overrides = {}) {
  return {
    Role: {
      findOne: mock.fn(async () => roleNv),
      create: mock.fn(async (d) => ({ _id: 'role_nv', ...d })),
      ...overrides.Role,
    },
    User: {
      findOne: mock.fn(async () => null),
      findById: mock.fn(async () => null),
      create: mock.fn(async (d) => ({ _id: 'u1', ...d })),
      findByIdAndUpdate: mock.fn(async () => ({})),
      findByIdAndDelete: mock.fn(async () => ({ _id: 'u1' })),
      find: mock.fn(() => leanUsersChain([])),
      countDocuments: mock.fn(async () => 0),
      ...overrides.User,
    },
    Employee: {
      findOne: mock.fn(async () => null),
      findOneAndDelete: mock.fn(async () => null),
      create: mock.fn(async (d) => ({ _id: 'e1', ...d })),
      find: mock.fn(() => ({ lean: async () => [] })),
      ...overrides.Employee,
    },
    hashPassword: mock.fn(async (pw) => `hashed:${pw}`),
    ...overrides,
  };
}

describe('employeeService.getAllEmployees', () => {
  it('filters only users with vaiTro nhan_vien', async () => {
    const users = [
      {
        _id: 'u1',
        ten: 'Trinh Ngoc',
        email: 'trinhngoc12@gmail.com',
        vaiTro: roleNv,
      },
    ];

    let capturedFilter = null;
    const deps = baseDeps({
      User: {
        findOne: mock.fn(async () => null),
        findById: mock.fn(async () => null),
        create: mock.fn(async (d) => d),
        findByIdAndUpdate: mock.fn(async () => ({})),
        findByIdAndDelete: mock.fn(async () => null),
        find: mock.fn((filter) => {
          capturedFilter = filter;
          return leanUsersChain(users);
        }),
        countDocuments: mock.fn(async (filter) => {
          assert.equal(String(filter.vaiTro), 'role_nv');
          return 1;
        }),
      },
      Employee: {
        find: mock.fn(() => ({ lean: async () => [] })),
        findOne: mock.fn(async () => null),
        findOneAndDelete: mock.fn(async () => null),
        create: mock.fn(async (d) => d),
      },
    });

    const service = createEmployeeService(deps);
    const result = await service.getAllEmployees({ page: 1, limit: 20 });

    assert.equal(String(capturedFilter.vaiTro), 'role_nv');
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].email, 'trinhngoc12@gmail.com');
    assert.equal(result.data[0].nhanVien, null);
    assert.equal(result.pagination.total, 1);
  });
});

describe('employeeService.createEmployee', () => {
  it('throws 400 when creating user without required fields', async () => {
    const service = createEmployeeService(baseDeps());
    await assert.rejects(
      () => service.createEmployee({}),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('creates user + employee and returns staff user shape', async () => {
    const staffUser = {
      _id: 'u1',
      ten: 'NV A',
      email: 'a@ex.com',
      vaiTro: roleNv,
    };

    const deps = baseDeps({
      User: {
        findOne: mock.fn(async () => null),
        create: mock.fn(async (d) => ({ _id: 'u1', ...d })),
        findById: mock.fn(() => ({
          select: () => ({
            populate: () => ({
              lean: async () => staffUser,
            }),
          }),
        })),
        findByIdAndUpdate: mock.fn(async () => ({})),
        findByIdAndDelete: mock.fn(async () => null),
        find: mock.fn(() => leanUsersChain([])),
        countDocuments: mock.fn(async () => 0),
      },
      Employee: {
        findOne: mock.fn(async () => null),
        create: mock.fn(async (d) => ({ _id: 'e1', ...d })),
        find: mock.fn(() => ({
          lean: async () => [{ _id: 'e1', nguoiDungId: 'u1', phongBan: 'sale' }],
        })),
        findOneAndDelete: mock.fn(async () => null),
      },
    });

    const service = createEmployeeService(deps);
    const result = await service.createEmployee({
      ten: 'NV A',
      email: 'a@ex.com',
      tenDangNhap: 'nva',
      matKhau: 'secret1',
      phongBan: 'sale',
    });

    assert.equal(result._id, 'u1');
    assert.equal(result.nhanVien.phongBan, 'sale');
    assert.equal(deps.User.create.mock.calls.length, 1);
    assert.equal(deps.Employee.create.mock.calls.length, 1);
  });
});

describe('employeeService.updateEmployee', () => {
  it('throws 404 when user not found', async () => {
    const service = createEmployeeService(baseDeps());
    await assert.rejects(
      () => service.updateEmployee('missing', { luong: 1 }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('rejects invalid phongBan', async () => {
    const service = createEmployeeService(baseDeps());
    await assert.rejects(
      () => service.updateEmployee('u1', { phongBan: 'xyz' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });
});

describe('employeeService.deleteEmployee', () => {
  it('deletes user nhan_vien and profile by userId', async () => {
    const deps = baseDeps({
      User: {
        findById: mock.fn(async () => ({ _id: 'u1', vaiTro: 'role_nv' })),
        findByIdAndDelete: mock.fn(async () => ({ _id: 'u1' })),
        findOne: mock.fn(async () => null),
        create: mock.fn(async () => ({})),
        findByIdAndUpdate: mock.fn(async () => ({})),
        find: mock.fn(() => leanUsersChain([])),
        countDocuments: mock.fn(async () => 0),
      },
      Employee: {
        findOneAndDelete: mock.fn(async () => ({ _id: 'e1', nguoiDungId: 'u1' })),
        findOne: mock.fn(async () => null),
        create: mock.fn(async () => ({})),
        find: mock.fn(() => ({ lean: async () => [] })),
      },
    });

    const service = createEmployeeService(deps);
    const result = await service.deleteEmployee('u1');
    assert.equal(result.user._id, 'u1');
    assert.equal(result.nhanVien._id, 'e1');
  });
});
