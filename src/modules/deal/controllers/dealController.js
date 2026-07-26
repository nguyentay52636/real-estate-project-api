import dealService from '#modules/deal/services/dealService.js';
import { listAuditLogs } from '#shared/services/auditLogService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const dealController = {
  list: asyncHandler(async (req, res) => {
    const result = await dealService.listDeals(req.query, req.authUser);
    return res.status(200).json({
      message: 'Lấy danh sách giao dịch thành công',
      ...result,
    });
  }),

  stats: asyncHandler(async (req, res) => {
    const data = await dealService.dealStats(req.authUser);
    return res.status(200).json({
      message: 'Thống kê giao dịch thành công',
      data,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await dealService.getDealById(req.params.id, req.authUser);
    return res.status(200).json({ message: 'Lấy chi tiết giao dịch thành công', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await dealService.createDeal(req.body, req.authUser);
    return res.status(201).json({ message: 'Tạo giao dịch thành công', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await dealService.updateDeal(req.params.id, req.body, req.authUser);
    return res.status(200).json({ message: 'Cập nhật giao dịch thành công', data });
  }),

  assign: asyncHandler(async (req, res) => {
    const data = await dealService.assignDeal(
      req.params.id,
      { nhanVienId: req.body.nhanVienId, nhomId: req.body.nhomId },
      req.authUser,
    );
    return res.status(200).json({ message: 'Gán nhân viên thành công', data });
  }),

  close: asyncHandler(async (req, res) => {
    const data = await dealService.closeDeal(req.params.id, req.body, req.authUser);
    return res.status(200).json({
      message: 'Chốt deal thành công — đã cập nhật trạng thái BĐS',
      data,
    });
  }),

  lose: asyncHandler(async (req, res) => {
    const data = await dealService.loseDeal(req.params.id, req.body, req.authUser);
    return res.status(200).json({ message: 'Đã đánh dấu rớt deal', data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await dealService.deleteDeal(req.params.id, req.authUser);
    return res.status(200).json({ message: 'Xóa giao dịch thành công', data });
  }),

  audit: asyncHandler(async (req, res) => {
    const data = await listAuditLogs({
      thucThe: 'deal',
      thucTheId: req.params.id,
      limit: req.query.limit,
    });
    return res.status(200).json({ message: 'Nhật ký giao dịch', data });
  }),
};

export default dealController;
