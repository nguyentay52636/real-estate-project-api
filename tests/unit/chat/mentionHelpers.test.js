import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMentionIds,
  filterMentionsToRoomMembers,
  resolveReplyId,
} from '#modules/chat/utils/mentionHelpers.js';

const ID1 = '507f1f77bcf86cd799439011';
const ID2 = '507f1f77bcf86cd799439012';

describe('mentionHelpers.parseMentionIds', () => {
  it('parses markdown mentions and bare ids', () => {
    const ids = parseMentionIds({
      noiDung: `Hi @[A](${ID1}) and @${ID2}`,
    });
    assert.ok(ids.includes(ID1));
    assert.ok(ids.includes(ID2));
  });

  it('accepts mentions array', () => {
    assert.deepEqual(parseMentionIds({ mentions: [ID1] }), [ID1]);
  });
});

describe('mentionHelpers.filterMentionsToRoomMembers', () => {
  const room = {
    thanhVien: [
      { nguoiDung: ID1, trangThai: 'active' },
      { nguoiDung: ID2, trangThai: 'left' },
    ],
  };

  it('keeps only active members except sender', () => {
    assert.deepEqual(
      filterMentionsToRoomMembers([ID1, ID2], room, '507f1f77bcf86cd799439099'),
      [ID1],
    );
  });
});

describe('mentionHelpers.resolveReplyId', () => {
  it('resolves string or object', () => {
    assert.equal(resolveReplyId(ID1), ID1);
    assert.equal(resolveReplyId({ _id: ID1 }), ID1);
    assert.equal(resolveReplyId(null), null);
  });
});
