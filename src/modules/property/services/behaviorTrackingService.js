import PropertyModel from '#models/Property.js';
import PropertyBehaviorModel, {
  BEHAVIOR_ACTIONS,
  BEHAVIOR_SCORES,
} from '#models/PropertyBehavior.js';
import PropertyLeadModel, { PROPERTY_LEAD_STATUSES } from '#models/PropertyLead.js';
import { AppError } from '#shared/errors/AppError.js';

const PRIVILEGED = ['admin', 'nhan_vien'];
const DEBOUNCE_MS = 5_000;

const VIEWER_FIELDS = 'ten email soDienThoai anhDaiDien trangThai vaiTro';

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

function periodStart(period = '7d') {
  const now = new Date();
  if (period === 'today' || period === '1d') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = period === '30d' ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function ok(data, message = 'Thành công') {
  return { success: true, message, data };
}

export function createBehaviorTrackingService(deps = {}) {
  const Property = deps.Property ?? PropertyModel;
  const Behavior = deps.Behavior ?? PropertyBehaviorModel;
  const Lead = deps.Lead ?? PropertyLeadModel;
  const debounceMs = deps.debounceMs ?? DEBOUNCE_MS;

  async function getPropertyOrThrow(propertyId) {
    const property = await Property.findById(propertyId).select('nguoiDungId tieuDe');
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return property;
  }

  async function assertOwnerAccess(property, actor) {
    if (!actor?.id) throw new AppError('Bạn chưa đăng nhập', 401);
    if (PRIVILEGED.includes(actor.vaiTro)) return;
    if (String(property.nguoiDungId) !== String(actor.id)) {
      throw new AppError('Chỉ chủ tin mới xem được analytics / lead', 403);
    }
  }

  async function isSpam(propertyId, action, viewerId, sessionId) {
    const since = new Date(Date.now() - debounceMs);
    const filter = { propertyId, action, createdAt: { $gte: since } };
    if (viewerId) filter.viewerId = viewerId;
    else if (sessionId) filter.sessionId = sessionId;
    else return false;

    const recent = await Behavior.findOne(filter).lean();
    return Boolean(recent);
  }

  /**
   * Ghi behavior + cập nhật / tạo PropertyLead (chỉ khi có viewerId).
   */
  async function trackBehavior(propertyId, input, context = {}) {
    const { action, metadata = {}, sessionId = '' } = input;
    if (!action || !BEHAVIOR_ACTIONS.includes(action)) {
      throw new AppError(
        `action không hợp lệ. Chỉ chấp nhận: ${BEHAVIOR_ACTIONS.join(', ')}`,
        400,
      );
    }

    const property = await getPropertyOrThrow(propertyId);
    const viewerId = context.viewerId || null;
    const sid = String(sessionId || context.sessionId || '').trim();

    if (!viewerId && !sid) {
      throw new AppError('Cần đăng nhập hoặc gửi sessionId', 400);
    }

    // Không ghi lead/behavior spam của chính chủ tin trên bài mình (trừ IMPRESSION public)
    if (viewerId && String(property.nguoiDungId) === String(viewerId) && action !== 'IMPRESSION') {
      return ok(
        { skipped: true, reason: 'owner_self' },
        'Bỏ qua hành vi của chính chủ tin',
      );
    }

    if (await isSpam(propertyId, action, viewerId, sid)) {
      return ok(
        { skipped: true, reason: 'debounce' },
        'Bỏ qua hành vi trùng trong vài giây',
      );
    }

    const behavior = await Behavior.create({
      propertyId,
      viewerId,
      sessionId: sid,
      ip: context.ip || '',
      userAgent: context.userAgent || '',
      action,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    let lead = null;
    const points = BEHAVIOR_SCORES[action] ?? 0;

    if (viewerId) {
      lead = await Lead.findOneAndUpdate(
        { propertyId, viewerId },
        {
          $setOnInsert: {
            ownerId: property.nguoiDungId,
            status: 'NEW',
            note: '',
          },
          $set: {
            lastAction: action,
          },
          $inc: { score: points },
          $addToSet: { actions: action },
        },
        { upsert: true, new: true },
      );
    }

    return ok(
      {
        behavior: {
          _id: behavior._id,
          propertyId: behavior.propertyId,
          action: behavior.action,
          createdAt: behavior.createdAt,
        },
        lead: lead
          ? {
              _id: lead._id,
              score: lead.score,
              lastAction: lead.lastAction,
              status: lead.status,
              actions: lead.actions,
            }
          : null,
        pointsAdded: points,
      },
      'Ghi nhận hành vi thành công',
    );
  }

  async function getBehaviors(propertyId, actor, query = {}) {
    const property = await getPropertyOrThrow(propertyId);
    await assertOwnerAccess(property, actor);

    const { action, period = '7d' } = query;
    const filter = {
      propertyId,
      createdAt: { $gte: periodStart(period) },
    };
    if (action) {
      if (!BEHAVIOR_ACTIONS.includes(action)) {
        throw new AppError('action không hợp lệ', 400);
      }
      filter.action = action;
    }

    const { pageNum, limitNum, skip } = parsePagination(query);
    const [rows, total] = await Promise.all([
      Behavior.find(filter)
        .populate({
          path: 'viewerId',
          select: VIEWER_FIELDS,
          populate: { path: 'vaiTro', select: 'ten' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Behavior.countDocuments(filter),
    ]);

    return ok(
      {
        items: rows,
        pagination: buildPaginationMeta(total, pageNum, limitNum),
      },
      'Lấy danh sách behavior thành công',
    );
  }

  async function getLeads(propertyId, actor, query = {}) {
    const property = await getPropertyOrThrow(propertyId);
    await assertOwnerAccess(property, actor);

    const { status, sortBy = 'score', sortOrder = 'desc' } = query;
    const filter = { propertyId };
    if (status) {
      if (!PROPERTY_LEAD_STATUSES.includes(status)) {
        throw new AppError(
          `status không hợp lệ. Chỉ chấp nhận: ${PROPERTY_LEAD_STATUSES.join(', ')}`,
          400,
        );
      }
      filter.status = status;
    }

    const { pageNum, limitNum, skip } = parsePagination(query);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [rows, total] = await Promise.all([
      Lead.find(filter)
        .populate({
          path: 'viewerId',
          select: VIEWER_FIELDS,
          populate: { path: 'vaiTro', select: 'ten' },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    const ranked = rows.map((lead, index) => ({
      ...lead,
      viewer: lead.viewerId,
      rank: skip + index + 1,
      quality:
        lead.score >= 30 ? 'high' : lead.score >= 15 ? 'medium' : 'low',
    }));

    return ok(
      {
        items: ranked,
        pagination: buildPaginationMeta(total, pageNum, limitNum),
      },
      'Lấy danh sách lead (xếp hạng theo score) thành công',
    );
  }

  async function getAnalytics(propertyId, actor, query = {}) {
    const property = await getPropertyOrThrow(propertyId);
    await assertOwnerAccess(property, actor);

    const period = query.period || '7d';
    const from = periodStart(period);

    const grouped = await Behavior.aggregate([
      { $match: { propertyId: property._id, createdAt: { $gte: from } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]);

    const counts = Object.fromEntries(BEHAVIOR_ACTIONS.map((a) => [a, 0]));
    for (const row of grouped) {
      counts[row._id] = row.count;
    }

    const leadStats = await Lead.aggregate([
      { $match: { propertyId: property._id } },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          avgScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
        },
      },
    ]);

    const byStatus = await Lead.aggregate([
      { $match: { propertyId: property._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return ok(
      {
        period,
        from,
        to: new Date(),
        behaviors: {
          impression: counts.IMPRESSION,
          viewDetail: counts.VIEW_DETAIL,
          viewImage: counts.VIEW_IMAGE,
          viewVideo: counts.VIEW_VIDEO,
          save: counts.SAVE_PROPERTY,
          share: counts.SHARE_PROPERTY,
          phoneClick: counts.VIEW_PHONE,
          zaloClick: counts.CLICK_ZALO,
          chat: counts.CHAT,
          call: counts.CALL,
          booking: counts.BOOKING,
          raw: counts,
        },
        leads: {
          total: leadStats[0]?.totalLeads || 0,
          avgScore: Math.round((leadStats[0]?.avgScore || 0) * 10) / 10,
          maxScore: leadStats[0]?.maxScore || 0,
          byStatus: Object.fromEntries(
            PROPERTY_LEAD_STATUSES.map((s) => [
              s,
              byStatus.find((x) => x._id === s)?.count || 0,
            ]),
          ),
        },
      },
      'Lấy thống kê behavior / lead thành công',
    );
  }

  async function updateLeadStatus(leadId, status, actor) {
    if (!PROPERTY_LEAD_STATUSES.includes(status)) {
      throw new AppError(
        `status không hợp lệ. Chỉ chấp nhận: ${PROPERTY_LEAD_STATUSES.join(', ')}`,
        400,
      );
    }

    const lead = await Lead.findById(leadId);
    if (!lead) throw new AppError('Không tìm thấy lead', 404);

    const property = await getPropertyOrThrow(lead.propertyId);
    await assertOwnerAccess(property, actor);

    lead.status = status;
    await lead.save();

    return ok(lead.toObject(), 'Cập nhật trạng thái lead thành công');
  }

  async function updateLeadNote(leadId, note, actor) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new AppError('Không tìm thấy lead', 404);

    const property = await getPropertyOrThrow(lead.propertyId);
    await assertOwnerAccess(property, actor);

    lead.note = note ?? '';
    await lead.save();

    return ok(lead.toObject(), 'Cập nhật ghi chú lead thành công');
  }

  return {
    trackBehavior,
    getBehaviors,
    getLeads,
    getAnalytics,
    updateLeadStatus,
    updateLeadNote,
    BEHAVIOR_ACTIONS,
    BEHAVIOR_SCORES,
    PROPERTY_LEAD_STATUSES,
  };
}

const behaviorTrackingService = createBehaviorTrackingService();
export default behaviorTrackingService;
