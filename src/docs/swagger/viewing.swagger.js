/**
 * @swagger
 * tags:
 *   name: Viewing
 *   description: API quản lý lịch hẹn xem nhà (LichXemNha)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Viewing:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID lịch hẹn
 *         nguoiDungId:
 *           type: object
 *           description: Người đặt lịch (populate + vaiTro)
 *         batDongSanId:
 *           type: object
 *           description: Bất động sản muốn xem
 *         tacGia:
 *           type: object
 *           description: Người đăng bài BĐS (chủ tin / chu_tro) kèm vaiTro
 *         thoiGian:
 *           type: string
 *           format: date-time
 *         ghiChu:
 *           type: string
 *         trangThai:
 *           type: string
 *           enum: [cho_xac_nhan, da_xac_nhan, da_huy]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/viewing:
 *   get:
 *     summary: Lấy danh sách lịch hẹn xem nhà
 *     tags: [Viewing]
 *     parameters:
 *       - in: query
 *         name: nguoiDungId
 *         schema:
 *           type: string
 *         description: Lọc theo người đặt lịch
 *       - in: query
 *         name: batDongSanId
 *         schema:
 *           type: string
 *         description: Lọc theo bất động sản
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [cho_xac_nhan, da_xac_nhan, da_huy]
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
 *         description: Thành công
 *       500:
 *         description: Lỗi server
 *   post:
 *     summary: Đặt lịch hẹn xem nhà
 *     tags: [Viewing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *               - batDongSanId
 *               - thoiGian
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               batDongSanId:
 *                 type: string
 *               thoiGian:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-07-20T09:00:00.000Z"
 *               ghiChu:
 *                 type: string
 *                 example: "Muốn xem vào buổi sáng"
 *               trangThai:
 *                 type: string
 *                 enum: [cho_xac_nhan, da_xac_nhan, da_huy]
 *     responses:
 *       201:
 *         description: Đặt lịch thành công
 *       400:
 *         description: Thiếu dữ liệu hoặc trạng thái không hợp lệ
 *       404:
 *         description: Không tìm thấy user hoặc BĐS
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/viewing/{id}:
 *   get:
 *     summary: Lấy chi tiết lịch hẹn theo ID
 *     tags: [Viewing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy lịch hẹn
 *       500:
 *         description: Lỗi server
 *   put:
 *     summary: Cập nhật lịch hẹn
 *     tags: [Viewing]
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
 *             properties:
 *               thoiGian:
 *                 type: string
 *                 format: date-time
 *               ghiChu:
 *                 type: string
 *               trangThai:
 *                 type: string
 *                 enum: [cho_xac_nhan, da_xac_nhan, da_huy]
 *               batDongSanId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Trạng thái không hợp lệ
 *       404:
 *         description: Không tìm thấy lịch hẹn
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá lịch hẹn
 *     tags: [Viewing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xoá thành công
 *       404:
 *         description: Không tìm thấy lịch hẹn
 *       500:
 *         description: Lỗi server
 */
