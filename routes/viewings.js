import express from 'express';
import viewingsController from '../controllers/viewingsController.js';

const router = express.Router();

// GET /api/viewings
router.get("/", viewingsController.getAllViewings);

// GET /api/viewings/:id
router.get("/:id", viewingsController.getViewingById);

// POST /api/viewings
router.post("/", viewingsController.createViewing);

// PUT /api/viewings/:id
router.put("/:id", viewingsController.updateViewing);

// DELETE /api/viewings/:id
router.delete("/:id", viewingsController.deleteViewing);

export default router;
