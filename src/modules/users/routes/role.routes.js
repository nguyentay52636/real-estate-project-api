import express from 'express';
import roleController from '#modules/users/controllers/roleController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

/** Danh sách role — chỉ staff (không public) */
router.get(
  '/',
  authorizeRoles('admin', 'nhan_vien', 'quan_tri_vien'),
  roleController.getAllRoles,
);

export default router;
