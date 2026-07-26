import Team from '#models/Team.js';
import { AppError } from '#shared/errors/AppError.js';
import { writeAuditLog } from '#shared/services/auditLogService.js';

const USER_FIELDS = 'ten email soDienThoai anhDaiDien';

function populateTeam(query) {
  return query
    .populate('truongNhomId', USER_FIELDS)
    .populate('thanhVienIds', USER_FIELDS);
}

export function createTeamService(deps = {}) {
  const TeamModel = deps.Team ?? Team;

  async function listTeams(query = {}) {
    const filter = {};
    if (query.trangThai) filter.trangThai = query.trangThai;
    if (query.chiNhanh) filter.chiNhanh = query.chiNhanh;
    const rows = await populateTeam(TeamModel.find(filter).sort({ createdAt: -1 }));
    return rows;
  }

  async function getTeamById(id) {
    const team = await populateTeam(TeamModel.findById(id));
    if (!team) throw new AppError('Không tìm thấy nhóm', 404);
    return team;
  }

  async function createTeam(input, actor) {
    if (!input?.ten?.trim()) throw new AppError('Thiếu tên nhóm', 400);
    const team = await TeamModel.create({
      ten: input.ten.trim(),
      ma: input.ma?.trim() || '',
      moTa: input.moTa || '',
      chiNhanh: input.chiNhanh?.trim() || '',
      truongNhomId: input.truongNhomId || null,
      thanhVienIds: Array.isArray(input.thanhVienIds) ? input.thanhVienIds : [],
      trangThai: input.trangThai || 'dang_hoat_dong',
    });
    await writeAuditLog({
      thucThe: 'team',
      thucTheId: team._id,
      hanhDong: 'tao',
      nguoiDungId: actor.id,
      sau: { ten: team.ten, chiNhanh: team.chiNhanh },
    });
    return getTeamById(team._id);
  }

  async function updateTeam(id, input, actor) {
    const existing = await TeamModel.findById(id);
    if (!existing) throw new AppError('Không tìm thấy nhóm', 404);
    const allowed = {};
    for (const f of ['ten', 'ma', 'moTa', 'chiNhanh', 'truongNhomId', 'thanhVienIds', 'trangThai']) {
      if (input[f] !== undefined) allowed[f] = input[f];
    }
    const updated = await TeamModel.findByIdAndUpdate(id, allowed, { new: true });
    await writeAuditLog({
      thucThe: 'team',
      thucTheId: id,
      hanhDong: 'cap_nhat',
      nguoiDungId: actor.id,
      truoc: { ten: existing.ten, thanhVienIds: existing.thanhVienIds },
      sau: allowed,
    });
    return getTeamById(updated._id);
  }

  async function deleteTeam(id, actor) {
    const existing = await TeamModel.findById(id);
    if (!existing) throw new AppError('Không tìm thấy nhóm', 404);
    await TeamModel.findByIdAndDelete(id);
    await writeAuditLog({
      thucThe: 'team',
      thucTheId: id,
      hanhDong: 'xoa',
      nguoiDungId: actor.id,
      truoc: { ten: existing.ten },
    });
    return { id };
  }

  return { listTeams, getTeamById, createTeam, updateTeam, deleteTeam };
}

const teamService = createTeamService();
export default teamService;
