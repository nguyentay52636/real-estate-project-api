/**
 * @swagger
 * tags:
 *   - name: Notification
 *     description: API quản lý thông báo chat
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của người dùng
 *           example: "507f1f77bcf86cd799439012"
 *         hoTen:
 *           type: string
 *           description: Họ tên người dùng
 *           example: "Nguyễn Văn A"
 *         avatar:
 *           type: string
 *           description: URL ảnh đại diện
 *           example: "https://example.com/avatar.jpg"
 *     NotificationRoom:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của phòng chat
 *           example: "507f1f77bcf86cd799439011"
 *         tenPhong:
 *           type: string
 *           description: Tên phòng chat
 *           example: "Nhóm chat ABC"
 *         loaiPhong:
 *           type: string
 *           enum: [private, group]
 *           description: Loại phòng chat
 *           example: "group"
 *     NotificationMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của tin nhắn
 *           example: "507f1f77bcf86cd799439014"
 *         noiDung:
 *           type: string
 *           description: Nội dung tin nhắn
 *           example: "Xin chào mọi người!"
 *         loaiTinNhan:
 *           type: string
 *           enum: [text, image, cuoc_goi, system]
 *           description: Loại tin nhắn
 *           example: "text"
 *         nguoiGuiId:
 *           type: string
 *           description: ID người gửi tin nhắn
 *           example: "507f1f77bcf86cd799439012"
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của thông báo
 *           example: "507f1f77bcf86cd799439015"
 *         nguoiNhan:
 *           $ref: '#/components/schemas/NotificationUser'
 *           description: Thông tin người nhận thông báo
 *         loai:
 *           type: string
 *           enum: [new_message, room_update, call]
 *           description: Loại thông báo
 *           example: "new_message"
 *         noiDung:
 *           type: string
 *           description: Nội dung thông báo
 *           example: "Tin nhắn mới trong phòng chat ABC"
 *         roomId:
 *           $ref: '#/components/schemas/NotificationRoom'
 *           description: Thông tin phòng chat (nếu có)
 *         tinNhanId:
 *           $ref: '#/components/schemas/NotificationMessage'
 *           description: Thông tin tin nhắn (nếu có)
 *         daDoc:
 *           type: boolean
 *           description: Trạng thái đã đọc
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo thông báo
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật thông báo
 *     NotificationListResponse:
 *       type: object
 *       properties:
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         total:
 *           type: integer
 *           description: Tổng số thông báo
 *           example: 50
 *         page:
 *           type: integer
 *           description: Trang hiện tại
 *           example: 1
 *         totalPages:
 *           type: integer
 *           description: Tổng số trang
 *           example: 3
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của người dùng
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số thông báo mỗi trang
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [new_message, room_update, call]
 *         description: Lọc theo loại thông báo
 *     responses:
 *       200:
 *         description: Danh sách thông báo (sắp xếp theo thời gian tạo giảm dần)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       500:
 *         description: Lỗi lấy danh sách thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi lấy danh sách thông báo"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: Lấy danh sách thông báo chưa đọc
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số thông báo mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách thông báo chưa đọc (sắp xếp theo thời gian tạo giảm dần)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       500:
 *         description: Lỗi lấy danh sách thông báo chưa đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi lấy danh sách thông báo chưa đọc"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông báo cần đánh dấu đã đọc
 *         example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Thông báo được đánh dấu đã đọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: ID thông báo không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID thông báo không hợp lệ"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       403:
 *         description: Không có quyền đánh dấu thông báo này
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không có quyền đánh dấu thông báo này"
 *       404:
 *         description: Không tìm thấy thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy thông báo"
 *       500:
 *         description: Lỗi đánh dấu thông báo đã đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi đánh dấu thông báo đã đọc"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã đánh dấu tất cả thông báo là đã đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đã đánh dấu tất cả thông báo là đã đọc"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       500:
 *         description: Lỗi đánh dấu tất cả thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi đánh dấu tất cả thông báo"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông báo cần xóa
 *         example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Xóa thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa thông báo thành công"
 *       400:
 *         description: ID thông báo không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID thông báo không hợp lệ"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       403:
 *         description: Không có quyền xóa thông báo này
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không có quyền xóa thông báo này"
 *       404:
 *         description: Không tìm thấy thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy thông báo"
 *       500:
 *         description: Lỗi xóa thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi xóa thông báo"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     summary: Xóa tất cả thông báo của người dùng
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa tất cả thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa tất cả thông báo thành công"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bạn chưa đăng nhập"
 *       500:
 *         description: Lỗi xóa tất cả thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi xóa tất cả thông báo"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token từ header 'token' với format 'Bearer <token>'
 */
