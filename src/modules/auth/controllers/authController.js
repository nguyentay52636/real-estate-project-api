import authService from '#modules/auth/services/authService.js';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from '#modules/auth/validations/authValidation.js';
import { isAppError } from '#shared/errors/AppError.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

function sendError(res, err) {
  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }
  return res.status(500).json({ message: 'Server error', error: err?.message || err });
}

const authController = {
  register: async (req, res) => {
    const { error, value } = registerValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    try {
      const result = await authService.register(value);
      return res.status(201).json({
        message: 'Register successfully',
        user: result.user,
        customer: result.customer,
        chuTro: result.chuTro,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },

  login: async (req, res) => {
    const { error, value } = loginValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    try {
      const { user, accessToken, refreshToken } = await authService.login(value);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });

      return res.status(200).json({
        message: 'Login successful',
        user,
        accessToken,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },

  requestRefreshToken: async (req, res) => {
    try {
      const { accessToken, refreshToken } = await authService.refreshAccessToken(
        req.cookies.refreshToken,
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });

      return res.status(200).json({ accessToken });
    } catch (err) {
      if (isAppError(err)) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return res.status(403).json({ message: 'Invalid token', error: err?.message || err });
    }
  },

  userLogout: async (req, res) => {
    try {
      const result = await authService.logout(req.cookies.refreshToken);
      res.clearCookie('refreshToken');
      if (result.alreadyLoggedOut) {
        return res.status(200).json('Already logged out');
      }
      return res.status(200).json('Logout successfully');
    } catch (err) {
      return sendError(res, err);
    }
  },

  /** Quên mật khẩu — gửi email reset (public) */
  forgotPassword: asyncHandler(async (req, res) => {
    const { error, value } = forgotPasswordValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const result = await authService.forgotPassword(value.email);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  /** Đặt lại mật khẩu bằng token từ email (public) */
  resetPassword: asyncHandler(async (req, res) => {
    const { error, value } = resetPasswordValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const result = await authService.resetPassword(value);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  /** Đổi mật khẩu khi đã đăng nhập */
  changePassword: asyncHandler(async (req, res) => {
    const { error, value } = changePasswordValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const result = await authService.changePassword(req.user.id, value);
    res.clearCookie('refreshToken');
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }),
};

export default authController;
