import express from 'express';
import favoriteController from '#modules/property/controllers/favoriteController.js';
import middlewareController from '#shared/middleware/auth.js';
import { attachAuthUser } from '#shared/middleware/attachAuthUser.js';

const router = express.Router();

router.use(middlewareController.verifyToken, attachAuthUser);

/** GET /api/favorite — yêu thích của chính mình */
router.get('/', favoriteController.getMyFavorites);

/** GET /api/favorite/user/:userId — chỉ self hoặc staff */
router.get('/user/:userId', favoriteController.getFavoritesByUser);

router.post('/', favoriteController.createFavorite);
router.delete('/', favoriteController.deleteFavorite);

export default router;
