import jwt from 'jsonwebtoken';
import NguoiDung from '#models/User.js';
import VaiTro from '#models/Role.js';

async function isAdminUser(userId) {
  const adminRole = await VaiTro.findOne({ ten: "admin" });
  if (!adminRole) return false;
  const user = await NguoiDung.findOne({ _id: userId, vaiTro: adminRole._id });
  return Boolean(user);
}

const middlewareController = {
  verifyToken: (req, res, next) => {
    let token = req.headers.token || req.headers.authorization;

    if (token) {
      token = token.replace(/bearer\s+/gi, "").trim();

      jwt.verify(token, process.env.JWT_ACCESS_KEY, (error, userData) => {
        if (error) {
          return res.status(403).json("Token không hợp lệ");
        }
        req.user = userData;
        next();
      });
    } else {
      res.status(401).json("Bạn chưa đăng nhập");
    }
  },

  verifyTokenAndAdminAuth: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (req.user.vaiTro === "admin" || req.user.id === req.params.id) {
        next();
      } else {
        res.status(403).json("You are not allowed to delete other!");
      }
    });
  },

  verifyAdmin: (req, res, next) => {
    middlewareController.verifyToken(req, res, async () => {
      try {
        const admin = await isAdminUser(req.user.id);
        if (!admin) {
          return res.status(403).json({ message: "Chỉ admin mới có quyền truy cập" });
        }
        next();
      } catch (error) {
        return res.status(500).json({ message: "Lỗi xác thực admin", error: error.message });
      }
    });
  },
};

export default middlewareController;
