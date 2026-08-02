# Lộ trình cải thiện bảo mật & chống tải

Tài liệu làm việc từng bước. Đánh dấu `[x]` khi xong.  
**Cập nhật tiến độ: 2026-08-03 (đêm) — Phase 1.1 IDOR xong**

**Mục tiêu:** vá lỗ hổng theo độ ưu tiên, rồi tăng khả năng chống spam/DDoS vừa phải.  


Liên quan:
- [`security.md`](./security.md) — đã vá  
- [`OPS_PHASE0_CLOUDFLARE.md`](./OPS_PHASE0_CLOUDFLARE.md) + [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md) — ops tay  
- [`FE_OAUTH_EXCHANGE_PROMPT.md`](./FE_OAUTH_EXCHANGE_PROMPT.md) — FE OAuth  
- [`FE_CHAT_ROOM_IDOR_PROMPT.md`](./FE_CHAT_ROOM_IDOR_PROMPT.md) — FE chat room  

---

## Tiến độ tổng quan

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| Early fixes | Favorite, avatar, user privacy, viewings, auth rate-limit | ✅ |
| Phase 2 (P1) | helmet, swagger, role, JWT, SESSION_SECRET, json limit… | ✅ |
| 1.3 AI + human/send | Rate-limit AI; human/send staff | ✅ |
| 1.2 OAuth URL | code + `/oauth/exchange` | ✅ |
| Phase 3 (app) | Global + upload + contact RL | ✅ |
| **1.1 Chat IDOR** | Membership + bỏ tin body.userId | ✅ **Code xong** |
| **Phase 0** | Rotate secrets, Cloudinary, env Render | 🔶 Ops tay |
| **Phase 3 (ops)** | Cloudflare DNS/WAF + load test | 🔶 Ops / chưa test |
| **Phase 4 (P2)** | Cookie access token, audit log, Redis RL store… | ⚪ Chưa |

### Việc tiếp theo

1. **Ops Phase 0** — secrets + Cloudinary create + env Render  
2. **Phase 3 ops** — Cloudflare ([CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)) + load test nhẹ  
3. **FE sync** — OAuth exchange, chat bỏ `userId` body, xử lý 429  
4. **Phase 4** (khi rảnh) — Redis store RL, audit log, access cookie  

---

## Điểm hiện tại

| Tầng | Điểm | Ghi chú |
|------|------|---------|
| Auth / session | ★★★★ | Auth RL + JWT ngắn; OAuth exchange |
| Authorization | ★★★★ | Chat room đã khóa membership / staff |
| Data privacy | ★★★★ | User + chat: email chỉ staff |
| Abuse / DoS | ★★★☆ | App RL OK; Cloudflare chưa |
| Infra headers | ★★★★ | helmet, swagger off prod |
| Secrets / ops | ★★☆☆ | Còn rotate + Cloudinary + CF |

---

## Phase 1.1 — Chat room IDOR ✅

- [x] `GET /api/room` — user: chỉ phòng mình; staff: tất cả  
- [x] `GET /api/room/user/:userId` — self hoặc staff  
- [x] `GET /api/room/:id` — membership hoặc staff  
- [x] Writes: identity = JWT (`attachAuthUser`); không tin `body.userId`  
- [x] Populate: `ten anhDaiDien` (staff thêm email)  
- [x] Helper `roomAccess.js` + unit tests  
- [x] Prompt FE: [`FE_CHAT_ROOM_IDOR_PROMPT.md`](./FE_CHAT_ROOM_IDOR_PROMPT.md)  

---

## Phase 3 (ops) — Cloudflare + load test 🔶

- [ ] Làm theo [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md)  
- [ ] Proxy cam FE (+ `api.` khuyến nghị)  
- [ ] Bot Fight Mode  
- [ ] Load test 50→200 RPS (không 5000 vào origin)  

---

## Phase 4 (P2) ⚪

- [ ] Access token httpOnly cookie  
- [ ] Audit log admin  
- [ ] Redis store cho `express-rate-limit` (multi-instance)  
- [ ] Timeout / circuit breaker OpenRouter  
- [ ] Socket.IO Redis adapter nếu scale  

---

## Phase 0 — Ops 🔶

Chi tiết: [`OPS_PHASE0_CLOUDFLARE.md`](./OPS_PHASE0_CLOUDFLARE.md)

- [ ] Rotate secrets  
- [ ] Cloudinary quyền create  
- [ ] Render env (`SESSION_SECRET`, JWT, `NODE_ENV`)  

---

## Lịch sử

| Ngày | Thay đổi |
|------|----------|
| 2026-08-03 | Ship Phase 1.1 chat IDOR; next = ops CF + Phase 4 tùy chọn |
| 2026-08-03 | AI RL, OAuth exchange, global RL |
| 2026-08-03 | Ship P1 hardening |
| 2026-08-02 | Tạo lộ trình |
