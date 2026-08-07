# FE Prompt — @Mention · Chat Home (upload/typing/reply/unread) · WebRTC ICE

BE đã cập nhật. FE `/chat` làm theo contract này.

---

## A) @ Mention trong group chat

### Gửi tin (REST hoặc Socket)

```http
POST /api/message
Content-Type: multipart/form-data | application/json

{
  "roomId": "...",
  "noiDung": "Chào @[Nguyen Van A](507f1f77bcf86cd799439011) xem giúp",
  "mentions": ["507f1f77bcf86cd799439011"],
  "phanHoiTinNhan": "<messageId optional>",
  "tapTin": []
}
```

- `mentions`: mảng userId (khuyến nghị FE gửi rõ).
- Hoặc parse từ text: `@[Tên](userId)` hoặc `@userId` (24 hex).
- BE **chỉ giữ** user là thành viên active của phòng (trừ người gửi).



### Response message

```json
{
  "mentions": [{ "_id": "...", "ten": "...", "anhDaiDien": "..." }],
  "phanHoiTinNhan": { "_id", "noiDung", "nguoiGuiId": { "ten", "anhDaiDien" } },
  ...
}
```



### Socket events


| Event             | Khi nào                                            |
| ----------------- | -------------------------------------------------- |
| `message:new`     | Tin mới (như cũ)                                   |
| `mention:new`     | Chỉ user được @ — `{ roomId, tinNhanId, message }` |
| `newNotification` | `loai: "mention"`                                  |
| `unread:bump`     | `{ roomId, delta: 1, loai: "mention" }`            |




### UI

- Autocomplete thành viên nhóm khi gõ `@`.
- Highlight mention trong bubble.
- Click mention → profile / scroll.
- Toast / badge riêng khi nhận `mention:new`.

---



## B) Home `/chat` — sửa 4 điểm yếu



### 1. Upload thật (không fake)

```http
POST /api/message   # multipart field "tapTin" (file) — Cloudinary → local fallback
# hoặc
POST /api/upload/chat-audio  → lấy data.url → gửi message với tapTin: [url], loaiTinNhan: "audio"
```

Socket `message:create` chỉ nhận **URL đã upload** (không gửi binary qua socket).

### 2. Typing thật

```js
// Đã joinRoom(roomId)
socket.emit('typing:start', { roomId })
socket.emit('typing:stop', { roomId })
socket.on('typing', ({ roomId, userId, isTyping }) => { … })
```

Bỏ typing fake local-only.

### 3. Reply đúng

Gửi **ID tin gốc** (string), không gửi object thiếu `_id`:

```js
// REST / Socket
{ roomId, noiDung, phanHoiTinNhan: repliedMessage._id }
```

BE trả snapshot:

```json
"phanHoiTinNhan": { "_id", "noiDung", "nguoiGuiId": { "ten", "anhDaiDien" } }
```

Socket `message:create` giờ dùng cùng pipeline REST (không còn bug bỏ snapshot).

### 4. Unread ≠ 0

**Nguyên nhân cũ:** swagger `/notifications` vs mount `/notification`; REST create không emit; list phòng không có `unreadCount`.

**BE mới:**

```http
GET /api/notification/unread
GET /api/notifications/unread   # alias

→ { "count": 5, "byRoom": { "<roomId>": 2 }, "data": [ … ] }

# Legacy array:
GET /api/notification/unread?format=array
```

```http
GET /api/room
GET /api/room/user/:id
→ mỗi phòng có "unreadCount": number
```

```http
PUT /api/notification/room/:roomId/read
# Khi mở phòng — reset badge phòng đó
```

Socket: `unread:bump` `{ roomId, delta, loai }` — FE cộng dồn badge.

---



## C) WebRTC — TURN + mọi ngữ cảnh 1:1



### ICE servers

```http
GET /api/webrtc/ice-servers
→ {
  "iceServers": [ { "urls": "stun:…" }, { "urls": "turn:…", "username", "credential" } ],
  "hasTurn": true|false,
  "callModes": {
    "privateDm": true,
    "groupOneToOne": true,
    "cskhOneToOne": true,
    "groupConference": false
  }
}
```

Env BE (Render):

```bash
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
WEBRTC_TURN_URLS=turn:your-turn:3478
WEBRTC_TURN_USERNAME=…
WEBRTC_TURN_CREDENTIAL=…
```



### Call flow (đã hỗ trợ)

- **DM nội bộ** (`noi_bo`), **CSKH** (`ho_tro_khach`), **trong nhóm** — vẫn **1:1** (`call:invite` + `targetUserId` phải là member).
- `call:invite` / `call:ringing` kèm `iceServers` + `boiCanh` / `loaiPhong`.
- **Chưa** có hội nghị nhóm (SFU) — `groupConference: false`.



### FE

```js
const { iceServers } = await api.get('/api/webrtc/ice-servers')
const pc = new RTCPeerConnection({ iceServers })
// hoặc dùng iceServers từ call:invite payload
```

Bật nút gọi trên: DM nội bộ, ticket CSKH, và 1-1 từ nhóm (chọn 1 thành viên).

---



## Checklist FE `/chat`

- [ ] @ autocomplete + gửi `mentions` / format `@[ten](id)`
- [ ] Upload file qua multipart hoặc `/upload/chat-audio`
- [ ] Typing socket thật
- [ ] Reply bằng `_id` string
- [ ] Unread: dùng `{ count, byRoom }` + `unreadCount` trên room list + `PUT …/room/:id/read`
- [ ] WebRTC: fetch ICE; TURN env trên BE; gọi 1:1 DM / CSKH / trong nhóm



## Không làm

- Không giả upload / typing chỉ local.
- Không conference nhóm cho đến khi BE có SFU.
- Không hardcode ICE không có TURN trên production NAT.

