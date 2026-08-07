# Triển khai: Thêm TV nhóm · Typing / Presence · Tìm tin nhắn

Hướng dẫn triển khai end-to-end (BE đã có code → deploy → FE).  
Prompt chi tiết contract API/Socket: `[FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md](./FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md)`.

---

## Tổng quan


| #   | Tính năng                        | BE                       | FE               |
| --- | -------------------------------- | ------------------------ | ---------------- |
| 1   | Thêm thành viên vào nhóm sau tạo | ✅ REST + Socket          | UI + gọi API     |
| 2   | Typing + online presence         | ✅ Socket + REST presence | Listen/emit + UI |
| 3   | Tìm kiếm trong tin nhắn          | ✅ REST (đã sửa `roomId`) | Search panel     |


---

## Bước 1 — Kiểm tra BE local

1. Pull / checkout branch có thay đổi chat mới nhất.
2. Cài dependency (nếu chưa):
  ```bash
   npm install
  ```
3. Chạy unit test liên quan:
  ```bash
   npm run test:chat
   # hoặc
   node --test tests/unit/chat/**/*.test.js
  ```
4. Start server:
  ```bash
   npm run dev
  ```
5. Smoke test nhanh (thay `TOKEN`, `ROOM_ID`, `USER_ID`):
  **Thêm thành viên**
   **Presence**
   **Search tin**
6. Socket (dùng client FE hoặc Postman Socket.IO):
  - Connect + `auth.token`
  - `joinRoom` → `typing:start` / `typing:stop`
  - `presence:room` → nhận `presence:state`

---



## Bước 2 — Deploy BE (Render / server)

1. Commit + push code BE.
2. Deploy service API.
3. Env cần có (đã dùng sẵn, không bắt buộc biến mới cho 3 feature này):
  ```bash
   JWT_ACCESS_KEY=…
   CLIENT_URL=…          # CORS + cookie
   # Redis chỉ cần nếu bật multi-instance Socket / RL store
   # REDIS_URL=…
   # SOCKET_REDIS_ADAPTER=true
  ```
4. Sau deploy: lặp lại smoke `curl` ở **Bước 1** với URL production.
5. Nếu login bị 429: xác nhận đã deploy bản skip auth khỏi global rate-limit; đợi ~1 phút hoặc restart.

---



## Bước 3 — File / module BE đã đụng (tham chiếu)


| File                                                         | Vai trò                                     |
| ------------------------------------------------------------ | ------------------------------------------- |
| `src/modules/chat/controllers/roomChatController.js`         | `addMemberToRoom` (bulk), `getRoomPresence` |
| `src/modules/chat/routes/room.routes.js`                     | `POST …/add-member`, `GET …/presence`       |
| `src/modules/chat/services/messageService.js`                | `searchMessages` (+ `q`, escape regex)      |
| `src/modules/chat/controllers/messageController.js`          | Truyền `roomId` từ params                   |
| `src/infrastructure/realtime/handlers/presenceHandlers.js`   | typing + presence socket                    |
| `src/infrastructure/realtime/handlers/memberHandlers.js`     | `addMember` bulk + emit cá nhân             |
| `src/infrastructure/realtime/handlers/connectionHandlers.js` | Đăng ký presence handlers                   |
| `src/infrastructure/realtime/state/connectionState.js`       | `isUserOnline`, `presence:update`           |
| `src/infrastructure/realtime/ioInstance.js`                  | `getConnectionState` cho REST presence      |
| `docs/FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md`                | Contract cho FE                             |


---



## Bước 4 — Triển khai FE (theo thứ tự)

Giao prompt `[FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md](./FE_CHAT_MEMBER_TYPING_SEARCH_PROMPT.md)` cho repo FE.

### 4.1 Thêm thành viên nhóm

1. Màn **chi tiết nhóm** / settings: nút “Thêm thành viên” (chỉ hiện nếu user là **admin nhóm**).
2. Modal chọn 1 hoặc nhiều user (gọi API employee/user sẵn có).
3. `POST /api/room/:roomId/add-member` với `userIds` hoặc `newMemberId`.
4. Listen socket:
  - `memberAdded` → cập nhật danh sách thành viên trong UI
  - `roomCreated` (phía user được thêm) → đưa nhóm vào inbox
5. Toast: số `added`, hiện `skipped` nếu có.



### 4.2 Typing + presence

1. Khi mở room: `joinRoom(roomId)` rồi `presence:room`.
2. Input chat:
  - Debounce gõ → `typing:start`
  - Dừng / blur / gửi tin → `typing:stop`
3. Listen `typing` → hiện “Đang nhập…” (auto-hide ~3s).
4. Listen `presence:update` / `userStatus` → chấm xanh avatar.
5. Fallback REST: `GET /api/room/:roomId/presence` khi reconnect.



### 4.3 Tìm kiếm tin nhắn

1. Icon search trên header phòng → panel.
2. Debounce 300ms → `GET /api/message/:roomId/search?q=…&limit=30`.
3. Render list; highlight keyword; click → scroll tới tin (optional).
4. Xử lý 400 nếu `q` < 2 ký tự (BE yêu cầu).

---



## Bước 5 — Checklist nghiệm thu



### BE

- [ ] `POST add-member` 1 user + nhiều `userIds` OK
- [ ] User mới nhận noti / socket, thấy nhóm trong list
- [ ] Non-admin nhóm → 403 khi add-member
- [ ] `typing` chỉ broadcast trong room đã `joinRoom`
- [ ] `GET presence` + `presence:room` trả đúng online
- [ ] `GET …/search?q=` trả đúng phòng (không rỗng do thiếu roomId)



### FE

- [ ] UI thêm TV sau tạo / trong nhóm
- [ ] Chấm online + “đang nhập”
- [ ] Search trong phòng hoạt động trên staging



### Ops

- [ ] Deploy BE production
- [ ] CORS / cookie vẫn login được (`credentials: 'include'` nếu dùng cookie)
- [ ] Không regress chat gửi/nhận tin thường

---



## Bước 6 — Rollback nhanh (nếu lỗi)

1. FE: ẩn nút “Thêm TV” / search / typing UI (feature flag hoặc comment call).
2. BE: revert commit chứa presence/search/add-member bulk; redeploy.
3. API cũ vẫn: `POST …/add-member` với 1 `newMemberId`; search cũ lỗi roomId — nên giữ bản mới.

---



## Thứ tự ưu tiên đề xuất

1. Deploy BE
2. FE **search** (ít phụ thuộc socket)
3. FE **add member**
4. FE **typing + presence** (cần socket ổn)

---



## Liên quan

- Giải tán nhóm / xóa chat admin: `[FE_CHAT_GROUP_DISBAND_PROMPT.md](./FE_CHAT_GROUP_DISBAND_PROMPT.md)`  
- Auth cookie: `[FE_AUTH_COOKIE_PROMPT.md](./FE_AUTH_COOKIE_PROMPT.md)`  
- Security overview: `[security.md](./security.md)`

