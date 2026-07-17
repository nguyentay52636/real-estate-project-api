import propertyPostService from '#modules/property/services/propertyPostService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const propertyPostController = {
  getPosts: asyncHandler(async (req, res) => {
    const { data, pagination } = await propertyPostService.getPosts(req.authUser, req.query);
    return res.status(200).json({
      message: 'Lấy danh sách bài đăng bất động sản thành công',
      data,
      pagination,
    });
  }),

  getPostById: asyncHandler(async (req, res) => {
    const data = await propertyPostService.getPostById(req.params.id, req.authUser);
    return res.status(200).json({
      message: 'Lấy chi tiết bài đăng bất động sản thành công',
      data,
    });
  }),

  createPost: asyncHandler(async (req, res) => {
    const data = await propertyPostService.createPost(req.body, req.authUser);
    return res.status(201).json({
      message: 'Đăng bài bất động sản thành công',
      data,
    });
  }),

  updatePost: asyncHandler(async (req, res) => {
    const data = await propertyPostService.updatePost(req.params.id, req.body, req.authUser);
    return res.status(200).json({
      message: 'Cập nhật bài đăng bất động sản thành công',
      data,
    });
  }),

  updatePostStatus: asyncHandler(async (req, res) => {
    const data = await propertyPostService.updatePostStatus(
      req.params.id,
      req.body.trangThai,
      req.authUser,
    );
    return res.status(200).json({
      message: 'Cập nhật trạng thái bài đăng thành công',
      data,
    });
  }),

  deletePost: asyncHandler(async (req, res) => {
    const deleted = await propertyPostService.deletePost(req.params.id, req.authUser);
    return res.status(200).json({
      message: 'Xóa bài đăng bất động sản thành công',
      data: { id: deleted._id, slug: deleted.slug },
    });
  }),
};

export default propertyPostController;
