import FavoriteModel from '#models/Favorite.js';
import { AppError } from '#shared/errors/AppError.js';

export function createFavoriteService(deps = {}) {
  const Favorite = deps.Favorite ?? FavoriteModel;

  async function addFavorite({ nguoiDungId, batDongSanId }) {
    if (!nguoiDungId || !batDongSanId) {
      throw new AppError('Missing user ID or property ID', 400);
    }
    const existing = await Favorite.findOne({ nguoiDungId, batDongSanId });
    if (existing) {
      throw new AppError('Already in favorites', 400);
    }
    const favorite = new Favorite({ nguoiDungId, batDongSanId });
    await favorite.save();
    return favorite;
  }

  async function getFavoritesByUser(userId) {
    return Favorite.find({ nguoiDungId: userId });
  }

  async function getAllFavorites() {
    return Favorite.find();
  }

  async function removeFavorite({ nguoiDungId, batDongSanId }) {
    const deleted = await Favorite.findOneAndDelete({ nguoiDungId, batDongSanId });
    if (!deleted) {
      throw new AppError('Favorite not found', 404);
    }
    return deleted;
  }

  return { addFavorite, getFavoritesByUser, getAllFavorites, removeFavorite };
}

const favoriteService = createFavoriteService();
export default favoriteService;
