import express from 'express';
import viewingsController from '#modules/property/controllers/viewingsController.js';

import middlewareController from '#shared/middleware/auth.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

// GET /api/viewing — danh sách lịch hẹn (yêu cầu xác thực)
router.get('/', middlewareController.verifyToken, viewingsController.getAllViewings);

// GET /api/viewing/:id
router.get('/:id', middlewareController.verifyToken, viewingsController.getViewingById);

// POST /api/viewing — đặt lịch xem nhà (yêu cầu xác thực)
router.post('/', middlewareController.verifyToken, viewingsController.createViewing);

// PUT /api/viewing/:id — sửa lịch
router.put('/:id', middlewareController.verifyToken, viewingsController.updateViewing);

// DELETE /api/viewing/:id — xoá lịch
router.delete('/:id', middlewareController.verifyToken, viewingsController.deleteViewing);

export default router;
