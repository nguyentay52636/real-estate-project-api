import LeadModel, { LEAD_TYPES, LEAD_STATUSES } from '#models/Lead.js';
import PropertyModel from '#models/Property.js';
import { AppError } from '#shared/errors/AppError.js';

const VIEWER_FIELDS = 'ten email soDienThoai anhDaiDien trangThai vaiTro';
const PROPERTY_FIELDS = 'tieuDe slug anhDaiDien gia loaiBds loaiGiaoDich trangThai quanHuyen tinhThanh nguoiDungId';
const PRIVILEGED = ['admin', 'nhan_vien'];

function parsePagination({ page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function buildPaginationMeta(total, pageNum, limitNum) {
  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

function populateLead(query) {
  return query
    .populate({
      path: 'viewerId',
      select: VIEWER_FIELDS,
      populate: { path: 'vaiTro', select: 'ten' },
    })
    .populate({ path: 'ownerId', select: 'ten email soDienThoai anhDaiDien' })
    .populate({ path: 'propertyId', select: PROPERTY_FIELDS });
}

function toLeadResponse(doc) {
  if (!doc) return null;
  const lead = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  lead.viewer = lead.viewerId && typeof lead.viewerId === 'object' ? lead.viewerId : null;
  return lead;
}

export function createLeadService(deps = {}) {
  const Lead = deps.Lead ?? LeadModel;
  const Property = deps.Property ?? PropertyModel;

  async function createLead({ propertyId, type, note }, actor) {
    if (!propertyId || !type) {
      throw new AppError('Thiếu propertyId hoặc type', 400);
    }
    if (!LEAD_TYPES.includes(type)) {
      throw new AppError(`type không hợp lệ. Chỉ chấp nhận: ${LEAD_TYPES.join(', ')}`, 400);
    }

    const property = await Property.findById(propertyId).select('nguoiDungId tieuDe');
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);

    const ownerId = String(property.nguoiDungId);
    const viewerId = String(actor.id);

    if (ownerId === viewerId) {
      throw new AppError('Không thể tạo lead trên bài đăng của chính mình', 400);
    }

    // VIEW: tránh spam — cùng viewer + property trong 24h chỉ giữ 1 bản ghi VIEW
    if (type === 'VIEW') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await Lead.findOne({
        propertyId,
        viewerId,
        type: 'VIEW',
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 });

      if (existing) {
        const populated = await populateLead(Lead.findById(existing._id));
        return toLeadResponse(populated);
      }
    }

    const lead = await Lead.create({
      propertyId,
      ownerId,
      viewerId,
      type,
      status: 'NEW',
      note: note || '',
    });

    const populated = await populateLead(Lead.findById(lead._id));
    return toLeadResponse(populated);
  }

  async function assertCanManageLead(lead, actor) {
    if (PRIVILEGED.includes(actor.vaiTro)) return;
    if (String(lead.ownerId?._id ?? lead.ownerId) !== String(actor.id)) {
      throw new AppError('Bạn chỉ được xem/cập nhật lead của bài đăng mình', 403);
    }
  }

  async function getLeadsForOwner(actor, query = {}) {
    const {
      propertyId,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};
    if (PRIVILEGED.includes(actor.vaiTro)) {
      if (query.ownerId) filter.ownerId = query.ownerId;
    } else {
      filter.ownerId = actor.id;
    }

    if (propertyId) filter.propertyId = propertyId;
    if (type) {
      if (!LEAD_TYPES.includes(type)) {
        throw new AppError(`type không hợp lệ. Chỉ chấp nhận: ${LEAD_TYPES.join(', ')}`, 400);
      }
      filter.type = type;
    }
    if (status) {
      if (!LEAD_STATUSES.includes(status)) {
        throw new AppError(
          `status không hợp lệ. Chỉ chấp nhận: ${LEAD_STATUSES.join(', ')}`,
          400,
        );
      }
      filter.status = status;
    }

    const { pageNum, limitNum, skip } = parsePagination(query);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [rows, total] = await Promise.all([
      populateLead(Lead.find(filter))
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(filter),
    ]);

    return {
      data: rows.map(toLeadResponse),
      pagination: buildPaginationMeta(total, pageNum, limitNum),
    };
  }

  async function getLeadById(id, actor) {
    const lead = await populateLead(Lead.findById(id));
    if (!lead) throw new AppError('Không tìm thấy lead', 404);
    await assertCanManageLead(lead, actor);
    return toLeadResponse(lead);
  }

  async function updateLeadStatus(id, status, actor) {
    if (!LEAD_STATUSES.includes(status)) {
      throw new AppError(
        `status không hợp lệ. Chỉ chấp nhận: ${LEAD_STATUSES.join(', ')}`,
        400,
      );
    }

    const lead = await Lead.findById(id);
    if (!lead) throw new AppError('Không tìm thấy lead', 404);
    await assertCanManageLead(lead, actor);

    lead.status = status;
    await lead.save();

    const populated = await populateLead(Lead.findById(lead._id));
    return toLeadResponse(populated);
  }

  async function updateLeadNote(id, note, actor) {
    const lead = await Lead.findById(id);
    if (!lead) throw new AppError('Không tìm thấy lead', 404);
    await assertCanManageLead(lead, actor);

    lead.note = note ?? '';
    await lead.save();

    const populated = await populateLead(Lead.findById(lead._id));
    return toLeadResponse(populated);
  }

  return {
    createLead,
    getLeadsForOwner,
    getLeadById,
    updateLeadStatus,
    updateLeadNote,
    LEAD_TYPES,
    LEAD_STATUSES,
  };
}

const leadService = createLeadService();
export default leadService;
