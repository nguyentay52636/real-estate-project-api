// routes/property.js
import express from 'express';
import propertyController from '#modules/property/controllers/propertyController.js';
import behaviorTrackingController from '#modules/property/controllers/behaviorTrackingController.js';
import { optionalAuth } from '#shared/middleware/optionalAuth.js';

const router = express.Router();

router.get("/", propertyController.getAllProperty);

// GET /api/property/slug/:slug    — Lấy chi tiết theo slug (SEO URL)
router.get("/slug/:slug", propertyController.getPropertyBySlug);

// GET /api/property/district/:district — Lấy theo quận/huyện
router.get("/district/:district", propertyController.getPropertiesByDistrict);

// GET /api/property/user/:userId  — Lấy theo chủ sở hữu
router.get("/user/:userId", propertyController.getPropertiesByUser);

// POST /api/property/:id/behavior — ghi nhận hành vi (guest cần sessionId)
router.post(
  "/:id/behavior",
  optionalAuth,
  behaviorTrackingController.trackBehavior,
);

// GET /api/property/:id/author — Tác giả (người đăng bài) + vai trò
router.get("/:id/author", propertyController.getPropertyAuthor);

// GET /api/property/:id/related — Bất động sản liên quan (gợi ý)
router.get("/:id/related", propertyController.getRelatedProperties);

router.get("/:id", propertyController.getPropertyById);

export default router;
