import express from 'express';
import authController from '#modules/auth/controllers/authController.js';
import middlewareController from '#shared/middleware/auth.js';
import facebookController from '#modules/auth/controllers/facebookController.js';
import { authRateLimiter } from '#shared/middleware/rateLimit.js';

const router = express.Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.userLogout);

/** Quên mật khẩu — gửi email (PATCH khuyến nghị) */
router.patch('/forgot-password', authRateLimiter, authController.forgotPassword);
/** Alias cũ */
router.post('/forgotPassword', authRateLimiter, authController.forgotPassword);

/** Đặt lại mật khẩu bằng token email (PATCH khuyến nghị) */
router.patch('/reset-password', authRateLimiter, authController.resetPassword);
/** Alias cũ */
router.post('/resetPassword', authRateLimiter, authController.resetPassword);

/** Đổi mật khẩu — cần đăng nhập */
router.patch('/password', middlewareController.verifyToken, authController.changePassword);

router.get('/facebook', facebookController.loginFacebook);
router.get('/facebook/callback', facebookController.facebookCallback, facebookController.success);
router.get('/user', facebookController.userInfo);
router.get('/facebook/debug', facebookController.debugFacebookConfig);
router.get('/facebook/test', facebookController.testFacebookApi);

export default router;
