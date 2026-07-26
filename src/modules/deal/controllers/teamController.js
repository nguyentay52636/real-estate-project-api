import teamService from '#modules/deal/services/teamService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const teamController = {
  list: asyncHandler(async (req, res) => {
    const data = await teamService.listTeams(req.query);
    return res.status(200).json({ message: 'Lấy danh sách nhóm thành công', data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await teamService.getTeamById(req.params.id);
    return res.status(200).json({ message: 'Lấy chi tiết nhóm thành công', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await teamService.createTeam(req.body, req.authUser);
    return res.status(201).json({ message: 'Tạo nhóm thành công', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await teamService.updateTeam(req.params.id, req.body, req.authUser);
    return res.status(200).json({ message: 'Cập nhật nhóm thành công', data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await teamService.deleteTeam(req.params.id, req.authUser);
    return res.status(200).json({ message: 'Xóa nhóm thành công', data });
  }),
};

export default teamController;
