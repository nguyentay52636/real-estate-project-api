import express from 'express';
import employeeController from '#modules/users/controllers/employeeController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

const staffRead = authorizeRoles('admin', 'nhan_vien');
const adminOnly = authorizeRoles('admin');

/**
 * GET /api/employee
 * Danh sách = tất cả User có vaiTro nhan_vien (+ field nhanVien nếu có hồ sơ).
 * :id trên GET/PUT/DELETE = userId (không phải _id hồ sơ NhanVien).
 */
router.get('/', staffRead, employeeController.getAllEmployee);

/** Alias cùng GET / — giữ tương thích FE cũ */
router.get('/users', staffRead, employeeController.listStaffUsers);

router.get('/search', staffRead, employeeController.searchEmployees);

router.get('/:id', staffRead, employeeController.getEmployeeById);

router.post('/', adminOnly, employeeController.createEmployee);

router.put('/:id', adminOnly, employeeController.updateEmployee);

router.delete('/:id', adminOnly, employeeController.deleteEmployee);

export default router;
