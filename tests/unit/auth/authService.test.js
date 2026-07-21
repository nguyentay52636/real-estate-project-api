import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '#modules/auth/services/authService.js';
import { AppError } from '#shared/errors/AppError.js';

function createMockUserStore(seed = []) {
  const users = [...seed];
  return {
    users,
    findOne: mock.fn(async (query) => {
      if (query.email) return users.find((u) => u.email === query.email) || null;
      if (query.tenDangNhap) return users.find((u) => u.tenDangNhap === query.tenDangNhap) || null;
      return null;
    }),
    create: mock.fn(async (data) => {
      const user = { _id: `u_${users.length + 1}`, ...data };
      users.push(user);
      return user;
    }),
  };
}

describe('authService.register', () => {
  it('creates user and customer for nguoi_thue', async () => {
    const User = createMockUserStore();
    const customers = [];

    const service = createAuthService({
      User,
      Role: {
        findOne: mock.fn(async () => ({ _id: 'role_thue', ten: 'nguoi_thue' })),
        create: mock.fn(),
      },
      Customer: {
        create: mock.fn(async (data) => {
          const c = { _id: 'c1', ...data };
          customers.push(c);
          return c;
        }),
      },
      Owner: { create: mock.fn() },
      hashPassword: mock.fn(async (pw) => `hashed:${pw}`),
    });

    const result = await service.register({
      ten: 'An',
      email: 'an@example.com',
      tenDangNhap: 'an01',
      matKhau: 'secret12',
      xacNhanMatKhau: 'secret12',
      soDienThoai: '0901234567',
      vaiTro: 'nguoi_thue',
    });

    assert.equal(result.user.email, 'an@example.com');
    assert.equal(result.user.matKhau, undefined);
    assert.ok(result.customer);
    assert.equal(result.chuTro, null);
    assert.equal(customers[0].nguoiDungId, result.user._id);
    assert.equal(User.users[0].matKhau, 'hashed:secret12');
  });

  it('creates owner profile for chu_tro', async () => {
    const User = createMockUserStore();
    const owners = [];

    const service = createAuthService({
      User,
      Role: {
        findOne: mock.fn(async () => ({ _id: 'role_chu', ten: 'chu_tro' })),
        create: mock.fn(),
      },
      Customer: { create: mock.fn() },
      Owner: {
        create: mock.fn(async (data) => {
          const o = { _id: 'o1', ...data };
          owners.push(o);
          return o;
        }),
      },
      hashPassword: async (pw) => `hashed:${pw}`,
    });

    const result = await service.register({
      ten: 'Binh',
      email: 'binh@example.com',
      tenDangNhap: 'binh01',
      matKhau: 'secret12',
      xacNhanMatKhau: 'secret12',
      soDienThoai: '0901234568',
      vaiTro: 'chu_tro',
    });

    assert.ok(result.chuTro);
    assert.equal(result.customer, null);
    assert.equal(owners[0].nguoiDungId, result.user._id);
  });

  it('rejects mismatched passwords', async () => {
    const service = createAuthService({
      User: createMockUserStore(),
      Role: { findOne: mock.fn(), create: mock.fn() },
      Customer: { create: mock.fn() },
      Owner: { create: mock.fn() },
    });

    await assert.rejects(
      () =>
        service.register({
          ten: 'An',
          email: 'an@example.com',
          tenDangNhap: 'an01',
          matKhau: 'secret12',
          xacNhanMatKhau: 'other',
          soDienThoai: '0901234567',
          vaiTro: 'nguoi_thue',
        }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('rejects duplicate email', async () => {
    const User = createMockUserStore([
      { email: 'an@example.com', tenDangNhap: 'other' },
    ]);

    const service = createAuthService({
      User,
      Role: { findOne: mock.fn(), create: mock.fn() },
      Customer: { create: mock.fn() },
      Owner: { create: mock.fn() },
      hashPassword: async (pw) => pw,
    });

    await assert.rejects(
      () =>
        service.register({
          ten: 'An',
          email: 'an@example.com',
          tenDangNhap: 'an01',
          matKhau: 'secret12',
          xacNhanMatKhau: 'secret12',
          soDienThoai: '0901234567',
          vaiTro: 'nguoi_thue',
        }),
      (err) => err instanceof AppError && err.message === 'Email already exists',
    );
  });

  it('defaults vaiTro to nguoi_thue when omitted and hides matKhau', async () => {
    const User = createMockUserStore();
    const customers = [];

    const service = createAuthService({
      User,
      Role: {
        findOne: mock.fn(async ({ ten }) => {
          assert.equal(ten, 'nguoi_thue');
          return { _id: 'role_thue', ten: 'nguoi_thue' };
        }),
        create: mock.fn(),
      },
      Customer: {
        create: mock.fn(async (data) => {
          const c = { _id: 'c1', ...data };
          customers.push(c);
          return c;
        }),
      },
      Owner: { create: mock.fn() },
      hashPassword: async (pw) => `hashed:${pw}`,
    });

    const result = await service.register({
      ten: 'Default',
      email: 'def@example.com',
      tenDangNhap: 'def01',
      matKhau: 'secret12',
      xacNhanMatKhau: 'secret12',
      soDienThoai: '0901234567',
    });

    assert.ok(result.customer);
    assert.equal(result.chuTro, null);
    assert.equal(result.user.matKhau, undefined);
  });
});

describe('authService.login', () => {
  it('returns tokens when password matches', async () => {
    const userDoc = {
      _id: 'u1',
      tenDangNhap: 'an01',
      matKhau: 'hashed',
      vaiTro: 'role1',
      email: 'an@example.com',
    };
    const refreshTokens = [];

    const service = createAuthService({
      User: {
        findOne: mock.fn(() => ({
          populate: mock.fn(async () => ({
            ...userDoc,
            _doc: { ...userDoc },
          })),
        })),
      },
      RefreshToken: {
        create: mock.fn(async (data) => {
          refreshTokens.push(data);
          return data;
        }),
      },
      comparePassword: async () => true,
      generateAccessToken: () => 'access.jwt',
      generateRefreshToken: () => 'refresh.jwt',
    });

    const result = await service.login({
      tenDangNhap: 'an01',
      matKhau: 'secret12',
    });

    assert.equal(result.accessToken, 'access.jwt');
    assert.equal(result.refreshToken, 'refresh.jwt');
    assert.equal(result.user.tenDangNhap, 'an01');
    assert.equal(result.user.matKhau, undefined);
    assert.equal(refreshTokens.length, 1);
  });

  it('throws when user missing', async () => {
    const service = createAuthService({
      User: {
        findOne: mock.fn(() => ({
          populate: mock.fn(async () => null),
        })),
      },
    });

    await assert.rejects(
      () => service.login({ tenDangNhap: 'x', matKhau: 'y' }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
  });

  it('throws when password wrong', async () => {
    const service = createAuthService({
      User: {
        findOne: mock.fn(() => ({
          populate: mock.fn(async () => ({
            _id: 'u1',
            matKhau: 'hashed',
            _doc: { _id: 'u1', matKhau: 'hashed' },
          })),
        })),
      },
      comparePassword: async () => false,
    });

    await assert.rejects(
      () => service.login({ tenDangNhap: 'an01', matKhau: 'bad' }),
      (err) => err instanceof AppError && err.message === 'Password is incorrect',
    );
  });
});

describe('authService.forgotPassword', () => {
  it('sends email when user exists without revealing in response', async () => {
    const user = {
      _id: 'u1',
      email: 'a@example.com',
      createPasswordChangedToken: () => 'raw-token',
      save: mock.fn(async () => {}),
    };

    const sendMail = mock.fn(async () => ({ messageId: 'm1' }));
    const service = createAuthService({
      User: { findOne: mock.fn(async () => user) },
      sendMail,
      isEmailConfigured: () => true,
    });

    const result = await service.forgotPassword('a@example.com');
    assert.ok(result.message.includes('email'));
    assert.equal(result.resetToken, undefined);
    assert.equal(sendMail.mock.calls.length, 1);
  });

  it('returns same message when email not found', async () => {
    const sendMail = mock.fn(async () => ({}));
    const service = createAuthService({
      User: { findOne: mock.fn(async () => null) },
      sendMail,
      isEmailConfigured: () => true,
    });

    const result = await service.forgotPassword('missing@example.com');
    assert.ok(result.message.includes('email'));
    assert.equal(sendMail.mock.calls.length, 0);
  });

  it('throws 503 when email is not configured but user exists', async () => {
    const user = {
      _id: 'u1',
      email: 'a@example.com',
      createPasswordChangedToken: () => 'raw-token',
      save: mock.fn(async () => {}),
    };

    const service = createAuthService({
      User: { findOne: mock.fn(async () => user) },
      isEmailConfigured: () => false,
      sendMail: mock.fn(async () => ({})),
    });

    await assert.rejects(
      () => service.forgotPassword('a@example.com'),
      (err) => err instanceof AppError && err.statusCode === 503,
    );
  });

  it('clears reset token when send mail fails', async () => {
    const user = {
      _id: 'u1',
      email: 'a@example.com',
      resetPasswordToken: 'hashed',
      resetPasswordExpires: Date.now() + 1000,
      createPasswordChangedToken() {
        this.resetPasswordToken = 'hashed';
        this.resetPasswordExpires = Date.now() + 1000;
        return 'raw-token';
      },
      save: mock.fn(async function save() {
        return this;
      }),
    };

    const service = createAuthService({
      User: { findOne: mock.fn(async () => user) },
      isEmailConfigured: () => true,
      sendMail: mock.fn(async () => {
        throw new AppError('Không thể gửi email', 503);
      }),
    });

    await assert.rejects(
      () => service.forgotPassword('a@example.com'),
      (err) => err instanceof AppError && err.statusCode === 503,
    );
    assert.equal(user.resetPasswordToken, undefined);
    assert.equal(user.resetPasswordExpires, undefined);
    assert.equal(user.save.mock.calls.length, 2);
  });
});

describe('authService.resetPassword', () => {
  it('rejects invalid token', async () => {
    const service = createAuthService({
      User: { findOne: mock.fn(async () => null) },
      RefreshToken: { deleteMany: mock.fn(async () => {}) },
    });

    await assert.rejects(
      () => service.resetPassword({ token: 'bad', matKhauMoi: 'secret12' }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });
});

describe('authService.changePassword', () => {
  it('rejects wrong current password', async () => {
    const service = createAuthService({
      User: {
        findById: mock.fn(async () => ({ _id: 'u1', matKhau: 'hashed' })),
      },
      comparePassword: async () => false,
      RefreshToken: { deleteMany: mock.fn(async () => {}) },
    });

    await assert.rejects(
      () =>
        service.changePassword('u1', {
          matKhauCu: 'wrong',
          matKhauMoi: 'newpass1',
        }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it('updates password when current password matches', async () => {
    const user = {
      _id: 'u1',
      matKhau: 'hashed-old',
      save: mock.fn(async function save() {
        return this;
      }),
    };

    const service = createAuthService({
      User: { findById: mock.fn(async () => user) },
      comparePassword: async () => true,
      hashPassword: async (pw) => `hashed:${pw}`,
      RefreshToken: { deleteMany: mock.fn(async () => ({ deletedCount: 1 })) },
    });

    const result = await service.changePassword('u1', {
      matKhauCu: 'oldpass',
      matKhauMoi: 'newpass1',
    });

    assert.equal(result.success, true);
    assert.equal(user.matKhau, 'hashed:newpass1');
    assert.equal(user.save.mock.calls.length, 1);
  });
});
