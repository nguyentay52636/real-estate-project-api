import express from 'express';
import roleController from '#modules/users/controllers/roleController.js';

const router = express.Router();

// GET /api/viewings
router.get("/", roleController.getAllRoles);

export default router;
