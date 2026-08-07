import { listAuditLogs } from '#shared/services/auditLogService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

/** Admin — xem nhật ký bảo mật / thao tác nhạy cảm */
export const listAdminAudit = asyncHandler(async (req, res) => {
  const result = await listAuditLogs({
    thucThe: req.query.thucThe,
    thucTheId: req.query.thucTheId,
    hanhDong: req.query.hanhDong,
    limit: req.query.limit,
    page: req.query.page,
  });
  return res.status(200).json({
    message: 'Nhật ký hệ thống',
    ...result,
  });
});

export default { listAdminAudit };
