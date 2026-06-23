const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

function authMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Yêu cầu xác thực'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_KEY);
    socket.user = { id: decoded.id, vaiTro: decoded.vaiTro };
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError' ? 'jwt expired' : 'Xác thực không hợp lệ';
    logger.error('Socket auth failed:', error.message);
    next(new Error(message));
  }
}

module.exports = { authMiddleware };
