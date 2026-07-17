import viewingService from '#modules/property/services/viewingService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const viewingsController = {
  getAllViewings: asyncHandler(async (req, res) => {
    const { data, pagination } = await viewingService.getAllViewings(req.query);
    return res.status(200).json({
      message: 'Lấy danh sách lịch hẹn thành công',
      data,
      pagination,
    });
  }),

  getViewingById: asyncHandler(async (req, res) => {
    const viewing = await viewingService.getViewingById(req.params.id);
    return res.status(200).json({
      message: 'Lấy chi tiết lịch hẹn thành công',
      data: viewing,
    });
  }),

  createViewing: asyncHandler(async (req, res) => {
    const created = await viewingService.createViewing(req.body);
    return res.status(201).json({
      message: 'Đặt lịch hẹn xem nhà thành công',
      data: created,
    });
  }),

  updateViewing: asyncHandler(async (req, res) => {
    const updated = await viewingService.updateViewing(req.params.id, req.body);
    return res.status(200).json({
      message: 'Cập nhật lịch hẹn thành công',
      data: updated,
    });
  }),

  deleteViewing: asyncHandler(async (req, res) => {
    const deleted = await viewingService.deleteViewing(req.params.id);
    return res.status(200).json({
      message: 'Xóa lịch hẹn thành công',
      data: { id: deleted._id },
    });
  }),
};

export default viewingsController;
