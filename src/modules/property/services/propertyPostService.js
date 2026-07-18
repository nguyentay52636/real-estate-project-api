import propertyServiceDefault from '#modules/property/services/propertyService.js';
import { AppError } from '#shared/errors/AppError.js';

const PRIVILEGED_ROLES = ['admin', 'nhan_vien'];

function getOwnerId(property) {
  const owner = property?.nguoiDungId;
  return String(owner?._id ?? owner ?? '');
}

function assertCanManage(property, actor) {
  if (PRIVILEGED_ROLES.includes(actor.vaiTro)) return;
  if (getOwnerId(property) !== String(actor.id)) {
    throw new AppError('Bạn chỉ được quản lý bài đăng của chính mình', 403);
  }
}

function sanitizeWriteInput(input = {}) {
  const {
    nguoiDungId: _nguoiDungId,
    chuNha: _chuNha,
    tacGia: _tacGia,
    slug: _slug,
    _id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    __v: _version,
    ...payload
  } = input;
  return payload;
}

export function createPropertyPostService(deps = {}) {
  const propertyService = deps.propertyService ?? propertyServiceDefault;

  async function getPosts(actor, query = {}) {
    if (PRIVILEGED_ROLES.includes(actor.vaiTro)) {
      return propertyService.getAllProperties(query);
    }
    return propertyService.getPropertiesByUser(actor.id, { ...query, public: 'false' });
  }

  async function getPostsByUserId(userId, actor, query = {}) {
    if (!PRIVILEGED_ROLES.includes(actor.vaiTro) && String(userId) !== String(actor.id)) {
      throw new AppError('Bạn chỉ được xem danh sách bài đăng của chính mình', 403);
    }
    return propertyService.getPropertiesByUser(userId, { ...query, public: 'false' });
  }

  async function getPostById(id, actor) {
    const property = await propertyService.getPropertyById(id);
    assertCanManage(property, actor);
    return property;
  }

  async function createPost(input, actor) {
    const payload = {
      ...sanitizeWriteInput(input),
      // Chủ tin luôn lấy từ tài khoản đã xác thực, không tin ID do client gửi.
      nguoiDungId: actor.id,
    };
    return propertyService.createProperty(payload);
  }

  async function updatePost(id, input, actor) {
    const property = await propertyService.getPropertyById(id);
    assertCanManage(property, actor);
    return propertyService.updateProperty(id, sanitizeWriteInput(input));
  }

  async function updatePostStatus(id, trangThai, actor) {
    const property = await propertyService.getPropertyById(id);
    assertCanManage(property, actor);
    return propertyService.updatePropertyStatus(id, trangThai);
  }

  async function deletePost(id, actor) {
    const property = await propertyService.getPropertyById(id);
    assertCanManage(property, actor);
    return propertyService.deleteProperty(id);
  }

  return {
    getPosts,
    getPostsByUserId,
    getPostById,
    createPost,
    updatePost,
    updatePostStatus,
    deletePost,
  };
}

const propertyPostService = createPropertyPostService();
export default propertyPostService;
