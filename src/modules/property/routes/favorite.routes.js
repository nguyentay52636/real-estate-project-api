import express from 'express';
import favoriteController from '#modules/property/controllers/favoriteController.js';

const router = express.Router();

// GET /api/favorites/user/:userId
router.get(
  "/user/:userId",
  favoriteController.getFavoritesByUser
);
router.get("/", favoriteController.getAllFavorites);
// POST /api/favorites
router.post("/", favoriteController.createFavorite);

// DELETE /api/favorites
router.delete("/", favoriteController.deleteFavorite);

export default router;
