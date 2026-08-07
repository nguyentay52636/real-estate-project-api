import mongoose from 'mongoose';

/**
 * Parse @mention từ body.mentions và/hoặc nội dung.
 * Hỗ trợ:
 * - mentions: ["userId", ...]
 * - text: @[Tên hiển thị](userId)  (Markdown-style)
 * - text: @userId (24 hex ObjectId)
 */
export function parseMentionIds({ noiDung = '', mentions } = {}) {
  const ids = new Set();

  const push = (raw) => {
    const id = String(raw || '').trim();
    if (mongoose.isValidObjectId(id)) ids.add(id);
  };

  if (Array.isArray(mentions)) {
    for (const m of mentions) {
      if (typeof m === 'string') push(m);
      else if (m && typeof m === 'object') push(m._id || m.id || m.userId);
    }
  }

  const text = String(noiDung || '');
  for (const match of text.matchAll(/@\[([^\]]*)\]\(([a-fA-F0-9]{24})\)/g)) {
    push(match[2]);
  }
  for (const match of text.matchAll(/(^|[\s])@([a-fA-F0-9]{24})\b/g)) {
    push(match[2]);
  }

  return [...ids];
}

/** Chỉ giữ mention là thành viên active của phòng (trừ người gửi). */
export function filterMentionsToRoomMembers(mentionIds, room, senderId) {
  if (!mentionIds?.length || !room?.thanhVien) return [];
  const active = new Set(
    room.thanhVien
      .filter((m) => m.trangThai === 'active')
      .map((m) => {
        const raw = m.nguoiDung;
        return raw && typeof raw === 'object' && raw._id != null
          ? String(raw._id)
          : String(raw);
      }),
  );
  const sender = String(senderId);
  return mentionIds.filter((id) => id !== sender && active.has(id));
}

export function resolveReplyId(phanHoiTinNhan) {
  if (!phanHoiTinNhan) return null;
  if (typeof phanHoiTinNhan === 'string') return phanHoiTinNhan;
  if (typeof phanHoiTinNhan === 'object') {
    return phanHoiTinNhan._id || phanHoiTinNhan.id || null;
  }
  return null;
}

export default { parseMentionIds, filterMentionsToRoomMembers, resolveReplyId };
