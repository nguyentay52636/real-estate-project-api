import Favorite from '#models/Favorite.js';

const favoriteController = {
  // Thêm vào yêu thích
  createFavorite: async (req, res) => {
    try {
      const { nguoiDungId, batDongSanId } = req.body;
      if (!nguoiDungId || !batDongSanId) {
        return res
          .status(400)
          .json({ message: "Missing user ID or property ID" });
      }
      const existingFavoriteData = await Favorite.findOne({
        nguoiDungId,
        batDongSanId,
      });
      if (existingFavoriteData) {
        return res.status(400).json({ message: "Already in favorites" });
      }
      const newFavoriteData = new Favorite({
        nguoiDungId,
        batDongSanId,
      });
      await newFavoriteData.save();
      return res
        .status(201)
        .json({ message: "Added to favorites", favorite: newFavoriteData });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  // Lấy yêu thích theo user
  getFavoritesByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const userFavorites = await Favorite.find({ nguoiDungId: userId });
      return res.status(200).json(userFavorites);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  getAllFavorites: async (req, res) => {
    try {
      const allFavorites = await Favorite.find();
      return res.status(200).json(allFavorites);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Xoá khỏi yêu thích
  deleteFavorite: async (req, res) => {
    try {
      const { nguoiDungId, batDongSanId } = req.body;
      const deletedFavoriteData = await Favorite.findOneAndDelete({
        nguoiDungId,
        batDongSanId,
      });
      if (!deletedFavoriteData) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      return res.status(200).json({ message: "Removed from favorites" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
};

export default favoriteController;
