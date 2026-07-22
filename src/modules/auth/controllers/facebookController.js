import passport from '#config/passport.js';
import RefreshToken from '#models/RefreshToken.js';
import { generateAccessToken, generateRefreshToken } from '#shared/utils/jwt.js';
import https from 'https';

// Kiểm tra Facebook credentials có sẵn không (dùng Boolean để tránh gán nhầm string App Secret)
const hasFacebookCredentials = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

const authController = {
    loginFacebook: (req, res, next) => {
        if (!hasFacebookCredentials) {
            return res.status(503).json({
                message: 'Facebook login chưa được cấu hình',
                error: 'FACEBOOK_NOT_CONFIGURED',
                instructions: [
                    '1. Tạo Facebook App tại https://developers.facebook.com',
                    '2. Thêm FACEBOOK_APP_ID và FACEBOOK_APP_SECRET vào file .env',
                    '3. Restart server'
                ]
            });
        }
        
        // Kiểm tra xem strategy có tồn tại không
        try {
            return passport.authenticate('facebook', { 
                scope: ['email', 'public_profile'] 
            })(req, res, next);
        } catch (error) {
            return res.status(503).json({
                message: 'Facebook strategy chưa được khởi tạo',
                error: 'FACEBOOK_STRATEGY_NOT_INITIALIZED',
                details: error.message
            });
        }
    },

    facebookCallback: (req, res, next) => {
        if (!hasFacebookCredentials) {
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/failure?error=facebook_not_configured`);
        }
        
        try {
            return passport.authenticate('facebook', {
                failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/failure?error=facebook_auth_failed`,
                session: true
            })(req, res, next);
        } catch (error) {
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/failure?error=facebook_strategy_error`);
        }
    },

    success: async (req, res) => {
        try {
            if (!req.user) {
                console.error('Facebook success but no user in request');
                return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/failure?error=no_user_data`);
            }

            const user = req.user;
            console.log('Facebook login success for user:', user.tenDangNhap);
            
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            await RefreshToken.create({ 
                token: refreshToken, 
                userId: user._id 
            });

     
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: "lax",
                maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
            });

            // Redirect về frontend với access token và user info
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const successUrl = `${clientUrl}/success?accessToken=${accessToken}&name=${encodeURIComponent(user.ten)}&userId=${user._id}&loginType=facebook`;
            
            console.log('Redirecting to:', successUrl);
            return res.redirect(successUrl);

        } catch (error) {
            console.error('Facebook success error:', error);
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            return res.redirect(`${clientUrl}/failure?error=token_generation_failed&message=${encodeURIComponent(error.message)}`);
        }
    },

    userInfo: (req, res) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Not logged in',
                error: 'USER_NOT_AUTHENTICATED'
            });
        }
        
        const { matKhau, ...userInfo } = req.user._doc || req.user;
        res.json({ 
            message: 'User info retrieved successfully',
            user: userInfo,
            isFacebookUser: !!userInfo.facebookId
        });
    },

    // Method để handle Facebook login errors
    handleError: (req, res) => {
        const error = req.query.error || 'unknown_error';
        const message = req.query.message || 'Facebook login failed';
        
        console.error('Facebook login error:', { error, message });
        
        return res.status(400).json({
            message: 'Facebook login failed',
            error: error,
            details: message
        });
    },

    // Debug endpoint để check Facebook app configuration (chỉ hiển thị status, không lộ App Secret)
    debugFacebookConfig: (req, res) => {
        const config = {
            hasFacebookCredentials: hasFacebookCredentials,
            appId: process.env.FACEBOOK_APP_ID ? 'Configured' : 'Missing',
            appSecret: process.env.FACEBOOK_APP_SECRET ? 'Configured' : 'Missing',
            baseUrl: process.env.BASE_URL || 'http://localhost:8000',
            clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
            nodeEnv: process.env.NODE_ENV || 'development',
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:8000'}/api/auth/facebook/callback`,
            status: hasFacebookCredentials ? 'READY' : 'NOT_CONFIGURED',
        };

        return res.json({
            message: 'Facebook configuration debug info',
            timestamp: new Date().toISOString(),
            config: config
        });
    },

    // Test endpoint để kiểm tra Facebook API
    testFacebookApi: async (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: 'Endpoint này bị tắt ở môi trường production' });
        }
        if (!hasFacebookCredentials) {
            return res.status(400).json({
                message: 'Facebook credentials not configured',
                error: 'FACEBOOK_NOT_CONFIGURED'
            });
        }

        return res.json({
            message: 'Facebook API test endpoint',
            appId: process.env.FACEBOOK_APP_ID,
            status: 'READY'
        });
    }
};

export default authController;
