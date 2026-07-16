/**
 * @swagger
 * /socket.io:
 *   description: WebSocket events for real-time messaging and AI handoff
 *   events:
 *     - name: joinRoom
 *       description: Tham gia phòng chat
 *       parameters:
 *         - name: roomId
 *           type: string
 *           description: ID của phòng chat
 *     - name: message:create
 *       description: Tạo tin nhắn mới trong phòng
 *       parameters:
 *         - name: data
 *           schema:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: string
 *               noiDung:
 *                 type: string
 *     - name: message:new
 *       description: Server broadcast tin nhắn mới tới phòng
 *     - name: handoff:join
 *       description: Khách join room chờ handoff (cần handoffToken)
 *       parameters:
 *         - name: handoffToken
 *           type: string
 *     - name: handoff:accepted
 *       description: Server thông báo nhân viên đã nhận ticket, trả room + agentInfo
 *     - name: handoff:newTicket
 *       description: Server gửi ticket mới tới nhân viên online (vaiTro nhan_vien)
 *     - name: handoff:pendingList
 *       description: Server gửi danh sách ticket đang chờ khi nhân viên connect
 *     - name: handoff:accept
 *       description: Nhân viên nhận ticket
 *       parameters:
 *         - name: handoffToken
 *           type: string
 *     - name: handoff:acceptSuccess
 *       description: Server xác nhận nhận ticket thành công, trả room
 *     - name: handoff:ticketRemoved
 *       description: Ticket đã được nhân viên khác nhận, xóa khỏi UI
 *     - name: handoff:notificationRemoved
 *       description: Xóa thông báo bell khi ticket được nhận
 *     - name: handoff:list
 *       description: Nhân viên yêu cầu refresh danh sách ticket chờ
 *     - name: newNotification
 *       description: Thông báo mới (loai handoff_ticket cho ticket AI handoff)
 */
