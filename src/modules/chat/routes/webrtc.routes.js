import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
import { getIceServersHandler } from '#modules/chat/controllers/webrtcController.js';

const router = express.Router();

router.use(middlewareController.verifyToken);
router.get('/ice-servers', getIceServersHandler);

export default router;
