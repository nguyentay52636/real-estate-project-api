import favoriteService from '#modules/property/services/favoriteService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const favoriteController = {
  createFavorite: asyncHandler(async (req, res) => {
    const favorite = await favoriteService.addFavorite(req.body);
    return res.status(201).json({ message: 'Added to favorites', favorite });
  }),

  getFavoritesByUser: asyncHandler(async (req, res) => {
    const favorites = await favoriteService.getFavoritesByUser(req.params.userId);
    return res.status(200).json(favorites);
  }),

  getAllFavorites: asyncHandler(async (req, res) => {
    const favorites = await favoriteService.getAllFavorites();
    return res.status(200).json(favorites);
  }),

  deleteFavorite: asyncHandler(async (req, res) => {
    await favoriteService.removeFavorite(req.body);
    return res.status(200).json({ message: 'Removed from favorites' });
  }),
};

export default favoriteController;
