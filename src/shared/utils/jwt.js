import jwt from 'jsonwebtoken';

/**
 * secrets có thể truyền vào (test) hoặc lấy từ process.env (runtime).
 */
export const generateAccessToken = (user, secret = process.env.JWT_ACCESS_KEY) => {
  return jwt.sign(
    { id: user._id ?? user.id, vaiTro: user.vaiTro },
    secret,
    { expiresIn: '15m' },
  );
};

export const generateRefreshToken = (user, secret = process.env.JWT_REFRESH_SECRET) => {
  return jwt.sign(
    { id: user._id ?? user.id, vaiTro: user.vaiTro },
    secret,
    { expiresIn: '365d' },
  );
};

export const verifyRefreshToken = (token, secret = process.env.JWT_REFRESH_SECRET) => {
  return jwt.verify(token, secret);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
