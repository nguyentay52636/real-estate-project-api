/**
 * @swagger
 * tags:
 *   - name: AI Chat
 *     description: |
 *       Chat với AI Agent (Cấp 1) và chuyển nhân viên thực (Cấp 2).
 *
 *       **Luồng hoạt động:**
 *       ```
 *       Khách hàng
 *           ↓
 *       POST /api/ai-chat/message
 *           ↓
 *       [requiresHandOff: false] → AI trả lời ngay
 *           ↓
 *       [requiresHandOff: true]
 *           ↓
 *       POST /api/ai-chat/handoff   ← Tạo handoff session
 *           ↓
 *       GET  /api/ai-chat/handoff/:token/status  ← Kiểm tra trạng thái
 *           ↓
 *       POST /api/ai-chat/human/send  ← Nhân viên gửi tin
 *       ```
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     AIChatRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: Tin nhắn của khách hàng
 *           example: "Studio dưới 8 triệu ở Quận 7"
 *         sessionId:
 *           type: string
 *           description: ID phiên chat (tạo mới nếu không có)
 *           example: "session_1719030000000"
 *         userId:
 *           type: string
 *           description: ID người thuê đã đăng nhập (bắt buộc để tạo ticket handoff + phòng chat)
 *           example: "6a390199120aeb86eb2073df"
 *         customerName:
 *           type: string
 *           description: Tên hiển thị khách hàng
 *           example: "tien tho"
 *         conversationHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, ai]
 *               message:
 *                 type: string
 *         district:
 *           type: string
 *           description: Quận/khu vực (ghi đè tự động nhận dạng)
 *           example: "Quận 7"
 *         maxPrice:
 *           type: number
 *           description: Giá thuê tối đa (VNĐ)
 *           example: 8000000
 *
 *     AIChatResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         requiresHandOff:
 *           type: boolean
 *           description: |
 *             - `false` → AI đã trả lời, hiển thị `aiResponse`
 *             - `true`  → Cần chuyển nhân viên, gọi tiếp POST /api/ai-chat/handoff
 *           example: false
 *         sessionId:
 *           type: string
 *           example: "session_1719030000000"
 *         intent:
 *           type: string
 *           enum: [search, price, area, furniture, petPolicy, location, viewingHours, serviceFee, images, general, HANDOFF]
 *           example: "search"
 *         confidence:
 *           type: number
 *           description: Độ tự tin của AI (0.0 – 1.0)
 *           example: 0.85
 *         aiResponse:
 *           type: string
 *           nullable: true
 *           description: Câu trả lời của AI (null khi requiresHandOff = true)
 *           example: "Tôi tìm được 2 căn hộ phù hợp..."
 *         handOffMessage:
 *           type: string
 *           nullable: true
 *           description: Thông báo khi cần chuyển nhân viên
 *           example: "Tôi sẽ kết nối bạn với nhân viên ngay bây giờ..."
 *         apartments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ApartmentResult'
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     ApartmentResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "APT001"
 *         title:
 *           type: string
 *           example: "Studio hiện đại Quận 7"
 *         price:
 *           type: number
 *           example: 7500000
 *         district:
 *           type: string
 *           example: "Quận 7"
 *         area:
 *           type: number
 *           description: Diện tích (m²)
 *           example: 28
 *         furniture:
 *           type: string
 *           example: "Đầy đủ nội thất"
 *         petPolicy:
 *           type: string
 *           example: "Không cho phép nuôi thú cưng"
 *         viewingHours:
 *           type: string
 *           example: "Thứ 2 - Thứ 7, 9:00 - 18:00"
 *         serviceFee:
 *           type: string
 *           example: "200.000 VNĐ/tháng"
 *         address:
 *           type: string
 *           example: "12 Nguyễn Thị Thập, Quận 7, TP.HCM"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/img1.jpg"]
 *
 *     HandoffRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         sessionId:
 *           type: string
 *           description: ID phiên chat (tự tạo nếu không gửi)
 *           example: "session_1719030000000"
 *         userId:
 *           type: string
 *           description: ID người thuê đã đăng nhập (bắt buộc). Có thể gửi `id` thay cho `userId`
 *           example: "6a390199120aeb86eb2073df"
 *         reason:
 *           type: string
 *           description: Lý do cần chuyển nhân viên
 *           example: "Khách muốn thương lượng giá"
 *         conversationHistory:
 *           type: array
 *           description: Lịch sử hội thoại để nhân viên nắm context
 *           items:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, ai]
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *           example:
 *             - role: "user"
 *               message: "Studio dưới 8 triệu ở Quận 7"
 *               timestamp: "2025-01-01T10:00:00.000Z"
 *             - role: "ai"
 *               message: "Tôi tìm được 1 căn phù hợp..."
 *               timestamp: "2025-01-01T10:00:01.000Z"
 *
 *     HandoffResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         handoffToken:
 *           type: string
 *           description: Token dùng để giao tiếp trong handoff session
 *           example: "handoff_session_1719030000000_1719030050000"
 *         sessionId:
 *           type: string
 *           example: "session_1719030000000"
 *         status:
 *           type: string
 *           enum: [pending, active, resolved, timeout]
 *           example: "pending"
 *         estimatedWaitTime:
 *           type: string
 *           example: "1-3 phút"
 *         message:
 *           type: string
 *           example: "Yêu cầu chuyển nhân viên đã được ghi nhận."
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     HumanSendRequest:
 *       type: object
 *       required:
 *         - handoffToken
 *         - agentId
 *         - message
 *       properties:
 *         handoffToken:
 *           type: string
 *           description: Token từ bước handoff
 *           example: "handoff_session_1719030000000_1719030050000"
 *         agentId:
 *           type: string
 *           description: ID nhân viên gửi tin
 *           example: "AGENT_001"
 *         agentName:
 *           type: string
 *           example: "Nguyễn Văn Sale"
 *         message:
 *           type: string
 *           example: "Xin chào, tôi là nhân viên hỗ trợ. Bạn muốn thương lượng giá căn nào ạ?"
 *         sessionId:
 *           type: string
 *           example: "session_1719030000000"
 *
 *     SearchApartmentRequest:
 *       type: object
 *       properties:
 *         district:
 *           type: string
 *           example: "Quận 7"
 *         maxPrice:
 *           type: number
 *           example: 8000000
 *         minPrice:
 *           type: number
 *           example: 4000000
 *         furniture:
 *           type: boolean
 *           description: true = có nội thất, false = không nội thất
 *           example: true
 *         petAllowed:
 *           type: boolean
 *           description: true = cho phép thú cưng
 *           example: false
 */

// ═══════════════════════════════════════════════════════════
// AI CHAT – CẤP 1
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/ai-chat/message:
 *   post:
 *     summary: 💬 Gửi tin nhắn đến AI Agent (Cấp 1)
 *     description: |
 *       Gửi tin nhắn của khách hàng đến AI. AI sẽ:
 *       - **Trả lời ngay** nếu thuộc danh mục AI xử lý được (giá, diện tích, nội thất, thú cưng, địa chỉ, giờ xem, phí dịch vụ, ảnh/video)
 *       - **Yêu cầu chuyển nhân viên** (`requiresHandOff: true`) nếu khách muốn thương lượng, khiếu nại, đặt cọc, v.v.
 *
 *       **Ví dụ tin nhắn AI có thể trả lời:**
 *       - `"Studio dưới 8 triệu ở Quận 7"`
 *       - `"Căn hộ này có cho nuôi chó không?"`
 *       - `"Phí dịch vụ bao nhiêu?"`
 *       - `"Diện tích bao nhiêu m2?"`
 *
 *       **Ví dụ tin nhắn trigger handoff:**
 *       - `"Tôi muốn thương lượng giá"`
 *       - `"Tôi muốn đặt cọc"`
 *       - `"Tôi có khiếu nại"`
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIChatRequest'
 *           examples:
 *             search_by_district_price:
 *               summary: 🔍 Tìm căn hộ theo quận và giá
 *               value:
 *                 message: "Studio dưới 8 triệu ở Quận 7"
 *                 sessionId: "session_1719030000000"
 *             ask_pet_policy:
 *               summary: 🐾 Hỏi chính sách thú cưng
 *               value:
 *                 message: "Căn hộ có cho phép nuôi mèo không?"
 *                 sessionId: "session_1719030000001"
 *             ask_price:
 *               summary: 💰 Hỏi giá thuê
 *               value:
 *                 message: "Giá thuê căn hộ ở Quận 1 bao nhiêu?"
 *                 sessionId: "session_1719030000002"
 *                 district: "Quận 1"
 *             trigger_handoff:
 *               summary: Kích hoạt chuyển nhân viên (thương lượng giá)
 *               value:
 *                 message: "Tôi muốn thương lượng giá thuê"
 *                 sessionId: "session_1719030000003"
 *                 userId: "6a390199120aeb86eb2073df"
 *                 customerName: "tien tho"
 *             trigger_handoff_deposit:
 *               summary: 🚨 Kích hoạt chuyển nhân viên (đặt cọc)
 *               value:
 *                 message: "Tôi muốn đặt cọc giữ phòng"
 *                 sessionId: "session_1719030000004"
 *     responses:
 *       200:
 *         description: |
 *           **Phản hồi thành công.**
 *           - Nếu `requiresHandOff = false`: hiển thị `aiResponse` cho khách hàng.
 *           - Nếu `requiresHandOff = true`: gọi `POST /api/ai-chat/handoff` để kết nối nhân viên.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIChatResponse'
 *             examples:
 *               ai_answered:
 *                 summary: AI trả lời thành công
 *                 value:
 *                   success: true
 *                   requiresHandOff: false
 *                   sessionId: "session_1719030000000"
 *                   intent: "search"
 *                   confidence: 0.85
 *                   aiResponse: "Tôi tìm được 1 căn hộ phù hợp:\n• Studio hiện đại Quận 7 – 7.500.000 VNĐ/tháng – 28m² – 12 Nguyễn Thị Thập, Quận 7, TP.HCM"
 *                   apartments:
 *                     - id: "APT001"
 *                       title: "Studio hiện đại Quận 7"
 *                       price: 7500000
 *                       district: "Quận 7"
 *                       area: 28
 *                       address: "12 Nguyễn Thị Thập, Quận 7, TP.HCM"
 *                   timestamp: "2025-06-22T04:30:00.000Z"
 *               handoff_triggered:
 *                 summary: Yêu cầu chuyển nhân viên
 *                 value:
 *                   success: true
 *                   requiresHandOff: true
 *                   sessionId: "session_1719030000003"
 *                   intent: "HANDOFF"
 *                   aiResponse: null
 *                   handOffMessage: "Tôi sẽ kết nối bạn với nhân viên hỗ trợ ngay bây giờ. Vui lòng đợi trong giây lát..."
 *                   timestamp: "2025-06-22T04:30:00.000Z"
 *       400:
 *         description: Thiếu trường `message`
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "message là bắt buộc"
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/ai-chat/search:
 *   post:
 *     summary:  Tìm kiếm căn hộ (AI Tool)
 *     description: |
 *       Endpoint này được AI Agent gọi nội bộ để tìm kiếm căn hộ theo tiêu chí.
 *       Dev cũng có thể gọi trực tiếp để test dữ liệu.
 *
 *       **Tương đương với tool call:**
 *       ```js
 *       searchApartment({ district: "Quận 7", maxPrice: 8000000 })
 *       ```
 *     tags: [AI Chat]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchApartmentRequest'
 *           examples:
 *             search_q7_under_8m:
 *               summary: Tìm Studio Quận 7 dưới 8 triệu
 *               value:
 *                 district: "Quận 7"
 *                 maxPrice: 8000000
 *             search_with_furniture_and_pet:
 *               summary: Tìm có nội thất, cho thú cưng
 *               value:
 *                 furniture: true
 *                 petAllowed: true
 *             search_price_range:
 *               summary: Tìm theo khoảng giá
 *               value:
 *                 minPrice: 5000000
 *                 maxPrice: 10000000
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApartmentResult'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               total: 1
 *               data:
 *                 - id: "APT001"
 *                   title: "Studio hiện đại Quận 7"
 *                   price: 7500000
 *                   district: "Quận 7"
 *                   area: 28
 *               timestamp: "2025-06-22T04:30:00.000Z"
 *       500:
 *         description: Lỗi server
 */

// ═══════════════════════════════════════════════════════════
// HUMAN HANDOFF – CẤP 2
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/ai-chat/handoff:
 *   post:
 *     summary: Yêu cầu chuyển sang nhân viên thực (Cấp 2)
 *     description: |
 *       Khi AI trả về `requiresHandOff: true`, frontend gọi endpoint này để tạo một
 *       **handoff session**. Hệ thống sẽ xếp hàng yêu cầu và thông báo nhân viên rảnh
 *       nhất qua Socket.IO.
 *
 *       **Các trường hợp cần handoff:**
 *       - Khách muốn thương lượng giá
 *       - Khách muốn đặt cọc / giữ phòng
 *       - Khiếu nại / phàn nàn
 *       - Hỏi vấn đề đặc biệt
 *       - AI không tự tin (confidence < 0.6)
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HandoffRequest'
 *           examples:
 *             negotiate_price:
 *               summary: Khách muốn thương lượng giá
 *               value:
 *                 sessionId: "session_1719030000003"
 *                 userId: "507f1f77bcf86cd799439012"
 *                 reason: "Khách muốn thương lượng giá thuê"
 *                 conversationHistory:
 *                   - role: "user"
 *                     message: "Studio dưới 8 triệu ở Quận 7"
 *                     timestamp: "2025-06-22T04:29:00.000Z"
 *                   - role: "ai"
 *                     message: "Tôi tìm được 1 căn hộ phù hợp..."
 *                     timestamp: "2025-06-22T04:29:01.000Z"
 *                   - role: "user"
 *                     message: "Tôi muốn thương lượng giá"
 *                     timestamp: "2025-06-22T04:29:05.000Z"
 *             deposit_request:
 *               summary: Khách muốn đặt cọc
 *               value:
 *                 sessionId: "session_1719030000004"
 *                 reason: "Khách muốn đặt cọc giữ phòng APT001"
 *     responses:
 *       200:
 *         description: Handoff session được tạo thành công. Dùng `handoffToken` cho các bước tiếp theo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HandoffResponse'
 *             example:
 *               success: true
 *               handoffToken: "handoff_session_1719030000003_1719030050000"
 *               sessionId: "session_1719030000003"
 *               status: "pending"
 *               estimatedWaitTime: "1-3 phút"
 *               message: "Yêu cầu chuyển nhân viên đã được ghi nhận. Nhân viên sẽ tham gia sớm nhất có thể."
 *               timestamp: "2025-06-22T04:30:50.000Z"
 *       400:
 *         description: Thiếu userId
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "userId là bắt buộc (id người thuê đã đăng nhập)"
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/ai-chat/handoff/pending:
 *   get:
 *     summary: Danh sách ticket handoff đang chờ (nhân viên)
 *     description: Chỉ user có vaiTro `nhan_vien` mới được gọi. Dùng khi load trang dashboard nhân viên.
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách ticket pending
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               total: 1
 *               data:
 *                 - ticketId: "6a38fe..."
 *                   handoffToken: "handoff_session_xxx_123"
 *                   status: "pending"
 *                   reason: "Khách muốn thương lượng giá"
 *                   customer:
 *                     id: "6a390199120aeb86eb2073df"
 *                     name: "tien tho"
 *                     email: "tientho@gmail.com"
 *       403:
 *         description: Không phải nhân viên
 */

/**
 * @swagger
 * /api/ai-chat/handoff/{handoffToken}/accept:
 *   post:
 *     summary: Nhân viên nhận ticket handoff
 *     description: |
 *       Nhân viên (`nhan_vien`) nhận ticket. Tạo phòng chat private giữa khách và nhân viên.
 *       Thông báo ticket tự xóa ở các nhân viên khác qua Socket.IO event `handoff:ticketRemoved`.
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: handoffToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nhận ticket thành công, trả về phòng chat
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status: "active"
 *               handoffToken: "handoff_session_xxx_123"
 *               room:
 *                 _id: "6a38fe7690183e2f4d6352ef"
 *                 loaiPhong: "private"
 *               agentInfo:
 *                 agentId: "6a38fafec407c6b22a90ed0b"
 *                 agentName: "Trinh Ngoc"
 *       403:
 *         description: Chỉ nhân viên mới có thể nhận ticket
 *       409:
 *         description: Ticket đã được nhân viên khác nhận
 */

/**
 * @swagger
 * /api/ai-chat/handoff/{handoffToken}/status:
 *   get:
 *     summary: 📊 Kiểm tra trạng thái handoff session
 *     description: |
 *       Frontend polling để biết nhân viên đã tham gia chưa.
 *
 *       **Trạng thái có thể có:**
 *       - `pending` – Đang chờ nhân viên nhận
 *       - `active`  – Nhân viên đã tham gia, đang chat
 *       - `resolved` – Cuộc hội thoại đã kết thúc
 *       - `timeout`  – Hết thời gian chờ (>10 phút không có nhân viên)
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: handoffToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Token từ bước POST /api/ai-chat/handoff
 *         example: "handoff_session_1719030000003_1719030050000"
 *     responses:
 *       200:
 *         description: Trạng thái hiện tại của handoff session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 handoffToken:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, active, resolved, timeout]
 *                 agentInfo:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     agentId:
 *                       type: string
 *                     agentName:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                 queuePosition:
 *                   type: number
 *                 estimatedWaitTime:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             examples:
 *               pending:
 *                 summary: Đang chờ nhân viên
 *                 value:
 *                   success: true
 *                   handoffToken: "handoff_session_1719030000003_1719030050000"
 *                   status: "pending"
 *                   agentInfo: null
 *                   queuePosition: 1
 *                   estimatedWaitTime: "1-3 phút"
 *                   timestamp: "2025-06-22T04:31:00.000Z"
 *               active:
 *                 summary: Nhân viên đã tham gia
 *                 value:
 *                   success: true
 *                   handoffToken: "handoff_session_1719030000003_1719030050000"
 *                   status: "active"
 *                   agentInfo:
 *                     agentId: "AGENT_001"
 *                     agentName: "Nguyễn Văn Sale"
 *                     avatar: "https://example.com/agent.jpg"
 *                   queuePosition: 0
 *                   estimatedWaitTime: null
 *                   timestamp: "2025-06-22T04:31:30.000Z"
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/ai-chat/human/send:
 *   post:
 *     summary: 👤 Nhân viên gửi tin nhắn đến khách hàng
 *     description: |
 *       Sau khi handoff session được tạo và nhân viên nhận case, nhân viên dùng endpoint
 *       này để gửi tin nhắn trực tiếp cho khách.
 *
 *       Trong production, tin nhắn sẽ được broadcast qua **Socket.IO** đến phiên chat
 *       của khách hàng theo `handoffToken`.
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HumanSendRequest'
 *           examples:
 *             agent_greeting:
 *               summary: Nhân viên chào hỏi khách
 *               value:
 *                 handoffToken: "handoff_session_1719030000003_1719030050000"
 *                 agentId: "AGENT_001"
 *                 agentName: "Nguyễn Văn Sale"
 *                 message: "Xin chào! Tôi là Văn Sale, nhân viên hỗ trợ. Bạn muốn thương lượng giá căn hộ nào ạ?"
 *                 sessionId: "session_1719030000003"
 *             agent_offer:
 *               summary: Nhân viên đưa ra giá mới
 *               value:
 *                 handoffToken: "handoff_session_1719030000003_1719030050000"
 *                 agentId: "AGENT_001"
 *                 agentName: "Nguyễn Văn Sale"
 *                 message: "Dựa trên thời gian thuê, tôi có thể hỗ trợ giảm 500.000 VNĐ/tháng nếu bạn ký hợp đồng 12 tháng."
 *                 sessionId: "session_1719030000003"
 *     responses:
 *       200:
 *         description: Tin nhắn được gửi thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               messageId: "msg_1719030100000"
 *               handoffToken: "handoff_session_1719030000003_1719030050000"
 *               sessionId: "session_1719030000003"
 *               sender:
 *                 type: "human_agent"
 *                 agentId: "AGENT_001"
 *                 agentName: "Nguyễn Văn Sale"
 *               message: "Xin chào! Tôi là Văn Sale..."
 *               deliveredAt: "2025-06-22T04:31:40.000Z"
 *       400:
 *         description: Thiếu trường bắt buộc
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "handoffToken, agentId và message là bắt buộc"
 *       500:
 *         description: Lỗi server
 */
