Định vị sản phẩm
Batdongsan-like (cá nhân):
Khách tìm nhà → xem tin → liên hệ / đặt lịch với chủ đăng.
Bạn = vận hành sàn (duyệt tin, quản lý user), không ôm lịch thay chủ.

## Property JSON — `chuNha` chỉ ở **response**

### POST `/api/property` — body chỉ cần `nguoiDungId` (string)

Không gửi object `chuNha`. Server check user + role `chu_tro` | `admin`, rồi tự gắn chủ tin.

```json
{
  "tieuDe": "Căn hộ Vinhomes cần giờ",
  "moTa": "...",
  "loaiBds": "can_ho",
  "gia": 6500000000,
  "dienTich": 82,
  "diaChi": "208 Nguyễn Hữu Cảnh",
  "tinhThanh": "TP.HCM",
  "quanHuyen": "Bình Thạnh",
  "anhDaiDien": "https://...",
  "gallery": [],
  "phongNgu": 2,
  "phongTam": 2,
  "choDauXe": 1,
  "nguoiDungId": "6a148ef2908ad8cfab42f70e",
  "thongTinChiTiet": {
    "tang": "Tầng 18",
    "huong": "Đông Nam",
    "banCong": true,
    "noiThat": "Full nội thất cao cấp"
  }
}
```

### Response (list / detail / create) — có `chuNha`

```json
{
  "_id": "6a3cd14ec7cec86b41a853df",
  "tieuDe": "Căn hộ Vinhomes cần giờ",
  "slug": "can-ho-vinhomes-can-gio",
  "gia": 6500000000,
  "nguoiDungId": {
    "_id": "6a148ef2908ad8cfab42f70e",
    "ten": "Nguyễn Văn Tay",
    "email": "taydev1@gmail.com",
    "soDienThoai": "0846777900",
    "vaiTro": { "ten": "chu_tro" }
  },
  "chuNha": {
    "_id": "6a148ef2908ad8cfab42f70e",
    "ten": "Nguyễn Văn Tay",
    "email": "taydev1@gmail.com",
    "soDienThoai": "0846777900",
    "vaiTro": { "ten": "chu_tro" }
  }
}
```

---

Phase 0 — Chốt khung (1–2 ngày)
Viết 1 đoạn định vị vào docs/ (sàn đa chủ, lịch với chủ tin).
Role rõ:
nguoi_thue: tìm, thích, đặt lịch, chat
chu_tro: đăng tin, nhận/duyệt lịch
admin (+ nhan_vien sau): duyệt tin, khóa user
Không thêm module mới cho đến khi luồng lõi chạy end-to-end trên FE.
Phase 1 — Lõi sàn (ưu tiên cao, ~2–3 tuần)
Giống Batdongsan phần “tìm + đăng + liên hệ”:

Việc	Mục tiêu	Bạn đã có
Đăng / sửa / xóa tin
Chỉ chu_tro (hoặc admin)
Property CRUD gần đủ
Tìm kiếm + lọc
Quận, giá, loại, phòng ngủ, diện tích
Filter cơ bản
Chi tiết tin + slug SEO
URL đẹp, chia sẻ được
Slug có rồi
Yêu thích
Lưu tin
Favorite có
Đặt lịch với chủ tin
nguoi_thue tạo; chu_tro xác nhận/hủy tin của mình
Viewing có, thiếu auth/phân quyền
Hồ sơ tác giả
Card chủ đăng + SĐT/chat
/author vừa thêm
Done khi: 1 khách đặt lịch → 1 chủ thấy & duyệt được trên dashboard riêng.

Phase 2 — Trải nghiệm sàn (2–3 tuần)
Việc	Giống Batdongsan ở chỗ
Upload ảnh gallery
Tin có nhiều ảnh thật
Bản đồ / tọa độ (lat-lng)
Xem vị trí trên map
Sắp xếp tin
Mới nhất, giá tăng/giảm
Trạng thái tin
Đang bán/thuê, đã thuê, ẩn, chờ duyệt
Thông báo
Chủ nhận tin khi có lịch / tin nhắn
Chat 1-1 khách ↔ chủ
Trao đổi trước khi xem nhà
Bạn đã có chat + notification — Phase 2 chủ yếu nối đúng luồng (mở chat từ tin / từ lịch), không build lại từ đầu.

Phase 3 — Vận hành sàn (1–2 tuần)
Việc	Lý do
Admin duyệt tin trước khi public
Chống tin rác
Khóa user / ẩn tin
An toàn tối thiểu
Báo cáo tin vi phạm
Cần khi mở cho người ngoài
Quota đăng tin / giới hạn ảnh
Tránh spam
nhan_vien + AI handoff để sau — Batdongsan cốt lõi không phụ thuộc chatbot.

Phase 4 — Nâng cao (khi lõi ổn)
Gợi ý tin tương tự / AI tư vấn (bạn đã có CRM AI)
Đánh giá chủ / tin (Rating đã có phác)
Tin VIP / đẩy top (monetize)
App mobile / PWA
SEO landing theo quận, loại BĐS
Thứ tự làm API gần nhất (đừng nhảy lung tung)
Auth bắt buộc trên viewing + property create/update/delete
Chủ chỉ CRUD lịch/tin của mình
GET /viewing?as=chu_tro (lịch các tin của tôi)
Trạng thái tin: cho_duyet → dang_hoat_dong
Notify chủ khi có lịch mới
Deep-link chat từ property/viewing
Cắt bỏ / để sau (đừng ôm sớm)
Marketplace thanh toán cọc online
Hợp đồng điện tử
CRM nhân viên full như công ty môi giới
Clone hết filter/UI Batdongsan
Milestone kiểm tra
Mốc	Câu hỏi
M1
Khách tìm → xem → đặt lịch được chưa?
M2
Chủ đăng tin → nhận lịch → chat được chưa?
M3
Admin ẩn tin / khóa user được chưa?
M4
Có người lạ thật dùng thử chưa?
