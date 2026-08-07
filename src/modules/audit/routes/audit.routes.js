import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
import { listAdminAudit } from '#modules/audit/controllers/auditController.js';

const router = express.Router();

/** GET /api/audit — admin xem nhật ký (auth, user, deal, …) */
router.get('/', middlewareController.verifyAdmin, listAdminAudit);

export default router;
