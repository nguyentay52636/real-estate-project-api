/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Form hỗ trợ / liên hệ (LienHe)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LienHe:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         chuDe:
 *           type: string
 *           example: Thông tin chung
 *         hoTen:
 *           type: string
 *           example: Nguyễn Văn A
 *         soDienThoai:
 *           type: string
 *           example: "0912345678"
 *         email:
 *           type: string
 *           example: a@example.com
 *         noiDung:
 *           type: string
 *           example: Tôi cần hỗ trợ về tài khoản...
 *         nguoiDungId:
 *           type: string
 *           nullable: true
 *           description: Gắn nếu gửi khi đã đăng nhập
 *         trangThai:
 *           type: string
 *           enum: [moi, dang_xu_ly, da_phan_hoi, da_dong]
 *         ghiChuNoiBo:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Gửi form hỗ trợ (public)
 *     description: |
 *       Không bắt buộc đăng nhập. Có JWT thì lưu nguoiDungId.
 *       Phản hồi cam kết trong 24 giờ làm việc (xử lý thủ công bởi staff).
 *     tags: [Contact]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chuDe, hoTen, soDienThoai, email, noiDung]
 *             properties:
 *               chuDe:
 *                 type: string
 *                 example: Thông tin chung
 *               hoTen:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               soDienThoai:
 *                 type: string
 *                 example: "0912345678"
 *               email:
 *                 type: string
 *                 example: a@example.com
 *               noiDung:
 *                 type: string
 *                 example: Tôi cần hỗ trợ về tài khoản...
 *     responses:
 *       201:
 *         description: Gửi liên hệ thành công
 *       400:
 *         description: Thiếu field hoặc email không hợp lệ
 *   get:
 *     summary: Danh sách liên hệ (admin / nhân viên)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [moi, dang_xu_ly, da_phan_hoi, da_dong]
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Tìm theo họ tên / SĐT / email / chủ đề
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách liên hệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */

/**
 * @swagger
 * /api/contact/{id}:
 *   get:
 *     summary: Chi tiết liên hệ
 *     tags: [Contact]
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
 *         description: Chi tiết liên hệ
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/contact/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái liên hệ
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trangThai]
 *             properties:
 *               trangThai:
 *                 type: string
 *                 enum: [moi, dang_xu_ly, da_phan_hoi, da_dong]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Trạng thái không hợp lệ
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/contact/{id}/note:
 *   patch:
 *     summary: Cập nhật ghi chú nội bộ
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ghiChuNoiBo]
 *             properties:
 *               ghiChuNoiBo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật ghi chú thành công
 *       404:
 *         description: Không tìm thấy
 */
