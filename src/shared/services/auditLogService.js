import AuditLog from '#models/AuditLog.js';


export async function writeAuditLog({
  thucThe,
  thucTheId,
  hanhDong,
  nguoiDungId,
  truoc = null,
  sau = null,
  ghiChu = '',
}) {
  if (!thucThe || !thucTheId || !hanhDong || !nguoiDungId) return null;
  try {
    return await AuditLog.create({
      thucThe,
      thucTheId,
      hanhDong,
      nguoiDungId,
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

export async function listAuditLogs({ thucThe, thucTheId, limit = 50 } = {}) {
  const filter = {};
  if (thucThe) filter.thucThe = thucThe;
  if (thucTheId) filter.thucTheId = thucTheId;
  return AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 50)))
    .populate('nguoiDungId', 'ten email anhDaiDien')
    .lean();
}
