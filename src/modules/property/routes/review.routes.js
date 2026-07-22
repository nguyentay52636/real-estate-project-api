import express from 'express';
import reviewController from '#modules/property/controllers/reviewController.js';

import middlewareController from '#shared/middleware/auth.js';

const router = express.Router();

// GET /api/reviews
router.get("/", reviewController.getAllReviews);

// GET /api/reviews/property/:propertyId/stats (phải đặt trước /:id để tránh conflict)
router.get(
  "/property/:propertyId/stats", reviewController.getRatingStatsByProperty);

// GET /api/reviews/property/:propertyId
router.get(
  "/property/:propertyId",reviewController.getReviewsByProperty);

// GET /api/reviews/user/:userId
router.get(
  "/user/:userId",reviewController.getReviewsByUser);

// GET /api/reviews/:id
router.get("/:id",reviewController.getReviewById);

// POST /api/reviews (yêu cầu đăng nhập)
router.post("/", middlewareController.verifyToken, reviewController.createReview); 

// PUT /api/reviews/:id (yêu cầu đăng nhập)
router.put("/:id", middlewareController.verifyToken, reviewController.updateReview); 

// DELETE /api/reviews/:id (yêu cầu đăng nhập)
router.delete("/:id", middlewareController.verifyToken, reviewController.deleteReview); 

export default router;
