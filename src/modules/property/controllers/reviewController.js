import reviewService from '#modules/property/services/reviewService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const reviewController = {
  getAllReviews: asyncHandler(async (req, res) => {
    const result = await reviewService.getAllReviews(req.query);
    return res.status(200).json({
      message: 'get successful review list',
      reviews: result.data,
      pagination: result.pagination,
    });
  }),

  getReviewById: asyncHandler(async (req, res) => {
    const review = await reviewService.getReviewById(req.params.id);
    return res.status(200).json({ message: 'Get review by id successfully', review });
  }),

  getReviewsByProperty: asyncHandler(async (req, res) => {
    const result = await reviewService.getReviewsByProperty(req.params.propertyId, req.query);
    return res.status(200).json({
      message: 'Get review by property successfully',
      reviews: result.data,
      pagination: result.pagination,
    });
  }),

  getReviewsByUser: asyncHandler(async (req, res) => {
    const result = await reviewService.getReviewsByUser(req.params.userId, req.query);
    return res.status(200).json({
      message: 'Get review by user successfully',
      reviews: result.data,
      pagination: result.pagination,
    });
  }),

  createReview: asyncHandler(async (req, res) => {
    const created = await reviewService.createReview(req.body);
    return res.status(201).json({ message: 'Create review successfully', data: created });
  }),

  deleteReview: asyncHandler(async (req, res) => {
    const deleted = await reviewService.deleteReview(req.params.id);
    return res.status(200).json({ message: 'Review deleted successfully', review: deleted });
  }),

  updateReview: asyncHandler(async (req, res) => {
    const updated = await reviewService.updateReview(req.params.id, req.body);
    return res.status(200).json({ message: 'update succesfully', updatedReview: updated });
  }),

  getRatingStatsByProperty: asyncHandler(async (req, res) => {
    const stats = await reviewService.getRatingStatsByProperty(req.params.propertyId);
    return res.status(200).json(stats);
  }),
};

export default reviewController;
