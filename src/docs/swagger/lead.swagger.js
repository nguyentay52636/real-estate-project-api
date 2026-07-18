/**
 * @swagger
 * tags:
 *   name: Lead
 *   description: Theo dõi khách quan tâm tin đăng (lead tracking)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         propertyId:
 *           type: string
 *         ownerId:
 *           type: string
 *         viewerId:
 *           type: object
 *           description: Người xem (populate) — ten, email, soDienThoai, vaiTro
 *         viewer:
 *           type: object
 *           description: Alias của viewerId đã populate
 *         type:
 *           type: string
 *           enum: [VIEW, PHONE, ZALO, CHAT, BOOKING]
 *         status:
 *           type: string
 *           enum: [NEW, CONTACTED, CLOSED]
 *         note:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/lead:
 *   post:
 *     summary: Ghi nhận lead (xem tin / gọi / Zalo / chat / đặt lịch)
 *     description: |
 *       viewerId lấy từ JWT. ownerId lấy từ chủ bài đăng.
 *       type=VIEW chỉ tạo tối đa 1 lead / viewer / property / 24h.
 *     tags: [Lead]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId, type]
 *             properties:
 *               propertyId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [VIEW, PHONE, ZALO, CHAT, BOOKING]
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo lead thành công
 *       400:
 *         description: Dữ liệu không hợp lệ / lead trên bài của chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy BĐS
 *   get:
 *     summary: Danh sách lead của chủ tin (hoặc admin/NV)
 *     tags: [Lead]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [VIEW, PHONE, ZALO, CHAT, BOOKING]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, CONTACTED, CLOSED]
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
 *         description: Thành công — data kèm viewer (người quan tâm)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */

/**
 * @swagger
 * /api/lead/{id}:
 *   get:
 *     summary: Chi tiết lead
 *     tags: [Lead]
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
 *         description: Thành công
 *       403:
 *         description: Không phải chủ tin
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/lead/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái lead
 *     tags: [Lead]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NEW, CONTACTED, CLOSED]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

/**
 * @swagger
 * /api/lead/{id}/note:
 *   patch:
 *     summary: Cập nhật ghi chú lead
 *     tags: [Lead]
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
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
