import jwt from 'jsonwebtoken';

/**
 * secrets có thể truyền vào (test) hoặc lấy từ process.env (runtime).
 * Thời hạn có thể override bằng JWT_ACCESS_EXPIRES / JWT_REFRESH_EXPIRES.
 */
export const generateAccessToken = (
  user,
  secret = process.env.JWT_ACCESS_KEY,
  expiresIn = process.env.JWT_ACCESS_EXPIRES || '7d',
) => {
  return jwt.sign(
    { id: user._id ?? user.id, vaiTro: user.vaiTro },
    secret,
    { expiresIn },
  );
};

export const generateRefreshToken = (
  user,
  secret = process.env.JWT_REFRESH_SECRET,
  expiresIn = process.env.JWT_REFRESH_EXPIRES || '365d',
) => {
  return jwt.sign(
    { id: user._id ?? user.id, vaiTro: user.vaiTro },
    secret,
    { expiresIn },
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
