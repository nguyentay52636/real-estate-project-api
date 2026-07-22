import express from 'express';
import viewingsController from '#modules/property/controllers/viewingsController.js';
import middlewareController from '#shared/middleware/auth.js';
import { attachAuthUser } from '#shared/middleware/attachAuthUser.js';

const router = express.Router();

router.use(middlewareController.verifyToken, attachAuthUser);

router.get('/', viewingsController.getAllViewings);
router.get('/:id', viewingsController.getViewingById);
router.post('/', viewingsController.createViewing);
router.put('/:id', viewingsController.updateViewing);
router.delete('/:id', viewingsController.deleteViewing);

export default router;
