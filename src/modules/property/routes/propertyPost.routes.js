import express from 'express';
import propertyPostController from '#modules/property/controllers/propertyPostController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

// Tất cả API đăng/quản lý bài đều yêu cầu đăng nhập và đúng role.
router.use(authorizeRoles('admin', 'nhan_vien', 'chu_tro'));

router.get('/', propertyPostController.getPosts);
router.get('/:id', propertyPostController.getPostById);
router.post('/', propertyPostController.createPost);
router.put('/:id', propertyPostController.updatePost);
router.patch('/:id/status', propertyPostController.updatePostStatus);
router.delete('/:id', propertyPostController.deletePost);

export default router;
