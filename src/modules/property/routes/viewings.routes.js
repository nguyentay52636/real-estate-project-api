import express from 'express';
import viewingsController from '#modules/property/controllers/viewingsController.js';

const router = express.Router();

// GET /api/viewing — danh sách lịch hẹn (filter: nguoiDungId, batDongSanId, trangThai, page, limit)
router.get('/', viewingsController.getAllViewings);

// GET /api/viewing/:id
router.get('/:id', viewingsController.getViewingById);

// POST /api/viewing — đặt lịch xem nhà
router.post('/', viewingsController.createViewing);

// PUT /api/viewing/:id — sửa lịch
router.put('/:id', viewingsController.updateViewing);

// DELETE /api/viewing/:id — xoá lịch
router.delete('/:id', viewingsController.deleteViewing);

export default router;
