import express from 'express';
import leadController from '#modules/property/controllers/leadController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

/**
 * Tạo lead khi người dùng xem tin / bấm gọi / Zalo / chat / đặt lịch.
 * viewerId lấy từ JWT; ownerId lấy từ property.
 */
router.post(
  '/',
  authorizeRoles('nguoi_thue', 'chu_tro', 'nhan_vien', 'admin'),
  leadController.createLead,
);

/**
 * Chủ tin / admin / NV xem danh sách lead (kèm thông tin viewer).
 * Query: propertyId, type, status, page, limit, ownerId (chỉ admin/NV)
 */
router.get(
  '/',
  authorizeRoles('chu_tro', 'nhan_vien', 'admin'),
  leadController.getLeads,
);

router.get(
  '/:id',
  authorizeRoles('chu_tro', 'nhan_vien', 'admin'),
  leadController.getLeadById,
);

router.patch(
  '/:id/status',
  authorizeRoles('chu_tro', 'nhan_vien', 'admin'),
  leadController.updateLeadStatus,
);

router.patch(
  '/:id/note',
  authorizeRoles('chu_tro', 'nhan_vien', 'admin'),
  leadController.updateLeadNote,
);

export default router;
