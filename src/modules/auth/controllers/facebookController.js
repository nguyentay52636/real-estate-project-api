import passport from '#config/passport.js';
import RefreshToken from '#models/RefreshToken.js';
import { generateAccessToken, generateRefreshToken } from '#shared/utils/jwt.js';
import { getPrimaryClientUrl } from '#shared/utils/corsOrigins.js';
import {
  createOAuthExchangeCode,
  consumeOAuthExchangeCode,
} from '#modules/auth/services/oauthExchangeStore.js';

// Kiểm tra Facebook credentials có sẵn không (dùng Boolean để tránh gán nhầm string App Secret)
const hasFacebookCredentials = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

const REFRESH_COOKIE_MS = 30 * 24 * 60 * 60 * 1000;

function toPublicUser(user) {
  const raw = user?._doc || user || {};
  return {
    _id: raw._id,
    ten: raw.ten,
    tenDangNhap: raw.tenDangNhap,
    anhDaiDien: raw.anhDaiDien,
    vaiTro: raw.vaiTro,
    facebookId: raw.facebookId || undefined,
  };
}

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
        const clientUrl = getPrimaryClientUrl();
        if (!hasFacebookCredentials) {
            return res.redirect(`${clientUrl}/failure?error=facebook_not_configured`);
        }
        
        try {
            return passport.authenticate('facebook', {
                failureRedirect: `${clientUrl}/failure?error=facebook_auth_failed`,
                session: true
            })(req, res, next);
        } catch (error) {
            return res.redirect(`${clientUrl}/failure?error=facebook_strategy_error`);
        }
    },

    success: async (req, res) => {
        const clientUrl = getPrimaryClientUrl();
        try {
            if (!req.user) {
                console.error('Facebook success but no user in request');
                return res.redirect(`${clientUrl}/failure?error=no_user_data`);
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
                maxAge: REFRESH_COOKIE_MS,
            });

            // Không đưa accessToken lên query — FE đổi code một lần qua POST /api/auth/oauth/exchange
            const code = createOAuthExchangeCode({
                accessToken,
                user: toPublicUser(user),
                loginType: 'facebook',
            });

            const successUrl = `${clientUrl}/success?code=${encodeURIComponent(code)}&loginType=facebook`;
            return res.redirect(successUrl);

        } catch (error) {
            console.error('Facebook success error:', error);
            return res.redirect(`${clientUrl}/failure?error=token_generation_failed`);
        }
    },

    /**
     * Đổi one-time OAuth code → accessToken + user (dùng 1 lần, TTL ~60s).
     */
    exchangeOAuthCode: (req, res) => {
        const code = req.body?.code || req.query?.code;
        const payload = consumeOAuthExchangeCode(code);
        if (!payload) {
            return res.status(400).json({
                message: 'Mã OAuth không hợp lệ hoặc đã hết hạn',
                error: 'OAUTH_CODE_INVALID',
            });
        }
        return res.status(200).json({
            message: 'OAuth exchange thành công',
            accessToken: payload.accessToken,
            user: payload.user,
            loginType: payload.loginType || 'facebook',
        });
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

    debugFacebookConfig: (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: 'Endpoint này bị tắt ở môi trường production' });
        }

        const config = {
            hasFacebookCredentials: hasFacebookCredentials,
            appId: process.env.FACEBOOK_APP_ID ? 'Configured' : 'Missing',
            appSecret: process.env.FACEBOOK_APP_SECRET ? 'Configured' : 'Missing',
            baseUrl: process.env.BASE_URL || 'http://localhost:8000',
            clientUrl: getPrimaryClientUrl(),
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
