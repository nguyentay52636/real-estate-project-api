import authService from '#modules/auth/services/authService.js';
import {
  registerValidation,
  loginValidation,
} from '#modules/auth/validations/authValidation.js';
import { isAppError } from '#shared/errors/AppError.js';

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
    const { error } = registerValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    try {
      const result = await authService.register(req.body);
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
    const { error } = loginValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);

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

  forgotPassword: async (req, res) => {
    try {
      const { mailResult } = await authService.forgotPassword(req.body.email);
      return res.status(200).json({
        success: true,
        rs: mailResult,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },

  resetPassword: async (req, res) => {
    try {
      await authService.resetPassword(req.body);
      return res.status(200).json({
        success: true,
        mes: 'Password reset successful',
      });
    } catch (err) {
      return sendError(res, err);
    }
  },
};

export default authController;
