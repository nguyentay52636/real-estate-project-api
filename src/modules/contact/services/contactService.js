import ContactModel, { VALID_STATUSES } from '#models/Contact.js';
import { AppError } from '#shared/errors/AppError.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

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
    totalPages: Math.ceil(total / limitNum) || 0,
  };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createContactService(deps = {}) {
  const Contact = deps.Contact ?? ContactModel;

  async function createContact(body = {}, userId = null) {
    const chuDe = typeof body.chuDe === 'string' ? body.chuDe.trim() : '';
    const hoTen = typeof body.hoTen === 'string' ? body.hoTen.trim() : '';
    const soDienThoai = typeof body.soDienThoai === 'string' ? body.soDienThoai.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const noiDung = typeof body.noiDung === 'string' ? body.noiDung.trim() : '';

    if (!chuDe || !hoTen || !soDienThoai || !email || !noiDung) {
      throw new AppError(
        'Thiếu chuDe, hoTen, soDienThoai, email hoặc noiDung',
        400,
      );
    }

    if (!EMAIL_RE.test(email)) {
      throw new AppError('Email không hợp lệ', 400);
    }

    const doc = await Contact.create({
      chuDe,
      hoTen,
      soDienThoai,
      email,
      noiDung,
      nguoiDungId: userId || null,
      trangThai: 'moi',
    });

    return doc.toObject ? doc.toObject() : doc;
  }

  async function getContacts(query = {}) {
    const { trangThai, email, q, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter = {};

    if (trangThai) {
      if (!VALID_STATUSES.includes(trangThai)) {
        throw new AppError(
          `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
          400,
        );
      }
      filter.trangThai = trangThai;
    }

    if (email) {
      filter.email = String(email).trim().toLowerCase();
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ hoTen: rx }, { soDienThoai: rx }, { email: rx }, { chuDe: rx }];
    }

    const { pageNum, limitNum, skip } = parsePagination(query);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const findQuery = Contact.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate({ path: 'nguoiDungId', select: 'ten email soDienThoai anhDaiDien' });

    const [rows, total] = await Promise.all([
      findQuery,
      Contact.countDocuments(filter),
    ]);

    return {
      data: rows.map((r) => (r.toObject ? r.toObject() : r)),
      pagination: buildPaginationMeta(total, pageNum, limitNum),
    };
  }

  async function getContactById(id) {
    const doc = await Contact.findById(id).populate({
      path: 'nguoiDungId',
      select: 'ten email soDienThoai anhDaiDien',
    });
    if (!doc) throw new AppError('Không tìm thấy liên hệ', 404);
    return doc.toObject ? doc.toObject() : doc;
  }

  async function updateStatus(id, trangThai) {
    if (!trangThai || !VALID_STATUSES.includes(trangThai)) {
      throw new AppError(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }

    const updated = await Contact.findByIdAndUpdate(
      id,
      { trangThai },
      { new: true, runValidators: true },
    ).populate({
      path: 'nguoiDungId',
      select: 'ten email soDienThoai anhDaiDien',
    });

    if (!updated) throw new AppError('Không tìm thấy liên hệ', 404);
    return updated.toObject ? updated.toObject() : updated;
  }

  async function updateNote(id, ghiChuNoiBo) {
    if (ghiChuNoiBo === undefined || ghiChuNoiBo === null) {
      throw new AppError('Thiếu ghiChuNoiBo', 400);
    }

    const updated = await Contact.findByIdAndUpdate(
      id,
      { ghiChuNoiBo: String(ghiChuNoiBo) },
      { new: true, runValidators: true },
    ).populate({
      path: 'nguoiDungId',
      select: 'ten email soDienThoai anhDaiDien',
    });

    if (!updated) throw new AppError('Không tìm thấy liên hệ', 404);
    return updated.toObject ? updated.toObject() : updated;
  }

  return {
    createContact,
    getContacts,
    getContactById,
    updateStatus,
    updateNote,
    VALID_STATUSES,
  };
}

const contactService = createContactService();
export default contactService;
