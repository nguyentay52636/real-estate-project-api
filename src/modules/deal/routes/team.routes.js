import express from 'express';
import teamController from '#modules/deal/controllers/teamController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

const staff = authorizeRoles('admin', 'quan_tri_vien', 'nhan_vien', 'ke_toan', 'sale');
const adminOnly = authorizeRoles('admin', 'quan_tri_vien');

router.get('/', staff, teamController.list);
router.get('/:id', staff, teamController.getById);
router.post('/', adminOnly, teamController.create);
router.put('/:id', adminOnly, teamController.update);
router.delete('/:id', adminOnly, teamController.remove);

export default router;
