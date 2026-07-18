import contactService from '#modules/contact/services/contactService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const contactController = {
  createContact: asyncHandler(async (req, res) => {
    const userId = req.authUser?.id || null;
    const created = await contactService.createContact(req.body, userId);
    return res.status(201).json({
      message: 'Gửi liên hệ thành công. Chúng tôi sẽ phản hồi trong 24 giờ làm việc.',
      data: created,
    });
  }),

  getContacts: asyncHandler(async (req, res) => {
    const { data, pagination } = await contactService.getContacts(req.query);
    return res.status(200).json({
      message: 'Lấy danh sách liên hệ thành công',
      data,
      pagination,
    });
  }),

  getContactById: asyncHandler(async (req, res) => {
    const contact = await contactService.getContactById(req.params.id);
    return res.status(200).json({
      message: 'Lấy chi tiết liên hệ thành công',
      data: contact,
    });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const updated = await contactService.updateStatus(req.params.id, req.body.trangThai);
    return res.status(200).json({
      message: 'Cập nhật trạng thái liên hệ thành công',
      data: updated,
    });
  }),

  updateNote: asyncHandler(async (req, res) => {
    const updated = await contactService.updateNote(req.params.id, req.body.ghiChuNoiBo);
    return res.status(200).json({
      message: 'Cập nhật ghi chú nội bộ thành công',
      data: updated,
    });
  }),
};

export default contactController;
