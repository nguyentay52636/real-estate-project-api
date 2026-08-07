import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  memberSelect,
  findActiveMember,
  assertCanAccessRoom,
  assertRoomAdmin,
  assertCanDeleteOrDisbandRoom,
  resolvePrivateChatOtherId,
  buildRoomsListFilter,
  MEMBER_PUBLIC_SELECT,
  MEMBER_STAFF_SELECT,
} from '#modules/chat/utils/roomAccess.js';

describe('roomAccess.memberSelect', () => {
  it('hides email for non-staff', () => {
    assert.equal(memberSelect(false), MEMBER_PUBLIC_SELECT);
    assert.ok(!MEMBER_PUBLIC_SELECT.includes('email'));
  });

  it('allows email for staff', () => {
    assert.equal(memberSelect(true), MEMBER_STAFF_SELECT);
    assert.ok(MEMBER_STAFF_SELECT.includes('email'));
  });
});

describe('roomAccess.assertCanAccessRoom', () => {
  const room = {
    thanhVien: [
      { nguoiDung: 'u1', trangThai: 'active', vaiTro: 'admin' },
      { nguoiDung: 'u2', trangThai: 'left', vaiTro: 'member' },
    ],
  };

  it('allows active member', () => {
    const { member } = assertCanAccessRoom(room, 'u1', false);
    assert.equal(member.vaiTro, 'admin');
  });

  it('allows staff who is not a member', () => {
    assertCanAccessRoom(room, 'stranger', true);
  });

  it('rejects non-member non-staff', () => {
    assert.throws(
      () => assertCanAccessRoom(room, 'stranger', false),
      (err) => err.statusCode === 403,
    );
  });

  it('rejects left member', () => {
    assert.throws(
      () => assertCanAccessRoom(room, 'u2', false),
      (err) => err.statusCode === 403,
    );
  });
});

describe('roomAccess.assertRoomAdmin', () => {
  const room = {
    thanhVien: [
      { nguoiDung: 'admin1', trangThai: 'active', vaiTro: 'admin' },
      { nguoiDung: 'mem1', trangThai: 'active', vaiTro: 'member' },
    ],
  };

  it('allows room admin', () => {
    assertRoomAdmin(room, 'admin1', false);
  });

  it('rejects plain member', () => {
    assert.throws(
      () => assertRoomAdmin(room, 'mem1', false),
      (err) => err.statusCode === 403,
    );
  });

  it('allows system staff even if not room admin', () => {
    assertRoomAdmin(room, 'staff-x', true);
  });
});

describe('roomAccess.assertCanDeleteOrDisbandRoom', () => {
  const group = {
    loaiPhong: 'group',
    thanhVien: [
      { nguoiDung: 'gadmin', trangThai: 'active', vaiTro: 'admin' },
      { nguoiDung: 'gmem', trangThai: 'active', vaiTro: 'member' },
    ],
  };
  const privateRoom = {
    loaiPhong: 'private',
    thanhVien: [
      { nguoiDung: 'a1', trangThai: 'active', vaiTro: 'member' },
      { nguoiDung: 'nv1', trangThai: 'active', vaiTro: 'member' },
    ],
  };

  it('group: room admin can disband', () => {
    assertCanDeleteOrDisbandRoom(group, 'gadmin', { isAdmin: false });
  });

  it('group: member cannot disband', () => {
    assert.throws(
      () => assertCanDeleteOrDisbandRoom(group, 'gmem', { isAdmin: false }),
      (err) => err.statusCode === 403,
    );
  });

  it('group: system admin can disband', () => {
    assertCanDeleteOrDisbandRoom(group, 'sysadmin', { isAdmin: true });
  });

  it('private: only system admin can delete', () => {
    assert.throws(
      () => assertCanDeleteOrDisbandRoom(privateRoom, 'a1', { isAdmin: false }),
      (err) => err.statusCode === 403,
    );
    assertCanDeleteOrDisbandRoom(privateRoom, 'sysadmin', { isAdmin: true });
  });
});

describe('roomAccess.findActiveMember', () => {
  it('returns null when missing', () => {
    assert.equal(findActiveMember({ thanhVien: [] }, 'u1'), null);
  });
});

describe('roomAccess.buildRoomsListFilter', () => {
  it('defaults to membership for staff and admin', () => {
    const f = buildRoomsListFilter('admin1', { isStaff: true, isAdmin: true }, {});
    assert.deepEqual(f.thanhVien, {
      $elemMatch: { nguoiDung: 'admin1', trangThai: 'active' },
    });
  });

  it('allows scope=all only for system admin', () => {
    assert.deepEqual(
      buildRoomsListFilter('admin1', { isStaff: true, isAdmin: true }, { scope: 'all' }),
      {},
    );
    const staffOnly = buildRoomsListFilter(
      'nv1',
      { isStaff: true, isAdmin: false },
      { scope: 'all' },
    );
    assert.ok(staffOnly.thanhVien.$elemMatch);
  });

  it('filters loaiPhong=group', () => {
    const f = buildRoomsListFilter('u1', { isStaff: false }, { loaiPhong: 'group' });
    assert.equal(f.loaiPhong, 'group');
  });
});

describe('roomAccess.resolvePrivateChatOtherId', () => {
  it('uses otherUserId', () => {
    assert.equal(resolvePrivateChatOtherId('admin1', { otherUserId: 'nv1' }), 'nv1');
  });

  it('resolves from userId1/userId2 when actor is one side', () => {
    assert.equal(resolvePrivateChatOtherId('admin1', { userId1: 'admin1', userId2: 'nv1' }), 'nv1');
    assert.equal(resolvePrivateChatOtherId('admin1', { userId1: 'nv1', userId2: 'admin1' }), 'nv1');
  });

  it('rejects self-chat', () => {
    assert.throws(
      () => resolvePrivateChatOtherId('admin1', { otherUserId: 'admin1' }),
      (err) => err.statusCode === 400,
    );
  });

  it('rejects when actor is neither side', () => {
    assert.throws(
      () => resolvePrivateChatOtherId('admin1', { userId1: 'a', userId2: 'b' }),
      (err) => err.statusCode === 403,
    );
  });
});
