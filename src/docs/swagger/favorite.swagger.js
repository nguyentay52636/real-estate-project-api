/**
 * @swagger
 * tags:
 *   name: Favorite
 *   description: API quản lý danh sách yêu thích
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Favorite:
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
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/favorite:
 *   post:
 *     summary: Thêm bất động sản vào danh sách yêu thích
 *     tags: [Favorite]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *               - batDongSanId
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               batDongSanId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đã thêm vào danh sách yêu thích
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Favorite'
 *       400:
 *         description: Dữ liệu thiếu hoặc đã tồn tại
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá bất động sản khỏi danh sách yêu thích
 *     tags: [Favorite]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *               - batDongSanId
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               batDongSanId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã xoá khỏi danh sách yêu thích
 *       404:
 *         description: Không tìm thấy mục yêu thích
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/favorite:
 *   get:
 *     summary: Lấy tất cả danh sách yêu thích
 *     tags: [Favorite]
 *     responses:
 *       200:
 *         description: Lấy thành công danh sách yêu thích
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/favorite/user/{userId}:
 *   get:
 *     summary: Lấy danh sách yêu thích theo người dùng
 *     tags: [Favorite]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID người dùng
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thành công danh sách yêu thích của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       404:
 *         description: Không tìm thấy người dùng hoặc không có mục yêu thích
 *       500:
 *         description: Lỗi server
 */
