# Prompt FE — Behavior Tracking & Lead Scoring (Batdongsan-style)

Copy block dưới đây sang chat FE / ticket triển khai.

```
Bạn là Senior Frontend Developer. Triển khai Behavior Tracking + Lead Scoring
theo API backend đã sẵn sàng (giống Batdongsan.com.vn).

Base URL: http://localhost:8000/api
Auth: Authorization: Bearer <accessToken> (khi đã login)

Response thống nhất (mọi API behavior/lead mới):
{
  "success": true | false,
  "message": string,
  "data": object | null
}

⚠️ KHÔNG dùng hệ thống Lead cũ /api/lead nữa.
Dùng hệ thống mới: PropertyBehavior + PropertyLead (endpoints bên dưới).

════════════════════════════════════════════════════════════
A. MỤC ĐÍCH
════════════════════════════════════════════════════════════
1) User/guest xem tin → FE ghi hành vi (behavior).
2) User đã login → BE tự cộng điểm Lead (score) + upsert 1 lead / viewer / tin.
3) Chủ tin (chu_tro) xem dashboard analytics + xếp hạng lead theo score.
4) Chủ tin cập nhật status / note của lead.

════════════════════════════════════════════════════════════
B. SESSION ID (bắt buộc với guest)
════════════════════════════════════════════════════════════
- Guest chưa login: luôn gửi sessionId.
- Tạo 1 lần, lưu localStorage key ví dụ: `re_session_id`.
- Giá trị: UUID (crypto.randomUUID() hoặc lib tương đương).
- Có thể gửi qua:
  - Body: { "sessionId": "..." }
  - hoặc Header: X-Session-Id: ...
- User đã login: không bắt buộc sessionId (viewerId lấy từ JWT),
  nhưng vẫn nên gửi sessionId để BE debounce ổn định.

Helper gợi ý:
function getSessionId() {
  let id = localStorage.getItem('re_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('re_session_id', id);
  }
  return id;
}

════════════════════════════════════════════════════════════
C. ACTIONS & ĐIỂM (BE đã config sẵn)
════════════════════════════════════════════════════════════
Action enum (string đúng chữ hoa):
IMPRESSION | VIEW_DETAIL | VIEW_IMAGE | VIEW_VIDEO |
SAVE_PROPERTY | SHARE_PROPERTY | VIEW_PHONE | CLICK_ZALO |
CHAT | CALL | BOOKING

Điểm cộng vào Lead (chỉ khi đã login — có viewerId):
IMPRESSION      = 0   (chỉ analytics, không tạo/cộng lead)
VIEW_DETAIL     = 1
VIEW_IMAGE      = 1
VIEW_VIDEO      = 2
SAVE_PROPERTY   = 5
SHARE_PROPERTY  = 3
VIEW_PHONE      = 10
CLICK_ZALO      = 15
CHAT            = 20
CALL            = 20
BOOKING         = 30

Quality (BE trả sẵn khi GET leads):
- score >= 30 → "high"
- score >= 15 → "medium"
- còn lại     → "low"

════════════════════════════════════════════════════════════
D. API 1 — GHI HÀNH VI (public / optional auth)
════════════════════════════════════════════════════════════
POST /api/property/:propertyId/behavior

Headers:
- Content-Type: application/json
- Authorization: Bearer <token>   // nếu đã login
- X-Session-Id: <uuid>            // optional nếu đã có trong body

Body:
{
  "action": "VIEW_DETAIL",
  "sessionId": "<uuid>",          // bắt buộc nếu chưa login
  "metadata": {
    "source": "detail_page",      // list | detail | search | related...
    "device": "mobile",           // mobile | desktop | tablet
    "imageIndex": 0,              // khi VIEW_IMAGE
    "duration": 12                // giây xem video / gallery
  }
}

Response 201 thành công:
{
  "success": true,
  "message": "Ghi nhận hành vi thành công",
  "data": {
    "behavior": {
      "_id": "...",
      "propertyId": "...",
      "action": "VIEW_PHONE",
      "createdAt": "..."
    },
    "lead": {                     // null nếu guest (chưa login)
      "_id": "...",
      "score": 10,
      "lastAction": "VIEW_PHONE",
      "status": "NEW",
      "actions": ["VIEW_PHONE"]
    },
    "pointsAdded": 10
  }
}

Response bị bỏ qua (vẫn 201, success=true) — FE không cần toast lỗi:
{
  "success": true,
  "message": "...",
  "data": { "skipped": true, "reason": "debounce" | "owner_self" }
}

Rules BE:
- Debounce ~5 giây: cùng action + cùng viewer/session → skipped debounce.
- Chủ tin tự xem bài mình → skipped owner_self (trừ IMPRESSION).
- Guest không login → chỉ ghi Behavior, lead=null (không có PropertyLead).
- Login → upsert PropertyLead (1 lead / property / viewer), cộng score, add action vào actions[].

Map UI → action (gọi fire-and-forget, không block UX):

| Sự kiện UI                         | action          | metadata gợi ý              |
|------------------------------------|-----------------|-----------------------------|
| Card tin xuất hiện viewport (list) | IMPRESSION      | source: "list"              |
| Vào trang chi tiết                 | VIEW_DETAIL     | source: "detail"            |
| Đổi ảnh gallery                    | VIEW_IMAGE      | imageIndex                  |
| Play / xem video                   | VIEW_VIDEO      | duration                    |
| Bấm Tim / Lưu tin                  | SAVE_PROPERTY   |                             |
| Share (FB/Zalo/copy link)          | SHARE_PROPERTY  | source: "facebook"|...     |
| Hiện / copy SĐT                    | VIEW_PHONE      |                             |
| Bấm nút Zalo                       | CLICK_ZALO      |                             |
| Mở chat                            | CHAT            |                             |
| Bấm gọi điện                       | CALL            |                             |
| Đặt lịch xem nhà thành công        | BOOKING         |                             |

Implement gợi ý:
- Tạo hook/service: trackBehavior(propertyId, action, metadata?)
- Dùng IntersectionObserver cho IMPRESSION (mỗi card 1 lần / session / tin).
- VIEW_DETAIL: gọi 1 lần khi mount detail page.
- Các nút CTA: gọi ngay onClick trước khi mở tel:/zalo/share.
- Không await để block UI; silent catch (chỉ log console).
- Có thể debounce client-side 3–5s thêm cho chắc (BE cũng debounce).

════════════════════════════════════════════════════════════
E. API 2 — DASHBOARD CHỦ TIN (Bearer + role chu_tro|admin|nhan_vien)
════════════════════════════════════════════════════════════
Chỉ chủ của tin (hoặc admin/nhan_vien) mới xem được. Role khác / không phải owner → 403.

────────────────────────────────
E1) Analytics (dashboard stats)
────────────────────────────────
GET /api/owner/properties/:propertyId/analytics?period=today|7d|30d

period mặc định: 7d
- today (hoặc 1d): từ 00:00 hôm nay
- 7d: 7 ngày gần nhất
- 30d: 30 ngày gần nhất

Response data:
{
  "period": "7d",
  "from": "ISO",
  "to": "ISO",
  "behaviors": {
    "impression": 120,
    "viewDetail": 45,
    "viewImage": 30,
    "viewVideo": 8,
    "save": 12,
    "share": 5,
    "phoneClick": 9,
    "zaloClick": 6,
    "chat": 3,
    "call": 2,
    "booking": 1,
    "raw": { "IMPRESSION": 120, "VIEW_DETAIL": 45, ... }
  },
  "leads": {
    "total": 18,
    "avgScore": 14.5,
    "maxScore": 48,
    "byStatus": {
      "NEW": 10,
      "CONTACTED": 4,
      "FOLLOWING": 2,
      "CLOSED": 1,
      "LOST": 1
    }
  }
}

UI gợi ý:
- Tabs/filter: Hôm nay | 7 ngày | 30 ngày
- Grid card số liệu: Impression, View Detail, Image, Video, Save, Share,
  Phone, Zalo, Chat, Call, Booking
- Sidebar/summary lead: total, avgScore, maxScore + pie/bar theo status

────────────────────────────────
E2) Lead ranking (quan trọng nhất)
────────────────────────────────
GET /api/owner/properties/:propertyId/leads?page=1&limit=20&status=NEW

Query:
- page, limit (mặc định page=1, limit=10, max 100)
- status (optional): NEW | CONTACTED | FOLLOWING | CLOSED | LOST
- sortBy (optional, mặc định score), sortOrder (desc|asc)

Response data.items[] mỗi phần tử:
{
  "_id": "leadId",
  "propertyId": "...",
  "ownerId": "...",
  "viewerId": {                 // populate user
    "_id": "...",
    "ten": "Nguyễn Văn A",
    "email": "...",
    "soDienThoai": "...",
    "anhDaiDien": "...",
    "vaiTro": { "ten": "nguoi_thue" }
  },
  "viewer": { ... },            // alias = viewerId (BE trả sẵn)
  "score": 37,
  "status": "NEW",
  "note": "",
  "lastAction": "CLICK_ZALO",
  "actions": ["VIEW_DETAIL", "VIEW_IMAGE", "VIEW_PHONE", "CLICK_ZALO"],
  "rank": 1,
  "quality": "high",            // high | medium | low
  "createdAt": "...",
  "updatedAt": "..."
}

UI Lead Ranking (giống Batdongsan):
┌─────────────────────────────────────────────┐
│ #1  Nguyễn Văn A          Score: 37  HIGH   │
│     0909xxx — nguoi_thue                    │
│     ✓ VIEW_DETAIL ✓ VIEW_IMAGE              │
│     ✓ VIEW_PHONE  ✓ CLICK_ZALO              │
│     Last: CLICK_ZALO                        │
│     [NEW ▾]  [Ghi chú...]                   │
└─────────────────────────────────────────────┘

- Sort mặc định theo score giảm dần (BE đã sort).
- Badge màu: high=đỏ/cam, medium=vàng, low=xám.
- Checkbox/tick list từ field actions[].
- Filter theo status.
- Pagination dùng data.pagination: { total, page, limit, totalPages }

────────────────────────────────
E3) Danh sách behavior thô (optional / debug)
────────────────────────────────
GET /api/owner/properties/:propertyId/behaviors?period=7d&action=VIEW_PHONE&page=1&limit=20

────────────────────────────────
E4) Cập nhật lead
────────────────────────────────
PATCH /api/owner/leads/:leadId/status
Body: { "status": "CONTACTED" }
status: NEW | CONTACTED | FOLLOWING | CLOSED | LOST

PATCH /api/owner/leads/:leadId/note
Body: { "note": "Đã gọi, hẹn chiều mai" }

════════════════════════════════════════════════════════════
F. ROUTE / PAGE GỢI Ý FE
════════════════════════════════════════════════════════════
Public:
- List / Search / Related cards → track IMPRESSION
- /property/:id (detail) → VIEW_DETAIL + gallery/video/CTA

Owner dashboard (chu_tro):
- /owner/properties/:id/analytics  → GET analytics
- /owner/properties/:id/leads      → GET leads ranking
- Lead row actions → PATCH status / note

════════════════════════════════════════════════════════════
G. ERROR HANDLING
════════════════════════════════════════════════════════════
- 400: thiếu sessionId (guest) / action invalid
- 401: chưa login (owner APIs)
- 403: không phải chủ tin
- 404: property / lead không tồn tại

Track behavior: fail silent (không hiện toast lỗi cho user thường).
Owner dashboard: hiện message từ response.message.

════════════════════════════════════════════════════════════
H. CHECKLIST TRIỂN KHAI
════════════════════════════════════════════════════════════
[ ] Helper getSessionId() + luôn gửi khi track
[ ] Service trackBehavior(propertyId, action, metadata?)
[ ] List: IntersectionObserver → IMPRESSION (1 lần/card/session)
[ ] Detail mount → VIEW_DETAIL
[ ] Gallery / video / save / share / phone / zalo / chat / call / booking
[ ] Không track trên bài của chính mình (BE cũng skip; FE có thể skip sớm)
[ ] Owner: analytics tabs today|7d|30d
[ ] Owner: lead ranking theo score + quality badge + actions ticks
[ ] Owner: PATCH status + note
[ ] Không gọi /api/lead cũ
[ ] Auth header đúng khi đã login
```

## Ghi chú nội bộ BE

- Mount: `POST /api/property/:id/behavior`, owner APIs dưới `/api/owner/...`
- Collection riêng: `PropertyBehavior`, `PropertyLead` (không tạo PropertyPost).
- Lead chỉ tạo khi `viewerId` có (user đã login).
- File liên quan: `behaviorTrackingService.js`, `PropertyBehavior.js`, `PropertyLead.js`.
