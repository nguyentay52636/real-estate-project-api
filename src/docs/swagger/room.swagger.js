/**
 * @swagger
 * tags:
 *   - name: Room
 *     description: API quản lý phòng chat
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserInfo:
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
 *     Member:
 *       type: object
 *       properties:
 *         nguoiDung:
 *           $ref: '#/components/schemas/UserInfo'
 *         vaiTro:
 *           type: string
 *           enum: [admin, member]
 *           description: Vai trò trong phòng
 *           example: "member"
 *         trangThai:
 *           type: string
 *           enum: [active, left]
 *           description: Trạng thái thành viên
 *           example: "active"
 *         thoiGianThamGia:
 *           type: string
 *           format: date-time
 *           description: Thời gian tham gia phòng
 *         bietDanh:
 *           type: string
 *           description: Biệt danh trong phòng
 *     Room:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của phòng chat
 *           example: "507f1f77bcf86cd799439011"
 *         tenPhong:
 *           type: string
 *           description: Tên phòng chat (bắt buộc với group)
 *           example: "Nhóm chat ABC"
 *         loaiPhong:
 *           type: string
 *           enum: [private, group]
 *           description: Loại phòng chat
 *           example: "group"
 *         thanhVien:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Member'
 *           description: Danh sách thành viên trong phòng chat
 *         nguoiTao:
 *           $ref: '#/components/schemas/UserInfo'
 *           description: Thông tin người tạo phòng
 *         anhDaiDien:
 *           type: string
 *           description: URL ảnh đại diện của phòng
 *           example: "https://example.com/room-avatar.jpg"
 *         tinNhan:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID tin nhắn trong phòng
 *         tinNhanCuoi:
 *           type: string
 *           description: ID tin nhắn cuối cùng trong phòng
 *         tinNhanGhim:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID tin nhắn được ghim
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo phòng chat
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật phòng chat
 *     RoomCreate:
 *       type: object
 *       required:
 *         - loaiPhong
 *         - thanhVien
 *         - nguoiTao
 *       properties:
 *         tenPhong:
 *           type: string
 *           description: Tên phòng chat (bắt buộc với phòng group)
 *           example: "Nhóm chat ABC"
 *         loaiPhong:
 *           type: string
 *           enum: [private, group]
 *           description: Loại phòng chat
 *           example: "group"
 *         thanhVien:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nguoiDung:
 *                 type: string
 *                 description: ID người dùng
 *               vaiTro:
 *                 type: string
 *                 enum: [admin, member]
 *                 default: member
 *               trangThai:
 *                 type: string
 *                 enum: [active, left]
 *                 default: active
 *           description: Danh sách thành viên
 *           example: [{"nguoiDung": "507f1f77bcf86cd799439012", "vaiTro": "admin"}, {"nguoiDung": "507f1f77bcf86cd799439013", "vaiTro": "member"}]
 *         nguoiTao:
 *           type: string
 *           description: ID người tạo phòng
 *           example: "507f1f77bcf86cd799439012"
 *         anhDaiDien:
 *           type: string
 *           description: URL ảnh đại diện phòng
 *           example: "https://example.com/room-avatar.jpg"
 *     PrivateRoomRequest:
 *       type: object
 *       required:
 *         - userId1
 *         - userId2
 *       properties:
 *         userId1:
 *           type: string
 *           description: ID người dùng thứ nhất
 *           example: "507f1f77bcf86cd799439012"
 *         userId2:
 *           type: string
 *           description: ID người dùng thứ hai
 *           example: "507f1f77bcf86cd799439013"
 *     RoomUpdate:
 *       type: object
 *       properties:
 *         tenPhong:
 *           type: string
 *           description: Tên phòng chat mới
 *           example: "Tên phòng đã cập nhật"
 *         anhDaiDien:
 *           type: string
 *           description: URL ảnh đại diện mới
 *           example: "https://example.com/new-avatar.jpg"
 *         thanhVien:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nguoiDung:
 *                 type: string
 *               vaiTro:
 *                 type: string
 *                 enum: [admin, member]
 *               trangThai:
 *                 type: string
 *                 enum: [active, left]
 *           description: Danh sách thành viên mới
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: |
 *         JWT token có thể được gửi theo 2 cách:
 *         1. Header 'Authorization': 'Bearer <token>'
 *         2. Header 'token': 'Bearer <token>' hoặc chỉ '<token>'
 */

/**
 * @swagger
 * /api/room:
 *   get:
 *     summary: Lấy tất cả phòng chat
 *     tags: [Room]
 *     description: Lấy danh sách tất cả các phòng chat trong hệ thống (không cần xác thực)
 *     responses:
 *       200:
 *         description: Danh sách tất cả phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       500:
 *         description: Lỗi lấy danh sách phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi lấy danh sách phòng chat"
 *                 error:
 *                   type: string
 *   post:
 *     summary: Tạo phòng chat mới
 *     tags: [Room]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomCreate'
 *           examples:
 *             group_room:
 *               summary: Tạo phòng chat nhóm
 *               value:
 *                 tenPhong: "Nhóm chat dự án ABC"
 *                 loaiPhong: "group"
 *                 thanhVien: [{"nguoiDung": "507f1f77bcf86cd799439012", "vaiTro": "admin"}, {"nguoiDung": "507f1f77bcf86cd799439013", "vaiTro": "member"}]
 *                 nguoiTao: "507f1f77bcf86cd799439012"
 *                 anhDaiDien: "https://example.com/room-avatar.jpg"
 *             private_room:
 *               summary: Tạo phòng chat riêng tư
 *               value:
 *                 loaiPhong: "private"
 *                 thanhVien: [{"nguoiDung": "507f1f77bcf86cd799439012", "vaiTro": "member"}, {"nguoiDung": "507f1f77bcf86cd799439013", "vaiTro": "member"}]
 *                 nguoiTao: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Phòng chat được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Thiếu thông tin phòng chat"
 *       500:
 *         description: Lỗi tạo phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi tạo phòng"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/search:
 *   get:
 *     summary: Tìm kiếm phòng chat
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm tên phòng
 *         example: "nhóm chat"
 *     responses:
 *       200:
 *         description: Danh sách phòng chat tìm được
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
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
 *         description: Token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token không hợp lệ"
 *       500:
 *         description: Lỗi tìm kiếm phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi tìm kiếm phòng chat"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/user/{userId}:
 *   get:
 *     summary: Lấy danh sách phòng chat của người dùng
 *     tags: [Room]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Danh sách phòng chat của người dùng (sắp xếp theo thời gian cập nhật mới nhất)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       500:
 *         description: Lỗi lấy danh sách phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi lấy danh sách phòng chat"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}:
 *   get:
 *     summary: Lấy thông tin phòng chat theo ID
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Thông tin phòng chat với tin nhắn được populate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
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
 *         description: Token không hợp lệ hoặc người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_member:
 *                 summary: Không thuộc phòng chat
 *                 value:
 *                   message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi lấy thông tin phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi lấy thông tin phòng chat"
 *                 error:
 *                   type: string
 *   put:
 *     summary: Cập nhật thông tin phòng chat
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat cần cập nhật
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomUpdate'
 *     responses:
 *       200:
 *         description: Phòng chat được cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
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
 *         description: Token không hợp lệ hoặc chỉ admin mới có thể cập nhật phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_admin:
 *                 summary: Không phải admin
 *                 value:
 *                   message: "Chỉ admin mới có thể cập nhật phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi cập nhật phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi cập nhật phòng chat"
 *                 error:
 *                   type: string
 *   delete:
 *     summary: Xóa phòng chat
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat cần xóa
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Phòng chat được xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa phòng thành công"
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
 *         description: Token không hợp lệ hoặc chỉ admin mới có thể xóa phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_admin:
 *                 summary: Không phải admin
 *                 value:
 *                   message: "Chỉ admin mới có thể xóa phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi xóa phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi xóa phòng"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/find-or-create-private:
 *   post:
 *     summary: Tìm hoặc tạo phòng chat private giữa 2 người dùng
 *     tags: [Room]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrivateRoomRequest'
 *           example:
 *             userId1: "507f1f77bcf86cd799439012"
 *             userId2: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Tìm thấy phòng chat private đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *                 isNewRoom:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Phòng chat đã tồn tại"
 *       201:
 *         description: Tạo phòng chat private mới thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *                 isNewRoom:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tạo phòng chat mới thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               missing_users:
 *                 summary: Thiếu thông tin người dùng
 *                 value:
 *                   message: "Thiếu thông tin userId1 hoặc userId2"
 *               same_user:
 *                 summary: Cùng một người dùng
 *                 value:
 *                   message: "Không thể tạo phòng chat với chính mình"
 *       500:
 *         description: Lỗi tìm/tạo phòng chat private
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi tìm/tạo phòng chat private"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}/message:
 *   post:
 *     summary: Thêm tin nhắn vào phòng chat
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *             properties:
 *               messageId:
 *                 type: string
 *                 description: ID tin nhắn cần thêm
 *                 example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Thêm tin nhắn vào phòng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Thêm tin nhắn vào phòng thành công"
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
 *         description: Token không hợp lệ hoặc người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_member:
 *                 summary: Không thuộc phòng chat
 *                 value:
 *                   message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat hoặc tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               room_not_found:
 *                 summary: Không tìm thấy phòng chat
 *                 value:
 *                   message: "Không tìm thấy phòng chat"
 *               message_not_found:
 *                 summary: Không tìm thấy tin nhắn
 *                 value:
 *                   message: "Không tìm thấy tin nhắn"
 *       500:
 *         description: Lỗi thêm tin nhắn vào phòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi thêm tin nhắn vào phòng"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}/message/{messageId}:
 *   delete:
 *     summary: Xóa tin nhắn khỏi phòng chat
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin nhắn cần xóa
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Xóa tin nhắn khỏi phòng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa tin nhắn khỏi phòng thành công"
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
 *         description: Token không hợp lệ hoặc chỉ admin mới có thể xóa tin nhắn hoặc người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_admin:
 *                 summary: Không phải admin
 *                 value:
 *                   message: "Chỉ admin mới có thể xóa tin nhắn khỏi phòng"
 *               not_member:
 *                 summary: Không thuộc phòng
 *                 value:
 *                   message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi xóa tin nhắn khỏi phòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi xóa tin nhắn khỏi phòng"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}/add-member:
 *   post:
 *     summary: Thêm thành viên vào phòng chat nhóm
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID người dùng cần thêm vào phòng
 *                 example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Thêm thành viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               not_group:
 *                 summary: Không phải phòng nhóm
 *                 value:
 *                   message: "Chỉ có thể thêm thành viên vào phòng nhóm"
 *               already_member:
 *                 summary: Đã là thành viên
 *                 value:
 *                   message: "Người dùng đã là thành viên của phòng"
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
 *         description: Token không hợp lệ hoặc chỉ admin mới có thể thêm thành viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_admin:
 *                 summary: Không phải admin
 *                 value:
 *                   message: "Chỉ admin mới có thể thêm thành viên"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi thêm thành viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi thêm thành viên"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}/leave:
 *   post:
 *     summary: Rời khỏi phòng chat nhóm
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Rời phòng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Rời phòng thành công"
 *       400:
 *         description: Chỉ có thể rời khỏi phòng nhóm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chỉ có thể rời khỏi phòng nhóm"
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
 *         description: Token không hợp lệ hoặc admin không thể rời phòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_admin:
 *                 summary: Không phải admin
 *                 value:
 *                   message: "Admin không thể rời phòng, hãy chuyển quyền admin trước"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi rời phòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi rời phòng"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/room/{roomId}/transfer-admin:
 *   put:
 *     summary: Chuyển quyền admin cho thành viên khác
 *     tags: [Room]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newAdminId
 *             properties:
 *               newAdminId:
 *                 type: string
 *                 description: ID người dùng sẽ trở thành admin mới
 *                 example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Chuyển quyền admin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               not_group:
 *                 summary: Không phải phòng nhóm
 *                 value:
 *                   message: "Chỉ có thể chuyển quyền admin trong phòng nhóm"
 *               invalid_user:
 *                 summary: Người dùng không hợp lệ
 *                 value:
 *                   message: "Người dùng không hợp lệ hoặc không phải thành viên active"
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
 *         description: Token không hợp lệ hoặc chỉ admin hiện tại mới có thể chuyển quyền
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalid_token:
 *                 summary: Token không hợp lệ
 *                 value:
 *                   message: "Token không hợp lệ"
 *               not_current_admin:
 *                 summary: Không phải admin hiện tại
 *                 value:
 *                   message: "Chỉ admin hiện tại mới có thể chuyển quyền"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi chuyển quyền admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi chuyển quyền admin"
 *                 error:
 *                   type: string
 */