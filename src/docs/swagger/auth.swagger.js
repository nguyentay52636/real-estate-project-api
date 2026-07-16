/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API xác thực người dùng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NguoiDung:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         ten:
 *           type: string
 *         email:
 *           type: string
 *         tenDangNhap:
 *           type: string
 *         matKhau:
 *           type: string
 *         soDienThoai:
 *           type: string
 *         vaiTro:
 *           type: string
 *           description: ObjectId reference to VaiTro
 *         anhDaiDien:
 *           type: string
 *         trangThai:
 *           type: string
 *           enum: [hoat_dong, khoa]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký người dùng mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ten
 *               - email
 *               - tenDangNhap
 *               - matKhau
 *               - xacNhanMatKhau
 *               - soDienThoai
 *             properties:
 *               ten:
 *                 type: string
 *                 minLength: 2
 *                 description: Tên người dùng
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email người dùng (phải là unique)
 *               tenDangNhap:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Tên đăng nhập (phải là unique)
 *               matKhau:
 *                 type: string
 *                 minLength: 6
 *                 format: password
 *                 description: Mật khẩu
 *               xacNhanMatKhau:
 *                 type: string
 *                 format: password
 *                 description: Xác nhận mật khẩu (phải khớp với matKhau)
 *               soDienThoai:
 *                 type: string
 *                 pattern: '^[0-9]{10,11}$'
 *                 description: Số điện thoại (10-11 chữ số)
 *               vaiTro:
 *                 type: string
 *                 enum: [admin, nhan_vien, nguoi_thue, chu_tro]
 *                 default: nguoi_thue
 *                 description: Vai trò người dùng (mặc định là nguoi_thue)
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Register successfully"
 *                 user:
 *                   $ref: '#/components/schemas/NguoiDung'
 *       400:
 *         description: Lỗi validation hoặc dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Mật khẩu xác nhận không khớp"
 *                     - "Email already exists"
 *                     - "Username already exists"
 *                     - "Validation error message"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: object
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenDangNhap
 *               - matKhau
 *             properties:
 *               tenDangNhap:
 *                 type: string
 *                 description: Tên đăng nhập
 *               matKhau:
 *                 type: string
 *                 format: password
 *                 description: Mật khẩu
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   $ref: '#/components/schemas/NguoiDung'
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token cookie
 *             schema:
 *               type: string
 *       400:
 *         description: Lỗi validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Sai tài khoản hoặc mật khẩu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "User not found"
 *                     - "Password is incorrect"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: object
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Logout successfully"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout error"
 *                 error:
 *                   type: object
 */

/**
 * @swagger
 * /api/auth/forgotPassword:
 *   post:
 *     summary: Gửi email đặt lại mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email đã đăng ký tài khoản
 *     responses:
 *       200:
 *         description: Đã gửi email đặt lại mật khẩu (nếu email tồn tại)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rs:
 *                   type: object
 *       404:
 *         description: Không tìm thấy người dùng với email này
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */

/**
 * @swagger
 * /api/auth/resetPassword:
 *   post:
 *     summary: Đặt lại mật khẩu mới bằng token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token đặt lại mật khẩu nhận qua email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Mật khẩu mới
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mes:
 *                   type: string
 *                   example: "Password reset successful"
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "invalid reset token"
 */
