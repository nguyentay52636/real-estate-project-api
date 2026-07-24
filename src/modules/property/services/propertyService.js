import PropertyModel from '#models/Property.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';
import {
  calculateHaversineDistance,
  getDefaultCoordinates,
  isValidCoordinates,
} from '#shared/utils/geoUtils.js';
import { maybeLean, maybeSelect } from '#shared/utils/queryHelpers.js';
import {
  cacheGetOrSet,
  cacheDel,
  cacheDelByPrefix,
  hashKey,
  stripCacheBustParams,
} from '#infra/cache/redisCache.js';
import { enqueueJob } from '#infra/queue/jobQueue.js';
import { JOB_PROPERTY_EMBED } from '#infra/queue/jobHandlers.js';
import { clearCatalogCache } from '#modules/ai/services/crmKnowledgeCatalogClient.js';

const CHU_NHA_FIELDS = 'ten soDienThoai anhDaiDien trangThai vaiTro';
const LIST_SELECT =
  'tieuDe slug loaiBds loaiGiaoDich gia dienTich diaChi tinhThanh quanHuyen duAn toaDo anhDaiDien phongNgu phongTam choDauXe trangThai nguoiDungId badge subtitle overlay createdAt updatedAt';
const VALID_STATUSES = ['cho_duyet', 'dang_hoat_dong', 'da_cho_thue', 'da_ban'];
const VALID_TRANSACTION_TYPES = ['ban', 'cho_thue'];

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

/** Escape regex special chars for case-insensitive exact-ish match */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Exact location filter (case-insensitive, anchored) — uses indexes better than unanchored /i */
function locationEquals(value) {
  return { $regex: new RegExp(`^${escapeRegex(String(value).trim())}$`, 'i') };
}

function applySearchFilter(filter, search) {
  if (!search || !String(search).trim()) return;
  const term = String(search).trim();
  // Prefer text index when available; fallback $or for short queries
  if (term.length >= 2) {
    filter.$text = { $search: term };
  } else {
    filter.$or = [
      { tieuDe: { $regex: new RegExp(escapeRegex(term), 'i') } },
      { diaChi: { $regex: new RegExp(escapeRegex(term), 'i') } },
    ];
  }
}

/** Approximate bounding box for radius (km) to prefilter in Mongo */
function bboxFilter(centerLat, centerLng, radiusKm) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);
  return {
    'toaDo.lat': { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
    'toaDo.lng': { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta },
  };
}

function populateChuNha(query) {
  if (!query || typeof query.populate !== 'function') {
    return query;
  }
  return query.populate({
    path: 'nguoiDungId',
    select: CHU_NHA_FIELDS,
    populate: { path: 'vaiTro', select: 'ten' },
  });
}

function toPropertyResponse(doc) {
  if (!doc) return null;
  const property = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const owner =
    property.nguoiDungId && typeof property.nguoiDungId === 'object'
      ? property.nguoiDungId
      : null;

  property.chuNha = owner;
  return property;
}

function mapPropertyList(rows) {
  return rows.map(toPropertyResponse);
}

export function createPropertyService(deps = {}) {
  const Property = deps.Property ?? PropertyModel;
  const User = deps.User ?? UserModel;

  async function listWithPagination(filter, query, sortOptions = { createdAt: -1 }) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const hasText = Boolean(filter.$text);
    const sort = hasText
      ? { score: { $meta: 'textScore' }, ...sortOptions }
      : sortOptions;

    const selectFields = hasText
      ? {
          tieuDe: 1,
          slug: 1,
          loaiBds: 1,
          loaiGiaoDich: 1,
          gia: 1,
          dienTich: 1,
          diaChi: 1,
          tinhThanh: 1,
          quanHuyen: 1,
          duAn: 1,
          toaDo: 1,
          anhDaiDien: 1,
          phongNgu: 1,
          phongTam: 1,
          choDauXe: 1,
          trangThai: 1,
          nguoiDungId: 1,
          badge: 1,
          subtitle: 1,
          overlay: 1,
          createdAt: 1,
          updatedAt: 1,
          score: { $meta: 'textScore' },
        }
      : LIST_SELECT;

    let findQuery = populateChuNha(maybeSelect(Property.find(filter), selectFields));
    if (typeof findQuery?.sort === 'function') findQuery = findQuery.sort(sort);
    if (typeof findQuery?.skip === 'function') findQuery = findQuery.skip(skip);
    if (typeof findQuery?.limit === 'function') findQuery = findQuery.limit(limitNum);

    const [rows, total] = await Promise.all([
      maybeLean(findQuery),
      Property.countDocuments(filter),
    ]);
    return {
      data: mapPropertyList(rows),
      pagination: buildPaginationMeta(total, pageNum, limitNum),
      total,
    };
  }

  function buildListFilter(query = {}) {
    const {
      loaiBds,
      loaiGiaoDich,
      trangThai,
      tinhThanh,
      quanHuyen,
      giaMin,
      giaMax,
      search,
    } = query;

    const filter = {};
    if (loaiBds) filter.loaiBds = loaiBds;
    if (loaiGiaoDich) {
      if (!VALID_TRANSACTION_TYPES.includes(loaiGiaoDich)) {
        throw new AppError(
          `Loại giao dịch không hợp lệ. Chỉ chấp nhận: ${VALID_TRANSACTION_TYPES.join(', ')}`,
          400,
        );
      }
      filter.loaiGiaoDich = loaiGiaoDich;
    }
    if (trangThai) filter.trangThai = trangThai;
    if (tinhThanh) filter.tinhThanh = locationEquals(tinhThanh);
    if (quanHuyen) filter.quanHuyen = locationEquals(quanHuyen);
    if (giaMin || giaMax) {
      filter.gia = {};
      if (giaMin) filter.gia.$gte = Number(giaMin);
      if (giaMax) filter.gia.$lte = Number(giaMax);
    }
    applySearchFilter(filter, search);
    return filter;
  }

  async function invalidatePropertyCache(slug) {
    await cacheDelByPrefix('property:list:');
    await cacheDelByPrefix('property:related:');
    if (slug) await cacheDel(`property:slug:${slug}`);
    clearCatalogCache();
  }

  function schedulePropertyEmbedding(propertyId) {
    if (!propertyId) return;
    enqueueJob(JOB_PROPERTY_EMBED, { propertyId: String(propertyId) }).catch(() => {});
  }

  async function getAllProperties(query = {}) {
    const cacheQuery = stripCacheBustParams(query);
    const cacheKey = `property:list:${hashKey(cacheQuery)}`;
    return cacheGetOrSet(cacheKey, Number(process.env.CACHE_TTL_PROPERTY_LIST || 45), () =>
      getAllPropertiesUncached(cacheQuery),
    );
  }

  async function getAllPropertiesUncached(query = {}) {
    const {
      lat,
      lng,
      radius,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = buildListFilter(query);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const hasLat = lat !== undefined && lat !== null && lat !== '';
    const hasLng = lng !== undefined && lng !== null && lng !== '';
    const hasRadius = radius !== undefined && radius !== null && radius !== '';

    if (hasLat && hasLng && hasRadius) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      if (
        isNaN(centerLat) ||
        centerLat < -90 ||
        centerLat > 90 ||
        isNaN(centerLng) ||
        centerLng < -180 ||
        centerLng > 180 ||
        isNaN(radiusKm) ||
        radiusKm < 0
      ) {
        throw new AppError('Tọa độ hoặc bán kính không hợp lệ', 400);
      }

      Object.assign(filter, bboxFilter(centerLat, centerLng, radiusKm));

      const { pageNum, limitNum, skip } = parsePagination(query);
      // Cap candidates fetched for Haversine (avoid full collection)
      const candidateLimit = Math.min(500, Math.max(limitNum * 10, 100));

      let geoQuery = populateChuNha(maybeSelect(Property.find(filter), LIST_SELECT));
      if (typeof geoQuery?.sort === 'function') geoQuery = geoQuery.sort(sortOptions);
      if (typeof geoQuery?.limit === 'function') geoQuery = geoQuery.limit(candidateLimit);

      const rows = await maybeLean(geoQuery);
      const mapped = mapPropertyList(rows);

      const matched = [];
      for (const item of mapped) {
        if (
          item.toaDo &&
          typeof item.toaDo.lat === 'number' &&
          typeof item.toaDo.lng === 'number'
        ) {
          const dist = calculateHaversineDistance(
            centerLat,
            centerLng,
            item.toaDo.lat,
            item.toaDo.lng,
          );
          if (dist <= radiusKm) {
            item.khoangCach = Math.round(dist * 10) / 10;
            matched.push(item);
          }
        }
      }

      const total = matched.length;
      const paginatedData = matched.slice(skip, skip + limitNum);

      return {
        data: paginatedData,
        pagination: buildPaginationMeta(total, pageNum, limitNum),
      };
    }

    const { data, pagination } = await listWithPagination(filter, query, sortOptions);

    if (hasLat && hasLng) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      if (!isNaN(centerLat) && !isNaN(centerLng)) {
        for (const item of data) {
          if (
            item.toaDo &&
            typeof item.toaDo.lat === 'number' &&
            typeof item.toaDo.lng === 'number'
          ) {
            const dist = calculateHaversineDistance(
              centerLat,
              centerLng,
              item.toaDo.lat,
              item.toaDo.lng,
            );
            item.khoangCach = Math.round(dist * 10) / 10;
          }
        }
      }
    }

    return { data, pagination };
  }

  async function getPropertyById(id) {
    let q = Property.findById(id);
    if (typeof q?.select === 'function') q = q.select('-embedding');
    const property = await maybeLean(populateChuNha(q));
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    return toPropertyResponse(property);
  }

  async function getRelatedProperties(id, { limit = 6 } = {}) {
    const current = await maybeLean(Property.findById(id));
    if (!current) throw new AppError('Không tìm thấy bất động sản', 404);

    const maxItems = Math.min(12, Math.max(1, parseInt(limit, 10) || 6));

    const collected = new Map();
    const excludedIds = [current._id];

    const priceLow = current.gia * 0.8;
    const priceHigh = current.gia * 1.2;

    const tiers = [];

    if (current.duAn) {
      tiers.push({
        duAn: current.duAn,
        gia: { $gte: priceLow, $lte: priceHigh },
      });
      tiers.push({ duAn: current.duAn });
    }

    tiers.push({ loaiBds: current.loaiBds, quanHuyen: current.quanHuyen });
    tiers.push({ tinhThanh: current.tinhThanh, loaiBds: current.loaiBds });

    for (const tierFilter of tiers) {
      if (collected.size >= maxItems) break;

      const remaining = maxItems - collected.size;
      const filter = {
        ...tierFilter,
        trangThai: 'dang_hoat_dong',
        _id: { $nin: excludedIds },
      };
      if (current.loaiGiaoDich) {
        filter.loaiGiaoDich = current.loaiGiaoDich;
      }

      let relatedQuery = populateChuNha(maybeSelect(Property.find(filter), LIST_SELECT));
      if (typeof relatedQuery?.sort === 'function') relatedQuery = relatedQuery.sort({ createdAt: -1 });
      if (typeof relatedQuery?.limit === 'function') relatedQuery = relatedQuery.limit(remaining);

      const rows = await maybeLean(relatedQuery);

      for (const row of rows) {
        const key = String(row._id);
        if (!collected.has(key)) {
          collected.set(key, row);
          excludedIds.push(row._id);
        }
      }
    }

    const currentDuAn = current.duAn || null;

    const sorted = [...collected.values()].sort((a, b) => {
      const aSameDuAn = currentDuAn && a.duAn === currentDuAn ? 1 : 0;
      const bSameDuAn = currentDuAn && b.duAn === currentDuAn ? 1 : 0;
      if (aSameDuAn !== bSameDuAn) return bSameDuAn - aSameDuAn;

      const priceDiff = Math.abs(a.gia - current.gia) - Math.abs(b.gia - current.gia);
      if (priceDiff !== 0) return priceDiff;

      const areaDiff =
        Math.abs(a.dienTich - current.dienTich) - Math.abs(b.dienTich - current.dienTich);
      if (areaDiff !== 0) return areaDiff;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return sorted.slice(0, maxItems).map(toPropertyResponse);
  }

  async function getPropertyAuthor(id) {
    const property = await maybeLean(
      populateChuNha(maybeSelect(Property.findById(id), 'tieuDe slug nguoiDungId')),
    );
    if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
    if (!property.nguoiDungId) {
      throw new AppError('Không tìm thấy chủ nhà đăng tin', 404);
    }

    return {
      propertyId: property._id,
      tieuDe: property.tieuDe,
      slug: property.slug,
      chuNha: property.nguoiDungId,
      tacGia: property.nguoiDungId,
    };
  }

  async function getPropertyBySlug(slug) {
    return cacheGetOrSet(`property:slug:${slug}`, Number(process.env.CACHE_TTL_PROPERTY_SLUG || 180), async () => {
      let q = Property.findOne({ slug });
      if (typeof q?.select === 'function') q = q.select('-embedding');
      const property = await maybeLean(populateChuNha(q));
      if (!property) throw new AppError('Không tìm thấy bất động sản', 404);
      return toPropertyResponse(property);
    });
  }

  async function getPropertiesByDistrict(district, query = {}) {
    const filter = { quanHuyen: locationEquals(district) };
    const { data, pagination, total } = await listWithPagination(filter, query);
    if (total === 0) {
      throw new AppError('Không tìm thấy bất động sản tại quận/huyện này', 404);
    }
    return { data, pagination };
  }

  async function getPropertiesByUser(userId, query = {}) {
    if (!userId) throw new AppError('Thiếu userId', 400);

    const user = await maybeLean(User.findById(userId).select('_id'));
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    const {
      sortBy = 'createdAt',
      sortOrder = 'desc',
      public: publicOnly,
      trangThai,
    } = query;

    const filter = buildListFilter(query);
    filter.nguoiDungId = userId;

    const wantAll =
      publicOnly === 'false' || publicOnly === false || publicOnly === '0';
    if (trangThai) {
      filter.trangThai = trangThai;
    } else if (!wantAll) {
      filter.trangThai = 'dang_hoat_dong';
    }

    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const { data, pagination } = await listWithPagination(filter, query, sortOptions);
    return { data, pagination };
  }

  async function assertCanPostProperty(nguoiDungId) {
    if (!nguoiDungId) {
      throw new AppError('Thiếu nguoiDungId (ID chủ đăng tin)', 400);
    }

    const user = await maybeLean(User.findById(nguoiDungId).populate('vaiTro', 'ten'));
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    if (user.trangThai === 'khoa') {
      throw new AppError('Tài khoản đã bị khóa, không thể đăng tin', 403);
    }

    const roleName = user.vaiTro?.ten;
    if (!['chu_tro', 'nhan_vien', 'admin'].includes(roleName)) {
      throw new AppError(
        'Chỉ tài khoản vai trò chu_tro, nhan_vien hoặc admin mới được đăng tin',
        403,
      );
    }

    return user;
  }

  function sanitizePropertyInput(input = {}) {
    const {
      chuNha: _chuNha,
      tacGia: _tacGia,
      slug: _slug,
      _id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      __v: _v,
      ...rest
    } = input;
    return rest;
  }

  async function createProperty(input) {
    const payload = sanitizePropertyInput(input);
    await assertCanPostProperty(payload.nguoiDungId);

    if (payload.toaDo !== undefined && payload.toaDo !== null) {
      if (!isValidCoordinates(payload.toaDo)) {
        throw new AppError(
          'Tọa độ không hợp lệ (lat trong khoảng [-90, 90], lng trong khoảng [-180, 180])',
          400,
        );
      }
    } else {
      payload.toaDo = getDefaultCoordinates(payload.quanHuyen, payload.tinhThanh);
    }

    const newProperty = new Property(payload);
    const saved = await newProperty.save();
    await invalidatePropertyCache(saved.slug);
    schedulePropertyEmbedding(saved._id);
    return getPropertyById(saved._id);
  }

  async function updateProperty(id, input) {
    const payload = sanitizePropertyInput(input);
    if (payload.nguoiDungId) {
      await assertCanPostProperty(payload.nguoiDungId);
    }

    if (payload.toaDo !== undefined && payload.toaDo !== null) {
      if (!isValidCoordinates(payload.toaDo)) {
        throw new AppError(
          'Tọa độ không hợp lệ (lat trong khoảng [-90, 90], lng trong khoảng [-180, 180])',
          400,
        );
      }
    }

    const updated = await Property.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new AppError('Không tìm thấy bất động sản', 404);
    await invalidatePropertyCache(updated.slug);
    schedulePropertyEmbedding(updated._id);
    return getPropertyById(updated._id);
  }

  async function updatePropertyStatus(id, trangThai) {
    if (!VALID_STATUSES.includes(trangThai)) {
      throw new AppError(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }
    const updated = await Property.findByIdAndUpdate(id, { trangThai }, { new: true });
    if (!updated) throw new AppError('Không tìm thấy bất động sản', 404);
    await invalidatePropertyCache(updated.slug);
    if (trangThai === 'dang_hoat_dong') {
      schedulePropertyEmbedding(updated._id);
    }
    return getPropertyById(updated._id);
  }

  async function deleteProperty(id) {
    const deleted = await Property.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Không tìm thấy bất động sản', 404);
    await invalidatePropertyCache(deleted.slug);
    return deleted;
  }

  return {
    getAllProperties,
    getPropertyById,
    getRelatedProperties,
    getPropertyAuthor,
    getPropertyBySlug,
    getPropertiesByDistrict,
    getPropertiesByUser,
    createProperty,
    updateProperty,
    updatePropertyStatus,
    deleteProperty,
  };
}

const propertyService = createPropertyService();
export default propertyService;
