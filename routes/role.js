import express from 'express';
import roleController from '../controllers/RoleController.js';

const router = express.Router();

// GET /api/viewings
router.get("/", roleController.getAllRoles);

export default router;
