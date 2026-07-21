import jwt from 'jsonwebtoken';
import NguoiDung from '#models/User.js';
import VaiTro from '#models/Role.js';

async function isAdminUser(userId) {
  // BE Role enum: admin | nhan_vien | nguoi_thue | chu_tro
  // (quan_tri_vien giữ tương thích nếu DB còn dữ liệu cũ)
  const adminRoles = await VaiTro.find({
    ten: { $in: ["admin", "quan_tri_vien"] },
  }).select("_id");
  if (!adminRoles.length) return false;
  const user = await NguoiDung.findOne({
    _id: userId,
    vaiTro: { $in: adminRoles.map((r) => r._id) },
  });
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
    middlewareController.verifyToken(req, res, async () => {
      if (req.user.id === req.params.id) {
        return next();
      }
      // req.user.vaiTro trong JWT là object { _id, ten, ... } chứ không phải
      // string, nên so sánh trực tiếp với "admin" luôn sai — tra lại DB cho chắc
      // (giống verifyAdmin), tránh vừa chặn nhầm admin thật vừa tránh tin vào
      // claim có thể lỗi thời trong token.
      try {
        const admin = await isAdminUser(req.user.id);
        if (admin) {
          return next();
        }
        res.status(403).json({
          message: "Chỉ admin mới được xóa tài khoản của người khác",
        });
      } catch (error) {
        res.status(500).json({ message: "Lỗi xác thực admin", error: error.message });
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
