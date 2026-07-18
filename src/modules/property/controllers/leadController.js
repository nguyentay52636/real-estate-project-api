import leadService from '#modules/property/services/leadService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const leadController = {
  createLead: asyncHandler(async (req, res) => {
    const data = await leadService.createLead(req.body, req.authUser);
    return res.status(201).json({
      message: 'Ghi nhận lead thành công',
      data,
    });
  }),

  getLeads: asyncHandler(async (req, res) => {
    const { data, pagination } = await leadService.getLeadsForOwner(
      req.authUser,
      req.query,
    );
    return res.status(200).json({
      message: 'Lấy danh sách lead thành công',
      data,
      pagination,
    });
  }),

  getLeadById: asyncHandler(async (req, res) => {
    const data = await leadService.getLeadById(req.params.id, req.authUser);
    return res.status(200).json({
      message: 'Lấy chi tiết lead thành công',
      data,
    });
  }),

  updateLeadStatus: asyncHandler(async (req, res) => {
    const data = await leadService.updateLeadStatus(
      req.params.id,
      req.body.status,
      req.authUser,
    );
    return res.status(200).json({
      message: 'Cập nhật trạng thái lead thành công',
      data,
    });
  }),

  updateLeadNote: asyncHandler(async (req, res) => {
    const data = await leadService.updateLeadNote(
      req.params.id,
      req.body.note,
      req.authUser,
    );
    return res.status(200).json({
      message: 'Cập nhật ghi chú lead thành công',
      data,
    });
  }),
};

export default leadController;
