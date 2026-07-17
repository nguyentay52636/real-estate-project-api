import propertyService from '#modules/property/services/propertyService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const propertyController = {
  getAllProperty: asyncHandler(async (req, res) => {
    const { data, pagination } = await propertyService.getAllProperties(req.query);
    return res.status(200).json({
      message: 'Lấy danh sách bất động sản thành công',
      data,
      pagination,
    });
  }),

  getPropertyById: asyncHandler(async (req, res) => {
    const property = await propertyService.getPropertyById(req.params.id);
    return res.status(200).json({
      message: 'Lấy chi tiết bất động sản thành công',
      data: property,
    });
  }),

  getPropertyAuthor: asyncHandler(async (req, res) => {
    const author = await propertyService.getPropertyAuthor(req.params.id);
    return res.status(200).json({
      message: 'Lấy thông tin tác giả bài đăng thành công',
      data: author,
    });
  }),

  getPropertyBySlug: asyncHandler(async (req, res) => {
    const property = await propertyService.getPropertyBySlug(req.params.slug);
    return res.status(200).json({
      message: 'Lấy chi tiết bất động sản theo slug thành công',
      data: property,
    });
  }),

  getPropertiesByDistrict: asyncHandler(async (req, res) => {
    const { data, pagination } = await propertyService.getPropertiesByDistrict(
      req.params.district,
      req.query,
    );
    return res.status(200).json({
      message: 'Lấy bất động sản theo quận/huyện thành công',
      data,
      pagination,
    });
  }),

  getPropertiesByUser: asyncHandler(async (req, res) => {
    const { data, pagination } = await propertyService.getPropertiesByUser(
      req.params.userId,
      req.query,
    );
    return res.status(200).json({
      message: 'Lấy bất động sản theo người dùng thành công',
      data,
      pagination,
    });
  }),

  createProperty: asyncHandler(async (req, res) => {
    const saved = await propertyService.createProperty(req.body);
    return res.status(201).json({
      message: 'Tạo bất động sản thành công',
      data: saved,
    });
  }),

  updateProperty: asyncHandler(async (req, res) => {
    const updated = await propertyService.updateProperty(req.params.id, req.body);
    return res.status(200).json({
      message: 'Cập nhật bất động sản thành công',
      data: updated,
    });
  }),

  updatePropertyStatus: asyncHandler(async (req, res) => {
    const updated = await propertyService.updatePropertyStatus(
      req.params.id,
      req.body.trangThai,
    );
    return res.status(200).json({
      message: 'Cập nhật trạng thái thành công',
      data: updated,
    });
  }),

  deleteProperty: asyncHandler(async (req, res) => {
    const deleted = await propertyService.deleteProperty(req.params.id);
    return res.status(200).json({
      message: 'Xóa bất động sản thành công',
      data: { id: deleted._id, slug: deleted.slug },
    });
  }),
};

export default propertyController;
