import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  memberSelect,
  findActiveMember,
  assertCanAccessRoom,
  assertRoomAdmin,
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

describe('roomAccess.findActiveMember', () => {
  it('returns null when missing', () => {
    assert.equal(findActiveMember({ thanhVien: [] }, 'u1'), null);
  });
});
