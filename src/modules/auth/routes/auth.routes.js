import express from 'express';
import authController from '#modules/auth/controllers/authController.js';
import middlewareController from '#shared/middleware/auth.js';
import facebookController from '#modules/auth/controllers/facebookController.js';

const router = express.Router();

// POST /auth/register
router.post("/register", authController.register);

// POST /auth/login
router.post("/login", authController.login);

// POST /auth/logout
router.post("/logout", authController.userLogout);
    
// POST /auth/forgot-password
router.post("/forgotPassword", authController.forgotPassword);

// POST /auth/reset-password
router.post("/resetPassword", authController.resetPassword);

// Facebook login routes
router.get('/facebook', facebookController.loginFacebook);
router.get('/facebook/callback', facebookController.facebookCallback, facebookController.success);

// New status endpoint
router.get('/user', facebookController.userInfo);

// Facebook debug endpoints
router.get('/facebook/debug', facebookController.debugFacebookConfig);
router.get('/facebook/test', facebookController.testFacebookApi);

export default router;
