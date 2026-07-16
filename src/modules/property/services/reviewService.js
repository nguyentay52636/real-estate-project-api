import mongoose from 'mongoose';
import ReviewModel from '#models/Rating.js';
import UserModel from '#models/User.js';
import PropertyModel from '#models/Property.js';
import { AppError } from '#shared/errors/AppError.js';

export function createReviewService(deps = {}) {
  const Review = deps.Review ?? ReviewModel;
  const User = deps.User ?? UserModel;
  const Property = deps.Property ?? PropertyModel;

  async function getAllReviews() {
    return Review.find().populate('nguoiDungId').populate('batDongSanId');
  }

  async function getReviewById(id) {
    const review = await Review.findById(id)
      .populate('nguoiDungId')
      .populate('batDongSanId');
    if (!review) throw new AppError('Review not found', 404);
    return review;
  }

  async function getReviewsByProperty(propertyId) {
    return Review.find({ batDongSanId: propertyId }).populate('nguoiDungId');
  }

  async function getReviewsByUser(userId) {
    return Review.find({ nguoiDungId: userId }).populate('batDongSanId');
  }

  async function createReview(input) {
    const { soSao, binhLuan, nguoiDungId, batDongSanId } = input;

    const userData = await User.findById(nguoiDungId);
    if (!userData) throw new AppError('User not found', 404);

    const propertyData = await Property.findById(batDongSanId);
    if (!propertyData) throw new AppError('Property not found', 404);

    if (!soSao || !binhLuan || !nguoiDungId || !batDongSanId) {
      throw new AppError('Missing information needed review', 400);
    }

    const review = new Review({ soSao, binhLuan, nguoiDungId, batDongSanId });
    return review.save();
  }

  async function updateReview(id, { soSao, binhLuan }) {
    const updated = await Review.findByIdAndUpdate(id, { soSao, binhLuan }, { new: true });
    if (!updated) throw new AppError('Review not found', 404);
    return updated;
  }

  async function deleteReview(id) {
    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Review not found', 404);
    return deleted;
  }

  async function getRatingStatsByProperty(propertyId) {
    const stats = await Review.aggregate([
      { $match: { batDongSanId: new mongoose.Types.ObjectId(propertyId) } },
      {
        $group: {
          _id: '$batDongSanId',
          avgRating: { $avg: '$soSao' },
          total: { $sum: 1 },
        },
      },
    ]);
    if (stats.length === 0) {
      return { avgRating: 0, total: 0 };
    }
    return stats[0];
  }

  return {
    getAllReviews,
    getReviewById,
    getReviewsByProperty,
    getReviewsByUser,
    createReview,
    updateReview,
    deleteReview,
    getRatingStatsByProperty,
  };
}

const reviewService = createReviewService();
export default reviewService;
