import Review from '../models/Rating.js';
import NguoiDung from '../models/User.js';
import BatDongSan from '../models/Property.js';
import mongoose from 'mongoose';

const reviewController = {
  // Lấy tất cả đánh giá
  getAllReviews: async (req, res) => {
    try {
      const reviewsList = await Review.find()
        .populate("nguoiDungId")
        .populate("batDongSanId");
      return res
        .status(200)
        .json({ message: "get successful review list", reviews: reviewsList });
    } catch (error) {
      return res
        .status(500)
        .json({
          message: "Error while getting review list",
          error: error.message,
        });
    }
  },

  // Lấy đánh giá theo ID
  getReviewById: async (req, res) => {
    try {
      const reviewDetails = await Review.findById(req.params.id)
        .populate("nguoiDungId")
        .populate("batDongSanId");
      if (!reviewDetails)
        return res.status(404).json({ message: "Review not found" });
      return res
        .status(200)
        .json({
          message: "Get review by id successfully",
          review: reviewDetails,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error while getting review by ID", error: error });
    }
  },

  // Lấy đánh giá theo bất động sản
  getReviewsByProperty: async (req, res) => {
    try {
      const propertyReviews = await Review.find({
        batDongSanId: req.params.propertyId,
      }).populate("nguoiDungId");
      return res
        .status(200)
        .json({
          message: "Get review by property successfully",
          reviews: propertyReviews,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error while getting review by Id", error: error });
    }
  },

  // Lấy đánh giá theo user
  getReviewsByUser: async (req, res) => {
    try {
      const userReviews = await Review.find({
        nguoiDungId: req.params.userId,
      }).populate("batDongSanId");
      return res
        .status(200)
        .json({
          message: "Get review by user successfully",
          reviews: userReviews,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error while getting review by User", error: error });
    }
  },

  // Tạo mới đánh giá
  createReview: async (req, res) => {
    try {
      const userData = await NguoiDung.findById(req.body.nguoiDungId);
      if (!userData) return res.status(404).json({ message: "User not found" });
      const propertyData = await BatDongSan.findById(req.body.batDongSanId);
      if (!propertyData)
        return res.status(404).json({ message: "Property not found" });
      const { soSao, binhLuan, nguoiDungId, batDongSanId } = req.body;
      if (!soSao || !binhLuan || !nguoiDungId || !batDongSanId) {
        return res
          .status(400)
          .json({ message: "Missing information needed review" });
      }
      const newReviewData = new Review({
        soSao,
        binhLuan,
        nguoiDungId,
        batDongSanId,
      });
      const createdReview = await newReviewData.save();
      return res
        .status(201)
        .json({ message: "Create review successfully", data: createdReview });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Create review failed", error: error });
    }
  },

  // Xóa đánh giá
  deleteReview: async (req, res) => {
    try {
      const deletedReviewData = await Review.findByIdAndDelete(req.params.id);
      if (!deletedReviewData)
        return res.status(404).json({ message: "Review not found" });
      return res.status(200).json({
        message: "Review deleted successfully",
        review: deletedReviewData,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error deleting review", error: error });
    }
  },

  // Cập nhật đánh giá
  updateReview: async (req, res) => {
    try {
      const { soSao, binhLuan } = req.body;
      const updatedReviewData = await Review.findByIdAndUpdate(
        req.params.id,
        {
          soSao,
          binhLuan,
        },
        { new: true }
      );
      if (!updatedReviewData)
        return res.status(404).json({ message: "Review not found" });
      return res
        .status(200)
        .json({
          message: "update succesfully",
          updatedReview: updatedReviewData,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error updating review", error: error });
    }
  },

  // Lấy thống kê điểm trung bình và tổng số đánh giá cho một bất động sản
  getRatingStatsByProperty: async (req, res) => {
    try {
      const ratingStats = await Review.aggregate([
        {
          $match: {
            batDongSanId: new mongoose.Types.ObjectId(req.params.propertyId),
          },
        },
        {
          $group: {
            _id: "$batDongSanId",
            avgRating: { $avg: "$soSao" },
            total: { $sum: 1 },
          },
        },
      ]);
      if (ratingStats.length === 0) {
        return res.status(200).json({ avgRating: 0, total: 0 });
      }
      return res.status(200).json(ratingStats[0]);
    } catch (error) {
      return res.status(500).json({
        message: "Get rating stats failed",
        error: error.message || error,
      });
    }
  },
};

export default reviewController;
