/**
 * @swagger
 * tags:
 *   name: BehaviorTracking
 *   description: Theo dõi hành vi & chấm điểm lead (kiểu Batdongsan)
 */

/**
 * @swagger
 * /api/property/{id}/behavior:
 *   post:
 *     summary: Ghi nhận hành vi trên tin đăng
 *     description: |
 *       Guest gửi sessionId. User đã login gửi Bearer (viewerId từ JWT).
 *       Debounce ~5s chống spam. Có viewerId thì upsert PropertyLead + cộng score.
 *     tags: [BehaviorTracking]
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [IMPRESSION, VIEW_DETAIL, VIEW_IMAGE, VIEW_VIDEO, SAVE_PROPERTY, SHARE_PROPERTY, VIEW_PHONE, CLICK_ZALO, CHAT, CALL, BOOKING]
 *               sessionId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: success + data.behavior + data.lead
 */

/**
 * @swagger
 * /api/owner/properties/{id}/behaviors:
 *   get:
 *     summary: Danh sách behavior của tin (chỉ chủ tin)
 *     tags: [BehaviorTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, 7d, 30d]
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/owner/properties/{id}/leads:
 *   get:
 *     summary: Lead ranking theo score giảm dần
 *     tags: [BehaviorTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, CONTACTED, FOLLOWING, CLOSED, LOST]
 *     responses:
 *       200:
 *         description: items có score, actions, quality, viewer
 */

/**
 * @swagger
 * /api/owner/properties/{id}/analytics:
 *   get:
 *     summary: Dashboard thống kê behavior + lead
 *     tags: [BehaviorTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, 7d, 30d]
 *           default: 7d
 *     responses:
 *       200:
 *         description: behaviors + leads stats
 */

/**
 * @swagger
 * /api/owner/leads/{id}/status:
 *   patch:
 *     summary: Cập nhật status lead
 *     tags: [BehaviorTracking]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NEW, CONTACTED, FOLLOWING, CLOSED, LOST]
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /api/owner/leads/{id}/note:
 *   patch:
 *     summary: Cập nhật note lead
 *     tags: [BehaviorTracking]
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
 *         description: OK
 */
