import {
  listContracts,
  createContract,
  updateContract,
  deleteContract,
} from '#modules/deal/services/contractService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const contractController = {
  list: asyncHandler(async (req, res) => {
    const data = await listContracts(req.query);
    return res.status(200).json({ message: 'Danh sách hợp đồng', data });
  }),
  create: asyncHandler(async (req, res) => {
    const data = await createContract(req.body, req.authUser);
    return res.status(201).json({ message: 'Đã tạo hợp đồng', data });
  }),
  update: asyncHandler(async (req, res) => {
    const data = await updateContract(req.params.id, req.body, req.authUser);
    return res.status(200).json({ message: 'Đã cập nhật hợp đồng', data });
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await deleteContract(req.params.id, req.authUser);
    return res.status(200).json({ message: 'Đã xóa hợp đồng', data });
  }),
};

export default contractController;
