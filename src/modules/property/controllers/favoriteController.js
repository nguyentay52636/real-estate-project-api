import favoriteService from '#modules/property/services/favoriteService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const favoriteController = {
  createFavorite: asyncHandler(async (req, res) => {
    const favorite = await favoriteService.addFavorite(req.body);
    return res.status(201).json({ message: 'Added to favorites', favorite });
  }),

  getFavoritesByUser: asyncHandler(async (req, res) => {
    const result = await favoriteService.getFavoritesByUser(req.params.userId, req.query);
    return res.status(200).json(result);
  }),

  getAllFavorites: asyncHandler(async (req, res) => {
    const result = await favoriteService.getAllFavorites(req.query);
    return res.status(200).json(result);
  }),

  deleteFavorite: asyncHandler(async (req, res) => {
    await favoriteService.removeFavorite(req.body);
    return res.status(200).json({ message: 'Removed from favorites' });
  }),
};

export default favoriteController;
