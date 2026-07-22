import favoriteService from '#modules/property/services/favoriteService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';
import { AppError } from '#shared/errors/AppError.js';

function assertCanAccessUserFavorites(actor, targetUserId) {
  if (actor.isStaff) return;
  if (String(actor.id) === String(targetUserId)) return;
  throw new AppError('Không có quyền xem danh sách yêu thích của người dùng này', 403);
}

const favoriteController = {
  /** Danh sách yêu thích của user đang đăng nhập */
  getMyFavorites: asyncHandler(async (req, res) => {
    const result = await favoriteService.getFavoritesByUser(req.authUser.id, req.query);
    return res.status(200).json(result);
  }),

  createFavorite: asyncHandler(async (req, res) => {
    const batDongSanId = req.body.batDongSanId;
    const favorite = await favoriteService.addFavorite({
      nguoiDungId: req.authUser.id,
      batDongSanId,
    });
    return res.status(201).json({ message: 'Added to favorites', favorite });
  }),

  getFavoritesByUser: asyncHandler(async (req, res) => {
    assertCanAccessUserFavorites(req.authUser, req.params.userId);
    const result = await favoriteService.getFavoritesByUser(req.params.userId, req.query);
    return res.status(200).json(result);
  }),

  deleteFavorite: asyncHandler(async (req, res) => {
    await favoriteService.removeFavorite({
      nguoiDungId: req.authUser.id,
      batDongSanId: req.body.batDongSanId,
    });
    return res.status(200).json({ message: 'Removed from favorites' });
  }),
};

export default favoriteController;
