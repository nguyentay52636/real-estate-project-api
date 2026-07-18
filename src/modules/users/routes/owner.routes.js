import express from 'express';
import { getOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  deleteOwner, } from '#modules/users/controllers/ownerController.js';
import behaviorTrackingController from '#modules/property/controllers/behaviorTrackingController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';

const router = express.Router();

const ownerAuth = authorizeRoles('chu_tro', 'nhan_vien', 'admin');

// ── Analytics / Lead (đặt TRƯỚC /:id) ──────────────────────────
router.get(
  '/properties/:id/behaviors',
  ownerAuth,
  behaviorTrackingController.getBehaviors,
);

router.get(
  '/properties/:id/leads',
  ownerAuth,
  behaviorTrackingController.getLeads,
);

router.get(
  '/properties/:id/analytics',
  ownerAuth,
  behaviorTrackingController.getAnalytics,
);

router.patch(
  '/leads/:id/status',
  ownerAuth,
  behaviorTrackingController.updateLeadStatus,
);

router.patch(
  '/leads/:id/note',
  ownerAuth,
  behaviorTrackingController.updateLeadNote,
);

// ── CRUD hồ sơ ChuNha ──────────────────────────────────────────
router.get("/", getOwners);
router.get("/:id", getOwnerById);
router.post("/", createOwner);
router.put("/:id", updateOwner);
router.delete("/:id", deleteOwner);

export default router;
