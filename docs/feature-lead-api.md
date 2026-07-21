# Prompt FE — Lead tracking (khách quan tâm tin đăng)

```
Triển khai FE Lead tracking với API http://localhost:8000/api/lead
Auth: Authorization: Bearer <accessToken>

════════════════════════════════════
MỤC ĐÍCH
════════════════════════════════════
Khi nguoi_thue (hoặc user khác) xem / gọi / Zalo / chat / đặt lịch trên tin đăng,
BE ghi lead → chủ tin (chu_tro) xem danh sách khách kèm SĐT, tên, email.

Lead fields:
propertyId, ownerId, viewerId, type, status, note, createdAt

type: VIEW | PHONE | ZALO | CHAT | BOOKING
status: NEW | CONTACTED | CLOSED

════════════════════════════════════
1) GHI LEAD (người xem tin)
════════════════════════════════════
POST /api/lead
Body:
{ "propertyId": "<id_tin>", "type": "VIEW", "note": "" }

- Khi vào trang chi tiết tin (đã login): gọi type=VIEW (BE chống spam 24h)
- Bấm gọi: type=PHONE
- Bấm Zalo: type=ZALO
- Bấm chat: type=CHAT
- Đặt lịch xem: type=BOOKING (có thể gọi kèm POST /api/viewing)

viewerId = JWT; ownerId = chủ bài (BE tự lấy). Không gửi ownerId/viewerId.

Response 201: { message, data } — data.viewer = thông tin người xem

════════════════════════════════════
2) DASHBOARD CHỦ TIN — danh sách lead
════════════════════════════════════
GET /api/lead?page=1&limit=20
Bearer token role chu_tro | admin | nhan_vien

Query: propertyId, type, status, page, limit

Response:
{
  "message": "...",
  "data": [{
    "_id": "...",
    "type": "PHONE",
    "status": "NEW",
    "note": "",
    "propertyId": { "_id":"...", "tieuDe":"..." },
    "viewer": {
      "_id": "...",
      "ten": "...",
      "email": "...",
      "soDienThoai": "...",
      "vaiTro": { "ten": "nguoi_thue" }
    },
    "createdAt": "..."
  }],
  "pagination": { "total", "page", "limit", "totalPages" }
}

════════════════════════════════════
3) CẬP NHẬT
════════════════════════════════════
PATCH /api/lead/:id/status  { "status": "CONTACTED" }
PATCH /api/lead/:id/note    { "note": "Đã gọi, hẹn chiều" }
GET   /api/lead/:id

════════════════════════════════════
4) MAP UI
════════════════════════════════════
- Trang chi tiết tin (login): mount → POST lead VIEW
- Nút gọi / Zalo / Chat / Đặt lịch → POST lead type tương ứng
- Dashboard chủ: /dashboard/leads → GET /api/lead
- Filter theo tin / type / status

════════════════════════════════════
5) CHECKLIST
════════════════════════════════════
[ ] Chỉ gọi create lead khi đã login
[ ] Không tạo lead trên bài của chính mình (BE trả 400)
[ ] Chủ tin đọc GET /api/lead (không dùng cho nguoi_thue)
[ ] Hiện viewer.ten + viewer.soDienThoai trên dashboard
```
