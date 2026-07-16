/**
 * @swagger
 * tags:
 *   name: Review
 *   description: API quản lý đánh giá bất động sản
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         nguoiDungId:
 *           type: string
 *           description: ID người dùng
 *         batDongSanId:
 *           type: string
 *           description: ID bất động sản
 *         soSao:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         binhLuan:
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
 * /api/review:
 *   get:
 *     summary: Lấy tất cả đánh giá
 *     tags: [Review]
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *   post:
 *     summary: Tạo mới đánh giá
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *               - batDongSanId
 *               - soSao
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               batDongSanId:
 *                 type: string
 *               soSao:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               binhLuan:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/review/{id}:
 *   get:
 *     summary: Lấy đánh giá theo ID
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Chi tiết đánh giá
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Không tìm thấy đánh giá
 *   put:
 *     summary: Cập nhật đánh giá
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soSao:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               binhLuan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 *   delete:
 *     summary: Xoá đánh giá theo ID
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/review/property/{propertyId}:
 *   get:
 *     summary: Lấy đánh giá theo bất động sản
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bất động sản
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/review/user/{userId}:
 *   get:
 *     summary: Lấy đánh giá theo người dùng
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/review/property/{propertyId}/stats:
 *   get:
 *     summary: Lấy thống kê đánh giá theo bất động sản
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bất động sản
 *     responses:
 *       200:
 *         description: Thống kê trung bình và tổng số đánh giá
 */
