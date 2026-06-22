# AI Chat Handoff — Tóm tắt nhanh

Luồng: Khách chat AI → Handoff ticket → Notify `nhan_vien` realtime → Nhân viên accept → Phòng chat private.

**Tài liệu đầy đủ cho FE:** [docs/FE_HANDOFF_INTEGRATION.md](./docs/FE_HANDOFF_INTEGRATION.md)

**Code mẫu:**
- Người thuê: [docs/examples/tenant-handoff.client.js](./docs/examples/tenant-handoff.client.js)
- Nhân viên: [docs/examples/agent-handoff.client.js](./docs/examples/agent-handoff.client.js)

## API endpoints

| Method | Endpoint | Ai gọi |
|--------|----------|--------|
| POST | `/api/ai-chat/message` | Người thuê (kèm `userId`) |
| POST | `/api/ai-chat/handoff` | Người thuê |
| GET | `/api/ai-chat/handoff/:token/status` | Người thuê |
| GET | `/api/ai-chat/handoff/pending` | Nhân viên (JWT) |
| POST | `/api/ai-chat/handoff/:token/accept` | Nhân viên (JWT) |

## Socket events chính

- Khách: `handoff:join` → listen `handoff:accepted`
- Nhân viên: listen `handoff:newTicket`, `handoff:pendingList` → emit `handoff:accept`
- Chat room: `joinRoom` → `message:create` / `message:new`
