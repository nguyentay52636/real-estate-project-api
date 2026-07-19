import Joi from 'joi';

// Đăng ký công khai (không cần đăng nhập) — CHỈ cho phép tự chọn role khách hàng.
// 'admin'/'nhan_vien' là role nội bộ, phải được admin cấp riêng (xem tạo tài khoản
// nhân viên trong quản trị), không được để client tự gán qua form đăng ký công khai.
const SELF_SERVICE_ROLES = ["nguoi_thue", "chu_tro"];

const registerValidation = (data) => {
  const schema = Joi.object({
    ten: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    tenDangNhap: Joi.string().required(),
    matKhau: Joi.string().min(6).required(),
    xacNhanMatKhau: Joi.any().valid(Joi.ref("matKhau")).required().messages({
      "any.only": "Mật khẩu xác nhận không khớp",
    }),
    soDienThoai: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .required(),
    vaiTro: Joi.string().valid(...SELF_SERVICE_ROLES).default("nguoi_thue"),
  });

  return schema.validate(data);
};

// Admin tạo tài khoản qua /api/user (route đã khoá verifyAdmin) — được phép gán
// đủ 4 role, khác với registerValidation (đăng ký công khai, chỉ role khách hàng).
const adminCreateUserValidation = (data) => {
  const schema = Joi.object({
    ten: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    tenDangNhap: Joi.string().required(),
    matKhau: Joi.string().min(6).required(),
    soDienThoai: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .required(),
    vaiTro: Joi.string().valid("admin", "nhan_vien", "nguoi_thue", "chu_tro").default("nguoi_thue"),
    anhDaiDien: Joi.string().allow('').optional(),
    trangThai: Joi.string().valid("hoat_dong", "khoa").default("hoat_dong"),
  });

  return schema.validate(data);
};

const loginValidation = (data) => {
  const schema = Joi.object({
    tenDangNhap: Joi.string().required(),
    matKhau: Joi.string().required(),
  });

  return schema.validate(data);
};

// Validation cho Facebook user creation - lỏng hơn validation thông thường
const facebookUserValidation = (data) => {
  const schema = Joi.object({
    ten: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    tenDangNhap: Joi.string().min(3).max(50).required(),
    matKhau: Joi.string().min(1).required(), // Facebook login không cần password mạnh
    facebookId: Joi.string().required(),
    vaiTro: Joi.string().required(),
    anhDaiDien: Joi.string().allow('').optional(),
    trangThai: Joi.string().valid("hoat_dong", "khoa").default("hoat_dong"),
    soDienThoai: Joi.string().allow('').optional() // Facebook login có thể không có số điện thoại
  });

  return schema.validate(data);
};

export { registerValidation, adminCreateUserValidation, loginValidation, facebookUserValidation, SELF_SERVICE_ROLES };
export default { registerValidation, adminCreateUserValidation, loginValidation, facebookUserValidation, SELF_SERVICE_ROLES };