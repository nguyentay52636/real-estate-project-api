/**
 * @swagger
 * tags:
 *   - name: Message
 *     description: API quản lý tin nhắn chat
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
 *     
 *     RoomInfo:
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
 *     
 *     CallInfo:
 *       type: object
 *       properties:
 *         trangThai:
 *           type: string
 *           enum: [missed, ended, declined, ongoing]
 *           description: Trạng thái cuộc gọi
 *           example: "ended"
 *         thoiLuong:
 *           type: number
 *           description: Thời lượng cuộc gọi (giây)
 *           example: 120
 *         loai:
 *           type: string
 *           enum: [audio, video]
 *           description: Loại cuộc gọi
 *           example: "video"
 *         thanhVien:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID người tham gia cuộc gọi
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *     
 *     ReplyInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của tin nhắn được trả lời
 *           example: "507f1f77bcf86cd799439015"
 *         noiDung:
 *           type: string
 *           description: Nội dung tin nhắn được trả lời
 *           example: "Tin nhắn gốc"
 *         nguoiGuiId:
 *           $ref: '#/components/schemas/UserInfo'
 *           description: Thông tin người gửi tin nhắn gốc
 *     
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của tin nhắn
 *           example: "507f1f77bcf86cd799439014"
 *         roomId:
 *           $ref: '#/components/schemas/RoomInfo'
 *           description: Thông tin phòng chat
 *         nguoiGuiId:
 *           $ref: '#/components/schemas/UserInfo'
 *           description: Thông tin người gửi
 *         noiDung:
 *           type: string
 *           description: Nội dung tin nhắn (maxlength 1000)
 *           example: "Xin chào mọi người!"
 *         tapTin:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách URL tệp đính kèm
 *           example: ["https://example.com/file1.jpg", "https://example.com/file2.pdf"]
 *         phanHoiTinNhan:
 *           $ref: '#/components/schemas/ReplyInfo'
 *           description: Thông tin tin nhắn được trả lời (nếu có)
 *         daDoc:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID người dùng đã đọc tin nhắn
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *         trangThai:
 *           type: string
 *           enum: [sent, edited, deleted, recalled]
 *           description: Trạng thái tin nhắn
 *           example: "sent"
 *         loaiTinNhan:
 *           type: string
 *           enum: [text, image, cuoc_goi, system]
 *           description: Loại tin nhắn
 *           example: "text"
 *         cuocGoi:
 *           $ref: '#/components/schemas/CallInfo'
 *           description: Thông tin cuộc gọi (chỉ có khi loaiTinNhan = 'cuoc_goi')
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo tin nhắn
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật tin nhắn
 *     
 *     MessageCreate:
 *       type: object
 *       required:
 *         - roomId
 *       properties:
 *         roomId:
 *           type: string
 *           description: ID phòng chat
 *           example: "507f1f77bcf86cd799439011"
 *         noiDung:
 *           type: string
 *           description: Nội dung tin nhắn (maxlength 1000)
 *           example: "Xin chào mọi người!"
 *         tapTin:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Tệp đính kèm (tối đa 5 tệp)
 *         phanHoiTinNhan:
 *           type: string
 *           description: ID của tin nhắn được trả lời
 *           example: "507f1f77bcf86cd799439015"
 *         loaiTinNhan:
 *           type: string
 *           enum: [text, image, cuoc_goi, system]
 *           description: Loại tin nhắn
 *           example: "text"
 *           default: "text"
 *     
 *     MessageUpdate:
 *       type: object
 *       properties:
 *         noiDungMoi:
 *           type: string
 *           description: Nội dung tin nhắn mới
 *           example: "Nội dung đã chỉnh sửa"
 *         tapTin:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách URL tệp đính kèm mới
 *           example: ["https://example.com/new-image.jpg"]
 *     
 *     CallCreate:
 *       type: object
 *       required:
 *         - roomId
 *         - loai
 *       properties:
 *         roomId:
 *           type: string
 *           description: ID của phòng chat
 *           example: "507f1f77bcf86cd799439011"
 *         loai:
 *           type: string
 *           enum: [audio, video]
 *           description: Loại cuộc gọi
 *           example: "video"
 *         trangThai:
 *           type: string
 *           enum: [missed, ended, declined, ongoing]
 *           description: Trạng thái cuộc gọi
 *           example: "ended"
 *           default: "ended"
 *         thoiLuong:
 *           type: number
 *           description: Thời lượng cuộc gọi (giây)
 *           example: 120
 *           default: 0
 *         thanhVien:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách ID người tham gia
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *           default: []
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Thông báo lỗi
 *         error:
 *           type: string
 *           description: Chi tiết lỗi (tùy chọn)
 *     
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Thông báo thành công
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token từ header 'token' với format 'Bearer <token>'
 */

/**
 * @swagger
 * /api/message/{roomId}:
 *   get:
 *     summary: Lấy danh sách tin nhắn trong phòng chat
 *     tags: [Message]
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
 *         description: Danh sách tin nhắn trong phòng chat (sắp xếp theo thời gian tạo tăng dần)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       403:
 *         description: Người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi lấy tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message:
 *   post:
 *     summary: Tạo tin nhắn mới
 *     description: |
 *       Tạo tin nhắn mới trong phòng chat. Hỗ trợ upload file đính kèm (tối đa 5 file).
 *       Yêu cầu phải có roomId và ít nhất một trong: noiDung, tapTin, hoặc loaiTinNhan = 'system'.
 *     tags: [Message]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MessageCreate'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageCreate'
 *           examples:
 *             text_message:
 *               summary: Tạo tin nhắn văn bản
 *               value:
 *                 roomId: "507f1f77bcf86cd799439011"
 *                 noiDung: "Xin chào mọi người!"
 *                 loaiTinNhan: "text"
 *             reply_message:
 *               summary: Tạo tin nhắn trả lời
 *               value:
 *                 roomId: "507f1f77bcf86cd799439011"
 *                 noiDung: "Cảm ơn bạn!"
 *                 phanHoiTinNhan: "507f1f77bcf86cd799439015"
 *                 loaiTinNhan: "text"
 *             system_message:
 *               summary: Tạo tin nhắn hệ thống
 *               value:
 *                 roomId: "507f1f77bcf86cd799439011"
 *                 noiDung: "Người dùng đã tham gia phòng"
 *                 loaiTinNhan: "system"
 *     responses:
 *       201:
 *         description: Tin nhắn được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_data:
 *                 summary: Thiếu thông tin bắt buộc
 *                 value:
 *                   message: "Thiếu thông tin bắt buộc"
 *               invalid_type:
 *                 summary: Loại tin nhắn không hợp lệ
 *                 value:
 *                   message: "Loại tin nhắn không hợp lệ: text, image, cuoc_goi, system"
 *               invalid_reply:
 *                 summary: Tin nhắn trả lời không hợp lệ
 *                 value:
 *                   message: "Tin nhắn trả lời không hợp lệ"
 *       403:
 *         description: Người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi tạo tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/call:
 *   post:
 *     summary: Tạo tin nhắn cuộc gọi
 *     description: |
 *       Tạo tin nhắn đặc biệt cho cuộc gọi với thông tin chi tiết về cuộc gọi.
 *       Tin nhắn sẽ có loaiTinNhan = 'cuoc_goi' và chứa thông tin cuộc gọi.
 *     tags: [Message]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CallCreate'
 *           examples:
 *             video_call:
 *               summary: Cuộc gọi video đã kết thúc
 *               value:
 *                 roomId: "507f1f77bcf86cd799439011"
 *                 loai: "video"
 *                 trangThai: "ended"
 *                 thoiLuong: 120
 *                 thanhVien: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *             audio_call_missed:
 *               summary: Cuộc gọi thoại bị nhỡ
 *               value:
 *                 roomId: "507f1f77bcf86cd799439011"
 *                 loai: "audio"
 *                 trangThai: "missed"
 *                 thoiLuong: 0
 *                 thanhVien: []
 *     responses:
 *       201:
 *         description: Tin nhắn cuộc gọi được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_data:
 *                 summary: Thiếu thông tin bắt buộc
 *                 value:
 *                   message: "Thiếu thông tin bắt buộc (roomId, loai)"
 *               invalid_call_type:
 *                 summary: Loại cuộc gọi không hợp lệ
 *                 value:
 *                   message: "Loại cuộc gọi không hợp lệ: audio, video"
 *               invalid_call_status:
 *                 summary: Trạng thái cuộc gọi không hợp lệ
 *                 value:
 *                   message: "Trạng thái cuộc gọi không hợp lệ: missed, ended, declined, ongoing"
 *       403:
 *         description: Người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi tạo tin nhắn cuộc gọi"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{id}:
 *   put:
 *     summary: Cập nhật tin nhắn
 *     description: |
 *       Chỉnh sửa nội dung tin nhắn. Chỉ người gửi tin nhắn mới có quyền chỉnh sửa.
 *       Trạng thái tin nhắn sẽ tự động chuyển thành 'edited'.
 *     tags: [Message]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin nhắn cần cập nhật
 *         example: "507f1f77bcf86cd799439014"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageUpdate'
 *           example:
 *             noiDungMoi: "Nội dung đã chỉnh sửa"
 *             tapTin: ["https://example.com/new-image.jpg"]
 *     responses:
 *       200:
 *         description: Tin nhắn được cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: ID tin nhắn không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "ID tin nhắn không hợp lệ"
 *       403:
 *         description: Không có quyền chỉnh sửa tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không có quyền chỉnh sửa tin nhắn"
 *       404:
 *         description: Không tìm thấy tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy tin nhắn"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi cập nhật tin nhắn"
 *               error: "Chi tiết lỗi..."
 *   
 *   delete:
 *     summary: Xóa tin nhắn (soft delete)
 *     description: |
 *       Xóa mềm tin nhắn. Chỉ người gửi tin nhắn mới có quyền xóa.
 *       Nội dung tin nhắn sẽ được thay thế bằng '[deleted]' và trạng thái chuyển thành 'deleted'.
 *     tags: [Message]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin nhắn cần xóa
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Tin nhắn được xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: ID tin nhắn không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "ID tin nhắn không hợp lệ"
 *       403:
 *         description: Không có quyền xóa tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không có quyền xóa tin nhắn"
 *       404:
 *         description: Không tìm thấy tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy tin nhắn"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi xóa tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{id}/recall:
 *   put:
 *     summary: Thu hồi tin nhắn
 *     description: |
 *       Thu hồi tin nhắn đã gửi. Chỉ người gửi tin nhắn mới có quyền thu hồi.
 *       Nội dung tin nhắn sẽ được thay thế bằng '[Tin nhắn đã được thu hồi]' và trạng thái chuyển thành 'recalled'.
 *     tags: [Message]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin nhắn cần thu hồi
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Tin nhắn được thu hồi thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: ID tin nhắn không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "ID tin nhắn không hợp lệ"
 *       403:
 *         description: Không có quyền thu hồi tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không có quyền thu hồi tin nhắn"
 *       404:
 *         description: Không tìm thấy tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy tin nhắn"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi thu hồi tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{id}/read:
 *   put:
 *     summary: Đánh dấu tin nhắn đã đọc
 *     description: |
 *       Đánh dấu tin nhắn là đã đọc bởi người dùng hiện tại.
 *       ID người dùng sẽ được thêm vào mảng daDoc nếu chưa có.
 *     tags: [Message]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tin nhắn cần đánh dấu đã đọc
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Tin nhắn được đánh dấu đã đọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: ID tin nhắn không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "ID tin nhắn không hợp lệ"
 *       404:
 *         description: Không tìm thấy tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy tin nhắn"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi đánh dấu tin nhắn đã đọc"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{roomId}/search:
 *   get:
 *     summary: Tìm kiếm tin nhắn trong phòng chat
 *     description: |
 *       Tìm kiếm tin nhắn trong phòng chat theo từ khóa và/hoặc khoảng thời gian.
 *       Hỗ trợ tìm kiếm không phân biệt hoa thường.
 *     tags: [Message]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng chat
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm trong nội dung tin nhắn (không phân biệt hoa thường)
 *         example: "xin chào"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Ngày bắt đầu tìm kiếm (ISO string)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Ngày kết thúc tìm kiếm (ISO string)
 *         example: "2024-12-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn tìm được (sắp xếp theo thời gian tạo tăng dần)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       403:
 *         description: Người dùng không thuộc phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Người dùng không thuộc phòng chat"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi tìm kiếm tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{roomId}/pin/{messageId}:
 *   put:
 *     summary: Ghim tin nhắn trong phòng chat
 *     description: |
 *       Ghim tin nhắn trong phòng chat. Chỉ admin của phòng mới có quyền ghim tin nhắn.
 *       Tin nhắn sẽ được thêm vào danh sách tinNhanGhim của phòng chat.
 *     tags: [Message]
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
 *         description: ID của tin nhắn cần ghim
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Ghim tin nhắn thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Ghim tin nhắn thành công"
 *       403:
 *         description: Chỉ admin mới có thể ghim tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Chỉ admin mới có thể ghim tin nhắn"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi ghim tin nhắn"
 *               error: "Chi tiết lỗi..."
 */

/**
 * @swagger
 * /api/message/{roomId}/unpin/{messageId}:
 *   put:
 *     summary: Gỡ ghim tin nhắn trong phòng chat
 *     description: |
 *       Gỡ ghim tin nhắn trong phòng chat. Chỉ admin của phòng mới có quyền gỡ ghim tin nhắn.
 *       Tin nhắn sẽ được xóa khỏi danh sách tinNhanGhim của phòng chat.
 *     tags: [Message]
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
 *         description: ID của tin nhắn cần gỡ ghim
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Gỡ ghim tin nhắn thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: "Gỡ ghim tin nhắn thành công"
 *       403:
 *         description: Chỉ admin mới có thể gỡ ghim tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Chỉ admin mới có thể gỡ ghim tin nhắn"
 *       404:
 *         description: Không tìm thấy phòng chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Không tìm thấy phòng chat"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Lỗi gỡ ghim tin nhắn"
 *               error: "Chi tiết lỗi..."
 */