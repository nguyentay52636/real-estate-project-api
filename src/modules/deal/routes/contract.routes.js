import express from 'express';
import contractController from '#modules/deal/controllers/contractController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();
const staff = authorizeRoles('admin', 'quan_tri_vien', 'nhan_vien', 'ke_toan', 'sale');

router.get('/', staff, contractController.list);
router.post('/', staff, contractController.create);
router.put('/:id', staff, contractController.update);
router.delete('/:id', staff, contractController.remove);

export default router;
