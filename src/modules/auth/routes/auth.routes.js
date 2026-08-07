import express from 'express';
import authController from '#modules/auth/controllers/authController.js';
import middlewareController from '#shared/middleware/auth.js';
import facebookController from '#modules/auth/controllers/facebookController.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  oauthRateLimiter,
} from '#shared/middleware/rateLimit.js';

const router = express.Router();

router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', loginRateLimiter, authController.requestRefreshToken);
router.post('/logout', authController.userLogout);

/** Quên mật khẩu — gửi email (PATCH khuyến nghị) */
router.patch('/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
/** Alias cũ */
router.post('/forgotPassword', passwordResetRateLimiter, authController.forgotPassword);

/** Đặt lại mật khẩu bằng token email (PATCH khuyến nghị) */
router.patch('/reset-password', passwordResetRateLimiter, authController.resetPassword);
/** Alias cũ */
router.post('/resetPassword', passwordResetRateLimiter, authController.resetPassword);

/** Đổi mật khẩu — cần đăng nhập */
router.patch(
  '/password',
  middlewareController.verifyToken,
  passwordResetRateLimiter,
  authController.changePassword,
);

router.get('/facebook', oauthRateLimiter, facebookController.loginFacebook);
router.get(
  '/facebook/callback',
  oauthRateLimiter,
  facebookController.facebookCallback,
  facebookController.success,
);
/** Đổi one-time code sau Facebook login → accessToken (không còn token trên URL) */
router.post('/oauth/exchange', oauthRateLimiter, facebookController.exchangeOAuthCode);
router.get('/user', facebookController.userInfo);
router.get('/facebook/debug', oauthRateLimiter, facebookController.debugFacebookConfig);
router.get('/facebook/test', oauthRateLimiter, facebookController.testFacebookApi);

export default router;
