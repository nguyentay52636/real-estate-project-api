/**
 * CRM Knowledge Admin — DEPRECATED.
 * AI catalog giờ lấy từ Property (trangThai = dang_hoat_dong).
 * Admin quản tin qua /api/property | /api/property-post.
 * Các endpoint dưới đây trả 410 để FE chuyển UI.
 */
import express from 'express';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

const DEPRECATED = {
  message:
    'CRM Knowledge CRUD đã ngừng. AI dùng catalog từ Property đang hoạt động. Quản lý tin qua /api/property hoặc /api/property-post. Catalog AI: GET /api/crm-knowledge-catalog',
  code: 'CRM_KNOWLEDGE_DEPRECATED',
  migration: {
    catalog: 'GET /api/crm-knowledge-catalog',
    manageListings: 'GET|POST /api/property-post',
    publicList: 'GET /api/property',
  },
};

function gone(_req, res) {
  return res.status(410).json(DEPRECATED);
}

router.use(authorizeRoles('admin', 'nhan_vien', 'quan_tri_vien'));

router.post('/', gone);
router.get('/', gone);
router.get('/:id', gone);
router.put('/:id', gone);
router.delete('/:id', gone);
router.post('/:id/images', gone);

export default router;
