import mongoose from 'mongoose';
import ReviewModel from '#models/Rating.js';
import UserModel from '#models/User.js';
import PropertyModel from '#models/Property.js';
import { AppError } from '#shared/errors/AppError.js';

const USER_FIELDS = 'ten anhDaiDien email';
const PROPERTY_FIELDS = 'tieuDe slug anhDaiDien gia';

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export function createReviewService(deps = {}) {
  const Review = deps.Review ?? ReviewModel;
  const User = deps.User ?? UserModel;
  const Property = deps.Property ?? PropertyModel;

  async function getAllReviews(query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Review.find()
        .populate('nguoiDungId', USER_FIELDS)
        .populate('batDongSanId', PROPERTY_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        ,
      Review.countDocuments(),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function getReviewById(id) {
    const review = await Review.findById(id)
      .populate('nguoiDungId', USER_FIELDS)
      .populate('batDongSanId', PROPERTY_FIELDS)
      ;
    if (!review) throw new AppError('Review not found', 404);
    return review;
  }

  async function getReviewsByProperty(propertyId, query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const filter = { batDongSanId: propertyId };
    const [data, total] = await Promise.all([
      Review.find(filter)
        .populate('nguoiDungId', USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        ,
      Review.countDocuments(filter),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function getReviewsByUser(userId, query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const filter = { nguoiDungId: userId };
    const [data, total] = await Promise.all([
      Review.find(filter)
        .populate('batDongSanId', PROPERTY_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        ,
      Review.countDocuments(filter),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function createReview(input) {
    const { soSao, binhLuan, nguoiDungId, batDongSanId } = input;

    const userData = await User.findById(nguoiDungId).select('_id');
    if (!userData) throw new AppError('User not found', 404);

    const propertyData = await Property.findById(batDongSanId).select('_id');
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
