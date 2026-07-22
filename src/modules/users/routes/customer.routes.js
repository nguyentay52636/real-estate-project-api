import express from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '#modules/users/controllers/customerController.js';

import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

router.get("/", authorizeRoles('admin', 'nhan_vien'), getCustomers);
router.get("/:id", authorizeRoles('admin', 'nhan_vien', 'nguoi_thue'), getCustomerById);
router.post("/", authorizeRoles('admin'), createCustomer);
router.put("/:id", authorizeRoles('admin', 'nhan_vien'), updateCustomer);
router.delete("/:id", authorizeRoles('admin'), deleteCustomer);
export default router;