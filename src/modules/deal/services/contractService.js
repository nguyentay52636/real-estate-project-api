import Contract from '#models/Contract.js';
import { AppError } from '#shared/errors/AppError.js';
import { writeAuditLog } from '#shared/services/auditLogService.js';

const VALID = ['nhap', 'cho_ky', 'da_ky', 'huy'];

export async function listContracts(query = {}) {
  const filter = {};
  if (query.trangThai && VALID.includes(query.trangThai)) {
    filter.trangThai = query.trangThai;
  }
  if (query.dealId) filter.dealId = query.dealId;
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  return Contract.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('dealId', 'tieuDe trangThai giaChot')
    .populate('nguoiTaoId', 'ten email')
    .lean();
}

export async function createContract(body, actor) {
  if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
  const tieuDe = body.tieuDe?.trim();
  if (!tieuDe) throw new AppError('Thiếu tiêu đề hợp đồng', 400);
  if (body.trangThai && !VALID.includes(body.trangThai)) {
    throw new AppError('trangThai không hợp lệ', 400);
  }

  const doc = await Contract.create({
    tieuDe,
    dealId: body.dealId || null,
    batDongSanId: body.batDongSanId || null,
    fileUrl: body.fileUrl || '',
    trangThai: body.trangThai || 'nhap',
    ghiChu: body.ghiChu || '',
    nguoiTaoId: actor.id,
  });

  await writeAuditLog({
    thucThe: 'deal',
    thucTheId: body.dealId || doc._id,
    hanhDong: 'tao_hop_dong',
    nguoiDungId: actor.id,
    sau: { hopDongId: doc._id, trangThai: doc.trangThai },
    ghiChu: tieuDe,
  });

  return doc;
}

export async function updateContract(id, body, actor) {
  if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
  const doc = await Contract.findById(id);
  if (!doc) throw new AppError('Không tìm thấy hợp đồng', 404);

  const before = { trangThai: doc.trangThai, fileUrl: doc.fileUrl };
  if (body.tieuDe != null) doc.tieuDe = String(body.tieuDe).trim();
  if (body.fileUrl != null) doc.fileUrl = body.fileUrl;
  if (body.ghiChu != null) doc.ghiChu = body.ghiChu;
  if (body.dealId !== undefined) doc.dealId = body.dealId || null;
  if (body.trangThai) {
    if (!VALID.includes(body.trangThai)) throw new AppError('trangThai không hợp lệ', 400);
    doc.trangThai = body.trangThai;
  }
  await doc.save();

  await writeAuditLog({
    thucThe: 'deal',
    thucTheId: doc.dealId || doc._id,
    hanhDong: 'cap_nhat_hop_dong',
    nguoiDungId: actor.id,
    truoc: before,
    sau: { trangThai: doc.trangThai, fileUrl: doc.fileUrl },
  });

  return doc;
}

export async function deleteContract(id, actor) {
  if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
  const doc = await Contract.findByIdAndDelete(id);
  if (!doc) throw new AppError('Không tìm thấy hợp đồng', 404);
  await writeAuditLog({
    thucThe: 'deal',
    thucTheId: doc.dealId || doc._id,
    hanhDong: 'xoa_hop_dong',
    nguoiDungId: actor.id,
    truoc: { tieuDe: doc.tieuDe },
  });
  return { success: true };
}
