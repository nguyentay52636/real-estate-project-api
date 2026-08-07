import AuditLog from '#models/AuditLog.js';

/**
 * Ghi nhật ký — không chặn request nếu fail.
 * auth/login_failed có thể thiếu nguoiDungId.
 */
export async function writeAuditLog({
  thucThe,
  thucTheId = null,
  hanhDong,
  nguoiDungId = null,
  truoc = null,
  sau = null,
  ghiChu = '',
}) {
  if (!thucThe || !hanhDong) return null;
  try {
    return await AuditLog.create({
      thucThe,
      thucTheId: thucTheId || undefined,
      hanhDong,
      nguoiDungId: nguoiDungId || undefined,
      truoc,
      sau,
      ghiChu,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit]', err?.message || err);
    }
    return null;
  }
}

export async function listAuditLogs({
  thucThe,
  thucTheId,
  hanhDong,
  limit = 50,
  page = 1,
} = {}) {
  const filter = {};
  if (thucThe) filter.thucThe = thucThe;
  if (thucTheId) filter.thucTheId = thucTheId;
  if (hanhDong) filter.hanhDong = hanhDong;

  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  const pageNum = Math.max(1, Number(page) || 1);
  const skip = (pageNum - 1) * lim;

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate('nguoiDungId', 'ten email anhDaiDien')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: lim,
      totalPages: Math.ceil(total / lim) || 1,
    },
  };
}

export default { writeAuditLog, listAuditLogs };
