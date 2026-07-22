import FavoriteModel from '#models/Favorite.js';
import { AppError } from '#shared/errors/AppError.js';

function parsePagination({ page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

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
    try {
      if (typeof Favorite.create === 'function') {
        return await Favorite.create({ nguoiDungId, batDongSanId });
      }
      const favorite = new Favorite({ nguoiDungId, batDongSanId });
      await favorite.save();
      return favorite;
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError('Already in favorites', 400);
      }
      throw err;
    }
  }

  async function getFavoritesByUser(userId, query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const filter = { nguoiDungId: userId };
    const [data, total] = await Promise.all([
      Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Favorite.countDocuments(filter),
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

  async function getAllFavorites(query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Favorite.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Favorite.countDocuments(),
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
