/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: |
 *     Quản lý nhân viên = User có vaiTro nhan_vien.
 *     GET /api/employee trả danh sách user role nhan_vien (kèm nhanVien nếu có hồ sơ).
 *     :id trên GET/PUT/DELETE là userId.
 */

/**
 * @swagger
 * /api/employee:
 *   get:
 *     summary: Danh sách user có vaiTro = nhan_vien
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [hoat_dong, khoa]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách user nhan_vien
 *   post:
 *     summary: Tạo user nhan_vien (+ hồ sơ NhanVien)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ten:
 *                 type: string
 *               email:
 *                 type: string
 *               tenDangNhap:
 *                 type: string
 *               matKhau:
 *                 type: string
 *               soDienThoai:
 *                 type: string
 *               phongBan:
 *                 type: string
 *               chucVu:
 *                 type: string
 *               luong:
 *                 type: number
 *     responses:
 *       201:
 *         description: Tạo thành công — data là user (+ nhanVien)
 */

/**
 * @swagger
 * /api/employee/users:
 *   get:
 *     summary: Alias của GET /api/employee
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách user nhan_vien
 */

/**
 * @swagger
 * /api/employee/search:
 *   get:
 *     summary: Tìm kiếm user nhan_vien
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kết quả
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/employee/{id}:
 *   get:
 *     summary: Chi tiết nhân viên theo userId
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: userId (nguoiDung._id) có role nhan_vien
 *     responses:
 *       200:
 *         description: Chi tiết
 *       404:
 *         description: Không tìm thấy hoặc không phải nhan_vien
 *   put:
 *     summary: Cập nhật user nhan_vien (+ hồ sơ)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa user nhan_vien (+ hồ sơ)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
