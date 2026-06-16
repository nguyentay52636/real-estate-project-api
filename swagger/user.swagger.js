/**
 * @swagger
 * tags:
 *   name: User
 *   description: API quản lý người dùng
 */

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NguoiDung'
 *       500:
 *         description: Lỗi server
 *   post:
 *     summary: Tạo người dùng mới
 *     tags: [User]
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
 *               - vaiTro
 *             properties:
 *               ten:
 *                 type: string
 *                 description: Tên người dùng
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email người dùng
 *               tenDangNhap:
 *                 type: string
 *                 description: Tên đăng nhập
 *               matKhau:
 *                 type: string
 *                 description: Mật khẩu
 *               xacNhanMatKhau:
 *                 type: string
 *                 description: Xác nhận mật khẩu
 *               soDienThoai:
 *                 type: string
 *                 description: Số điện thoại
 *               vaiTro:
 *                 type: string
 *                 enum: ["admin", "nhan_vien", "nguoi_thue", "chu_tro"]
 *                 description: Tên vai trò (admin, nhan_vien, nguoi_thue, chu_tro)
 *               anhDaiDien:
 *                 type: string
 *                 description: URL ảnh đại diện
 *                 example: "https://example.com/avatar.jpg"
 *               trangThai:
 *                 type: string
 *                 enum: ["hoat_dong", "khoa"]
 *                 description: Trạng thái người dùng
 *                 default: "hoat_dong"
 *     responses:
 *       201:
 *         description: Tạo người dùng thành công
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
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *                   nullable: true
 *                 chuTro:
 *                   $ref: '#/components/schemas/ChuTro'
 *                   nullable: true
 *                 nhanVien:
 *                   $ref: '#/components/schemas/NhanVien'
 *                   nullable: true
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc email/username đã tồn tại
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Lấy thông tin người dùng theo ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NguoiDung'
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ten:
 *                 type: string
 *                 description: Tên người dùng
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email người dùng
 *               tenDangNhap:
 *                 type: string
 *                 description: Tên đăng nhập
 *               matKhau:
 *                 type: string
 *                 description: Mật khẩu mới (tùy chọn)
 *               soDienThoai:
 *                 type: string
 *                 description: Số điện thoại
 *               vaiTro:
 *                 type: string
 *                 enum: ["admin", "nhan_vien", "nguoi_thue", "chu_tro"]
 *                 description: Tên vai trò (admin, nhan_vien, nguoi_thue, chu_tro)
 *               anhDaiDien:
 *                 type: string
 *                 description: URL ảnh đại diện
 *               trangThai:
 *                 type: string
 *                 enum: ["hoat_dong", "khoa"]
 *                 description: Trạng thái người dùng
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Update user successfully"
 *                 updatedUser:
 *                   $ref: '#/components/schemas/NguoiDung'
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá người dùng theo ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng cần xoá
 *     responses:
 *       200:
 *         description: Xoá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Delete user successfully"
 *                 deletedUser:
 *                   $ref: '#/components/schemas/NguoiDung'
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/user/{id}/avatar/local:
 *   patch:
 *     summary: Cập nhật ảnh đại diện của người dùng lưu trữ cục bộ (local)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng cần cập nhật ảnh đại diện cục bộ
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh đại diện (JPEG, JPG, PNG, GIF, WEBP)
 *     responses:
 *       200:
 *         description: Cập nhật ảnh đại diện thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật ảnh đại diện thành công"
 *                 updatedUser:
 *                   $ref: '#/components/schemas/NguoiDung'
 *       400:
 *         description: File không hợp lệ hoặc thiếu file
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 * 
 * /api/user/{id}/avatar/cloudinary:
 *   patch:
 *     summary: Cập nhật ảnh đại diện của người dùng lên Cloudinary
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng cần cập nhật ảnh đại diện trên Cloudinary
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh đại diện (JPEG, JPG, PNG, GIF, WEBP)
 *     responses:
 *       200:
 *         description: Cập nhật ảnh đại diện lên Cloudinary thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật ảnh đại diện lên Cloudinary thành công"
 *                 updatedUser:
 *                   $ref: '#/components/schemas/NguoiDung'
 *       400:
 *         description: File không hợp lệ hoặc thiếu file
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */

