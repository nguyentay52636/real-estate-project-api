// routes/property.js
import express from 'express';
import propertyController from '#modules/property/controllers/propertyController.js';

const router = express.Router();

router.get("/", propertyController.getAllProperty);

// GET /api/property/slug/:slug    — Lấy chi tiết theo slug (SEO URL)
router.get("/slug/:slug", propertyController.getPropertyBySlug);

// GET /api/property/district/:district — Lấy theo quận/huyện
router.get("/district/:district", propertyController.getPropertiesByDistrict);

// GET /api/property/user/:userId  — Lấy theo chủ sở hữu
router.get("/user/:userId", propertyController.getPropertiesByUser);

// GET /api/property/:id/author — Tác giả (người đăng bài) + vai trò
router.get("/:id/author", propertyController.getPropertyAuthor);

// GET /api/property/:id/related — Bất động sản liên quan (gợi ý)
router.get("/:id/related", propertyController.getRelatedProperties);

router.get("/:id", propertyController.getPropertyById);

export default router;
