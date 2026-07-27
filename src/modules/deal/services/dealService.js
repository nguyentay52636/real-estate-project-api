import Deal from '#models/Deal.js';
import Property from '#models/Property.js';
import Team from '#models/Team.js';
import NguoiDung from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';
import { writeAuditLog } from '#shared/services/auditLogService.js';
import propertyService from '#modules/property/services/propertyService.js';

const USER_FIELDS = 'ten email soDienThoai anhDaiDien';
const PROPERTY_FIELDS =
  'tieuDe slug anhDaiDien diaChi quanHuyen tinhThanh gia trangThai loaiGiaoDich nguoiDungId';

const VALID_STATUS = ['moi', 'lien_he', 'hen_xem', 'da_xem', 'chot', 'rot'];
const VALID_SOURCE = ['form', 'handoff', 'viewing', 'thu_cong'];

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function populateDeal(query) {
  return query
    .populate('batDongSanId', PROPERTY_FIELDS)
    .populate('khachHangId', USER_FIELDS)
    .populate('chuNhaId', USER_FIELDS)
    .populate('nhanVienId', USER_FIELDS)
    .populate('nguoiTaoId', USER_FIELDS)
    .populate('nhomId', 'ten ma chiNhanh');
}

function snapshotDeal(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    trangThai: o.trangThai,
    nhanVienId: o.nhanVienId,
    nhomId: o.nhomId,
    giaChot: o.giaChot,
    ngayChot: o.ngayChot,
    lyDoRot: o.lyDoRot,
    hoaHongPhanTram: o.hoaHongPhanTram,
    hoaHongSoTien: o.hoaHongSoTien,
  };
}

function computeCommission(giaChot, phanTram, soTien) {
  if (soTien != null && soTien !== '' && Number.isFinite(Number(soTien))) {
    return Number(soTien);
  }
  if (
    phanTram != null &&
    phanTram !== '' &&
    Number.isFinite(Number(phanTram)) &&
    giaChot != null &&
    Number.isFinite(Number(giaChot))
  ) {
    return Math.round((Number(giaChot) * Number(phanTram)) / 100);
  }
  return soTien != null ? Number(soTien) : null;
}

export function createDealService(deps = {}) {
  const DealModel = deps.Deal ?? Deal;
  const PropertyModel = deps.Property ?? Property;

  async function assertCanAccess(deal, actor) {
    if (!deal) throw new AppError('Không tìm thấy giao dịch', 404);
    const role = actor?.vaiTro;
    if (
      actor?.isStaff ||
      role === 'admin' ||
      role === 'quan_tri_vien' ||
      role === 'sale' ||
      role === 'ke_toan' ||
      role === 'nhan_vien'
    ) {
      // Admin / kế toán: full; sale/nhan_vien: chỉ deal mình (trừ admin)
      if (role === 'admin' || role === 'quan_tri_vien' || role === 'ke_toan') return;
      const mine = String(actor?.id);
      const assignee = deal.nhanVienId
        ? String(typeof deal.nhanVienId === 'object' ? deal.nhanVienId._id : deal.nhanVienId)
        : null;
      const creator = deal.nguoiTaoId
        ? String(typeof deal.nguoiTaoId === 'object' ? deal.nguoiTaoId._id : deal.nguoiTaoId)
        : null;
      if (assignee === mine || creator === mine) return;
      // admin đã return; sale khác không xem deal người khác
      if (role === 'nhan_vien' || role === 'sale') {
        throw new AppError('Không có quyền truy cập giao dịch này', 403);
      }
      return;
    }
    throw new AppError('Không có quyền truy cập giao dịch này', 403);
  }

  async function buildFilter(query, actor) {
    const filter = {};
    if (query.trangThai) {
      if (!VALID_STATUS.includes(query.trangThai)) {
        throw new AppError(`trangThai không hợp lệ`, 400);
      }
      filter.trangThai = query.trangThai;
    }
    if (query.nhanVienId) filter.nhanVienId = query.nhanVienId;
    if (query.nhomId) filter.nhomId = query.nhomId;
    if (query.batDongSanId) filter.batDongSanId = query.batDongSanId;
    if (query.nguonLead && VALID_SOURCE.includes(query.nguonLead)) {
      filter.nguonLead = query.nguonLead;
    }
    if (query.q?.trim()) {
      filter.tieuDe = { $regex: query.q.trim(), $options: 'i' };
    }

    const dateField = query.dateField === 'ngayChot' ? 'ngayChot' : 'createdAt';
    if (query.from || query.to) {
      filter[dateField] = {};
      if (query.from) filter[dateField].$gte = new Date(query.from);
      if (query.to) filter[dateField].$lte = new Date(query.to);
    }

    const role = actor?.vaiTro;
    const isFullAccess = role === 'admin' || role === 'quan_tri_vien' || role === 'ke_toan';
    if (!isFullAccess && actor?.id) {
      const TeamModel = deps.Team ?? Team;
      const myTeams = await TeamModel.find({
        $or: [{ truongNhomId: actor.id }, { thanhVienIds: actor.id }],
        trangThai: 'dang_hoat_dong',
      })
        .select('_id')
        .lean();
      const teamIds = myTeams.map((t) => t._id);
      filter.$or = [
        { nhanVienId: actor.id },
        { nguoiTaoId: actor.id },
        ...(teamIds.length ? [{ nhomId: { $in: teamIds } }] : []),
      ];
    }
    return filter;
  }

  async function listDeals(query = {}, actor) {
    if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
    const filter = await buildFilter(query, actor);
    const { pageNum, limitNum, skip } = parsePagination(query);
    const sortBy = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [rows, total] = await Promise.all([
      populateDeal(
        DealModel.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limitNum),
      ),
      DealModel.countDocuments(filter),
    ]);

    return {
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async function getDealById(id, actor) {
    const deal = await populateDeal(DealModel.findById(id));
    await assertCanAccess(deal, actor);
    return deal;
  }

  async function createDeal(input, actor) {
    if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
    const batDongSanId = input.batDongSanId;
    if (!batDongSanId) throw new AppError('Thiếu batDongSanId', 400);

    const property = await PropertyModel.findById(batDongSanId);
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);

    const loaiGiaoDich =
      input.loaiGiaoDich ||
      property.loaiGiaoDich ||
      (property.gia >= 1_000_000_000 ? 'ban' : 'cho_thue');

    if (!['ban', 'cho_thue'].includes(loaiGiaoDich)) {
      throw new AppError('loaiGiaoDich không hợp lệ', 400);
    }

    if (input.trangThai && !VALID_STATUS.includes(input.trangThai)) {
      throw new AppError('trangThai không hợp lệ', 400);
    }
    if (input.nguonLead && !VALID_SOURCE.includes(input.nguonLead)) {
      throw new AppError('nguonLead không hợp lệ', 400);
    }

    const chuNhaId =
      property.nguoiDungId?._id || property.nguoiDungId || input.chuNhaId || null;

    const deal = await DealModel.create({
      tieuDe: input.tieuDe?.trim() || property.tieuDe || 'Giao dịch mới',
      batDongSanId,
      khachHangId: input.khachHangId || null,
      chuNhaId,
      nhanVienId: input.nhanVienId || actor.id,
      nhomId: input.nhomId || null,
      lichXemId: input.lichXemId || null,
      nguonLead: input.nguonLead || 'thu_cong',
      loaiGiaoDich,
      trangThai: input.trangThai || 'moi',
      giaNiemYet: input.giaNiemYet ?? property.gia ?? 0,
      ghiChu: input.ghiChu || '',
      nguoiTaoId: actor.id,
    });

    await writeAuditLog({
      thucThe: 'deal',
      thucTheId: deal._id,
      hanhDong: 'tao',
      nguoiDungId: actor.id,
      sau: snapshotDeal(deal),
    });

    return getDealById(deal._id, actor);
  }

  /**
   * Tạo deal từ lịch xem (idempotent theo lichXemId).
   */
  async function upsertFromViewing(viewing, actor, extras = {}) {
    if (!viewing?._id || !viewing.batDongSanId) return null;
    const existing = await DealModel.findOne({ lichXemId: viewing._id });
    if (existing) {
      const nextStatus =
        extras.trangThai ||
        (viewing.trangThai === 'thanh_cong'
          ? 'chot'
          : viewing.trangThai === 'that_bai' || viewing.trangThai === 'da_huy'
            ? 'rot'
            : viewing.trangThai === 'da_xem'
              ? 'da_xem'
              : viewing.trangThai === 'da_xac_nhan'
                ? 'hen_xem'
                : null);
      if (nextStatus && existing.trangThai !== 'chot' && existing.trangThai !== nextStatus) {
        return updateDeal(
          existing._id,
          {
            trangThai: nextStatus,
            ...(nextStatus === 'rot'
              ? { lyDoRot: extras.lyDoRot || 'Từ lịch xem nhà' }
              : {}),
            ...(nextStatus === 'chot'
              ? {
                  giaChot: extras.giaChot,
                  hoaHongPhanTram: extras.hoaHongPhanTram,
                  hoaHongSoTien: extras.hoaHongSoTien,
                }
              : {}),
          },
          actor || { id: viewing.nguoiDungId, isStaff: true, vaiTro: 'admin' },
        );
      }
      return populateDeal(DealModel.findById(existing._id));
    }

    const propertyId =
      typeof viewing.batDongSanId === 'object'
        ? viewing.batDongSanId._id
        : viewing.batDongSanId;
    const khachId =
      typeof viewing.nguoiDungId === 'object'
        ? viewing.nguoiDungId._id
        : viewing.nguoiDungId;

    const stageMap = {
      cho_xac_nhan: 'moi',
      da_xac_nhan: 'hen_xem',
      da_xem: 'da_xem',
      thanh_cong: 'chot',
      that_bai: 'rot',
      da_huy: 'rot',
    };

    const created = await createDeal(
      {
        batDongSanId: propertyId,
        khachHangId: khachId,
        lichXemId: viewing._id,
        nguonLead: 'viewing',
        trangThai:
          stageMap[viewing.trangThai] === 'chot' || stageMap[viewing.trangThai] === 'rot'
            ? 'da_xem'
            : extras.trangThai || stageMap[viewing.trangThai] || 'hen_xem',
        nhanVienId: extras.nhanVienId || actor?.id,
        tieuDe: extras.tieuDe,
      },
      actor || { id: khachId, isStaff: true, vaiTro: 'nhan_vien' },
    );

    const target = extras.trangThai || stageMap[viewing.trangThai];
    if (target === 'chot' && created?._id) {
      return updateDeal(
        created._id,
        {
          trangThai: 'chot',
          giaChot: extras.giaChot,
          hoaHongPhanTram: extras.hoaHongPhanTram,
          hoaHongSoTien: extras.hoaHongSoTien,
        },
        actor || { id: actor?.id || khachId, vaiTro: 'admin' },
      );
    }
    if (target === 'rot' && created?._id) {
      return updateDeal(
        created._id,
        {
          trangThai: 'rot',
          lyDoRot: extras.lyDoRot || 'Từ lịch xem nhà',
        },
        actor || { id: actor?.id || khachId, vaiTro: 'admin' },
      );
    }
    return created;
  }

  async function updateDeal(id, input, actor) {
    const existing = await DealModel.findById(id);
    await assertCanAccess(existing, actor);
    const before = snapshotDeal(existing);

    if (existing.trangThai === 'chot' && input.trangThai && input.trangThai !== 'chot') {
      throw new AppError('Deal đã chốt — không đổi trạng thái ngược', 400);
    }

    const allowed = {};
    const fields = [
      'tieuDe',
      'khachHangId',
      'nhanVienId',
      'nhomId',
      'ghiChu',
      'giaNiemYet',
      'lyDoRot',
      'hoaHongPhanTram',
      'hoaHongSoTien',
      'giaChot',
      'ngayChot',
    ];
    for (const f of fields) {
      if (input[f] !== undefined) allowed[f] = input[f];
    }

    if (input.trangThai !== undefined) {
      if (!VALID_STATUS.includes(input.trangThai)) {
        throw new AppError('trangThai không hợp lệ', 400);
      }
      allowed.trangThai = input.trangThai;
    }

    // Chốt deal
    if (allowed.trangThai === 'chot' || (existing.trangThai === 'chot' && input.giaChot != null)) {
      const giaChot =
        allowed.giaChot != null ? Number(allowed.giaChot) : existing.giaChot ?? existing.giaNiemYet;
      allowed.giaChot = giaChot;
      allowed.ngayChot = allowed.ngayChot ? new Date(allowed.ngayChot) : existing.ngayChot || new Date();
      allowed.hoaHongSoTien = computeCommission(
        giaChot,
        allowed.hoaHongPhanTram ?? existing.hoaHongPhanTram,
        allowed.hoaHongSoTien ?? existing.hoaHongSoTien,
      );
      if (allowed.trangThai === 'chot') {
        const nextPropStatus = existing.loaiGiaoDich === 'ban' ? 'da_ban' : 'da_cho_thue';
        await propertyService.updatePropertyStatus(String(existing.batDongSanId), nextPropStatus);
        await writeAuditLog({
          thucThe: 'property',
          thucTheId: existing.batDongSanId,
          hanhDong: 'doi_trang_thai_tu_deal',
          nguoiDungId: actor.id,
          sau: { trangThai: nextPropStatus, dealId: existing._id },
          ghiChu: `Khóa tin sau khi chốt deal`,
        });
      }
    }

    if (allowed.trangThai === 'rot' && !allowed.lyDoRot && !existing.lyDoRot) {
      allowed.lyDoRot = input.lyDoRot || 'Không nêu lý do';
    }

    const updated = await DealModel.findByIdAndUpdate(id, allowed, { new: true });
    await writeAuditLog({
      thucThe: 'deal',
      thucTheId: id,
      hanhDong:
        allowed.trangThai && allowed.trangThai !== before.trangThai
          ? 'doi_trang_thai'
          : allowed.nhanVienId && String(allowed.nhanVienId) !== String(before.nhanVienId)
            ? 'gan_nhan_vien'
            : 'cap_nhat',
      nguoiDungId: actor.id,
      truoc: before,
      sau: snapshotDeal(updated),
    });

    return getDealById(id, actor);
  }

  async function assignDeal(id, { nhanVienId, nhomId }, actor) {
    return updateDeal(id, { nhanVienId, nhomId }, actor);
  }

  async function closeDeal(id, body, actor) {
    return updateDeal(
      id,
      {
        trangThai: 'chot',
        giaChot: body.giaChot,
        ngayChot: body.ngayChot,
        hoaHongPhanTram: body.hoaHongPhanTram,
        hoaHongSoTien: body.hoaHongSoTien,
        ghiChu: body.ghiChu,
      },
      actor,
    );
  }

  async function loseDeal(id, body, actor) {
    return updateDeal(
      id,
      {
        trangThai: 'rot',
        lyDoRot: body.lyDoRot || 'Rớt deal',
        ghiChu: body.ghiChu,
      },
      actor,
    );
  }

  async function deleteDeal(id, actor) {
    const existing = await DealModel.findById(id);
    await assertCanAccess(existing, actor);
    if (existing.trangThai === 'chot') {
      throw new AppError('Không xóa deal đã chốt', 400);
    }
    await DealModel.findByIdAndDelete(id);
    await writeAuditLog({
      thucThe: 'deal',
      thucTheId: id,
      hanhDong: 'xoa',
      nguoiDungId: actor.id,
      truoc: snapshotDeal(existing),
    });
    return { id };
  }

  async function dealStats(actor, query = {}) {
    const filter = await buildFilter(query, actor);
    const slaHours = Math.min(168, Math.max(1, parseInt(query.slaHours, 10) || 24));
    const slaSince = new Date(Date.now() - slaHours * 60 * 60 * 1000);

    const [rows, byMonthRows, bySaleRows, byNguonRows, slaCount, receipts] = await Promise.all([
      DealModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$trangThai',
            count: { $sum: 1 },
            doanhThu: {
              $sum: {
                $cond: [{ $eq: ['$trangThai', 'chot'] }, { $ifNull: ['$giaChot', 0] }, 0],
              },
            },
            hoaHong: {
              $sum: {
                $cond: [{ $eq: ['$trangThai', 'chot'] }, { $ifNull: ['$hoaHongSoTien', 0] }, 0],
              },
            },
          },
        },
      ]),
      DealModel.aggregate([
        {
          $match: {
            ...filter,
            trangThai: 'chot',
          },
        },
        {
          $addFields: {
            _bucketDate: { $ifNull: ['$ngayChot', '$updatedAt'] },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: '$_bucketDate' },
              m: { $month: '$_bucketDate' },
            },
            doanhThu: { $sum: { $ifNull: ['$giaChot', 0] } },
            hoaHong: { $sum: { $ifNull: ['$hoaHongSoTien', 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
        { $limit: 12 },
      ]),
      DealModel.aggregate([
        { $match: { ...filter, trangThai: 'chot' } },
        {
          $group: {
            _id: '$nhanVienId',
            chot: { $sum: 1 },
            doanhThu: { $sum: { $ifNull: ['$giaChot', 0] } },
            hoaHong: { $sum: { $ifNull: ['$hoaHongSoTien', 0] } },
          },
        },
        { $sort: { doanhThu: -1 } },
        { $limit: 20 },
      ]),
      DealModel.aggregate([
        { $match: { ...filter, trangThai: 'chot' } },
        {
          $group: {
            _id: '$nguonLead',
            count: { $sum: 1 },
            doanhThu: { $sum: { $ifNull: ['$giaChot', 0] } },
          },
        },
        { $sort: { doanhThu: -1 } },
      ]),
      DealModel.countDocuments({
        ...filter,
        trangThai: { $in: ['moi', 'lien_he'] },
        updatedAt: { $lte: slaSince },
      }),
      populateDeal(
        DealModel.find({ ...filter, trangThai: 'chot' })
          .sort({ ngayChot: -1, updatedAt: -1 })
          .limit(30),
      ),
    ]);

    const byStatus = Object.fromEntries(VALID_STATUS.map((s) => [s, 0]));
    let doanhThu = 0;
    let hoaHong = 0;
    for (const r of rows) {
      byStatus[r._id] = r.count;
      doanhThu += r.doanhThu || 0;
      hoaHong += r.hoaHong || 0;
    }

    const userIds = bySaleRows.map((r) => r._id).filter(Boolean);
    const users = userIds.length
      ? await NguoiDung.find({ _id: { $in: userIds } })
          .select('ten email')
          .lean()
      : [];
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const pipelineOpen =
      (byStatus.moi || 0) +
      (byStatus.lien_he || 0) +
      (byStatus.hen_xem || 0) +
      (byStatus.da_xem || 0);
    const seen = (byStatus.da_xem || 0) + (byStatus.chot || 0);
    const winRate = seen > 0 ? Math.round(((byStatus.chot || 0) / seen) * 100) : 0;

    return {
      byStatus,
      doanhThu,
      hoaHong,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      pipelineOpen,
      winRate,
      sla: {
        hours: slaHours,
        stuck: slaCount,
        label: `Lead > ${slaHours}h chưa đụng`,
      },
      byMonth: byMonthRows.map((r) => ({
        year: r._id.y,
        month: r._id.m,
        label: `T${r._id.m}/${String(r._id.y).slice(-2)}`,
        doanhThu: r.doanhThu,
        hoaHong: r.hoaHong,
        count: r.count,
      })),
      bySale: bySaleRows.map((r) => {
        const u = r._id ? userMap[String(r._id)] : null;
        return {
          nhanVienId: r._id ? String(r._id) : null,
          ten: u?.ten || u?.email || (r._id ? 'Sale' : 'Chưa gán'),
          chot: r.chot,
          doanhThu: r.doanhThu,
          hoaHong: r.hoaHong,
        };
      }),
      byNguon: byNguonRows.map((r) => ({
        nguonLead: r._id || 'thu_cong',
        count: r.count,
        doanhThu: r.doanhThu,
      })),
      /** Phiếu thu đơn giản = deal đã chốt (không sổ quỹ riêng) */
      receipts: receipts.map((d) => ({
        _id: d._id,
        tieuDe: d.tieuDe,
        giaChot: d.giaChot,
        hoaHongSoTien: d.hoaHongSoTien,
        ngayChot: d.ngayChot,
        loaiGiaoDich: d.loaiGiaoDich,
        nhanVien:
          typeof d.nhanVienId === 'object' && d.nhanVienId
            ? d.nhanVienId.ten || d.nhanVienId.email
            : null,
        batDongSan:
          typeof d.batDongSanId === 'object' && d.batDongSanId
            ? d.batDongSanId.tieuDe
            : null,
      })),
    };
  }

  return {
    listDeals,
    getDealById,
    createDeal,
    updateDeal,
    assignDeal,
    closeDeal,
    loseDeal,
    deleteDeal,
    dealStats,
    upsertFromViewing,
  };
}

const dealService = createDealService();
export default dealService;
