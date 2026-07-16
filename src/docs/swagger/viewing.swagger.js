/**
 * @swagger
 * tags:
 *   name: Viewing
 *   description: API quản lý lịch xem nhà
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
 *           description: ID của lịch xem nhà
 *         nguoiDungId:
 *           type: string
 *           description: ID người dùng đặt lịch
 *         batDongSanId:
 *           type: string
 *           description: ID bất động sản
 *         thoiGian:
 *           type: string
 *           format: date-time
 *           description: Thời gian xem nhà
 *         ghiChu:
 *           type: string
 *           description: Ghi chú thêm
 *         trangThai:
 *           type: string
 *           enum: [cho_xac_nhan, da_xac_nhan, da_huy]
 *           description: Trạng thái lịch xem nhà
 */

/**
 * @swagger
 * /api/viewing:
 *   get:
 *     summary: Lấy danh sách tất cả lịch xem nhà
 *     tags: [Viewing]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Viewing'
 *       500:
 *         description: Lỗi server
 *   post:
 *     summary: Tạo lịch xem nhà mới
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
 *               ghiChu:
 *                 type: string
 *               trangThai:
 *                 type: string
 *                 enum: [cho_xac_nhan, da_xac_nhan, da_huy]
 *     responses:
 *       201:
 *         description: Tạo lịch xem nhà thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viewing'
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/viewing/{id}:
 *   get:
 *     summary: Lấy thông tin lịch xem nhà theo ID
 *     tags: [Viewing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của lịch xem nhà
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thành công thông tin lịch xem nhà
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viewing'
 *       404:
 *         description: Không tìm thấy lịch xem nhà
 *       500:
 *         description: Lỗi server
 *   put:
 *     summary: Cập nhật lịch xem nhà
 *     tags: [Viewing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của lịch xem nhà
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
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Viewing'
 *       404:
 *         description: Không tìm thấy lịch xem nhà
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá lịch xem nhà
 *     tags: [Viewing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của lịch xem nhà
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xoá thành công
 *       404:
 *         description: Không tìm thấy lịch xem nhà
 *       500:
 *         description: Lỗi server
 */
