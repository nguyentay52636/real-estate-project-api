import express from 'express';
import contactController from '#modules/contact/controllers/contactController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';
import { optionalAuth } from '#shared/middleware/optionalAuth.js';

const router = express.Router();

/**
 * POST /api/contact — form hỗ trợ (public).
 * Có JWT thì gắn nguoiDungId.
 */
router.post('/', optionalAuth, contactController.createContact);

/**
 * GET /api/contact — danh sách (admin / nhan_vien)
 * Query: trangThai, email, q, page, limit
 */
router.get(
  '/',
  authorizeRoles('admin', 'nhan_vien'),
  contactController.getContacts,
);

router.get(
  '/:id',
  authorizeRoles('admin', 'nhan_vien'),
  contactController.getContactById,
);

router.patch(
  '/:id/status',
  authorizeRoles('admin', 'nhan_vien'),
  contactController.updateStatus,
);

router.patch(
  '/:id/note',
  authorizeRoles('admin', 'nhan_vien'),
  contactController.updateNote,
);

export default router;
