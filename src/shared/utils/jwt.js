import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, vaiTro: user.vaiTro },
    process.env.JWT_ACCESS_KEY,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, vaiTro: user.vaiTro },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "365d" }
  );
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
