import express from 'express';
import dealController from '#modules/deal/controllers/dealController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

const staff = authorizeRoles('admin', 'quan_tri_vien', 'nhan_vien', 'ke_toan', 'sale');

router.get('/stats', staff, dealController.stats);
router.get('/', staff, dealController.list);
router.post('/', staff, dealController.create);
router.get('/:id/audit', staff, dealController.audit);
router.get('/:id', staff, dealController.getById);
router.put('/:id', staff, dealController.update);
router.patch('/:id/assign', staff, dealController.assign);
router.post('/:id/close', staff, dealController.close);
router.post('/:id/lose', staff, dealController.lose);
router.delete('/:id', staff, dealController.remove);

export default router;
