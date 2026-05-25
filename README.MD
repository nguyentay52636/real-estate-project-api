# Real Estate Project API

Backend API cho nền tảng **quản lý và cho thuê bất động sản**, hỗ trợ nhiều vai trò người dùng (admin, nhân viên, chủ trọ, người thuê), tin nhắn real-time qua Socket.IO, và tài liệu API qua Swagger.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ](#công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Vai trò & phân quyền](#vai-trò--phân-quyền)
- [Các module chức năng](#các-module-chức-năng)
- [Mô hình dữ liệu](#mô-hình-dữ-liệu)
- [API REST](#api-rest)
- [Socket.IO (real-time)](#socketio-real-time)
- [Cài đặt & chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [Tài liệu API](#tài-liệu-api)

---

## Tổng quan

Dự án là **REST API + WebSocket server** xây trên Node.js và Express 5, kết nối **MongoDB** qua Mongoose. Các tính năng chính:

| Nhóm | Mô tả |
|------|--------|
| **Xác thực** | Đăng ký, đăng nhập, JWT access/refresh, quên/đặt lại mật khẩu, đăng nhập Facebook OAuth |
| **Bất động sản** | CRUD tin đăng, lọc theo quận/huyện, gallery, tiện ích, trạng thái cho thuê |
| **Người dùng & vai trò** | Quản lý user, admin/nhân viên/chủ trọ/khách hàng |
| **Tương tác** | Yêu thích, đánh giá, lịch xem nhà |
| **Chat** | Phòng chat 1-1 & nhóm, tin nhắn (text/file), gọi audio/video, thông báo |
| **Real-time** | Socket.IO đồng bộ phòng, tin nhắn, trạng thái online |

Base URL API: `http://localhost:8000/api`  
Swagger UI: `http://localhost:8000/api-docs`

---

## Công nghệ

| Thành phần | Thư viện |
|------------|----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT, bcrypt, Passport (Facebook) |
| Real-time | Socket.IO 4 |
| Upload | Multer (`uploads/`) |
| Email | Nodemailer (Gmail SMTP) |
| API docs | Swagger (swagger-jsdoc, swagger-ui-express) |
| Validation | Joi |
| Khác | cors, cookie-parser, express-session, express-rate-limit, crypto-js |

---

## Cấu trúc thư mục

```
real-estate-project-api/
├── index.js                 # Entry: HTTP server, CORS, session, routes, Socket
├── config/
│   ├── db.js                # Kết nối MongoDB
│   ├── passport.js          # Facebook OAuth strategy
│   └── response.js          # Chuẩn hóa response
├── controllers/             # Logic nghiệp vụ theo module
├── models/                  # Mongoose schemas
├── routes/                  # Định tuyến REST → /api/*
├── middleware/
│   ├── authValidation.js    # Validate input (Joi)
│   └── upload.js            # Upload ảnh/video/PDF
├── socket/
│   └── SocketServer.js      # Socket.IO events & JWT middleware
├── swagger/                 # Mô tả OpenAPI từng module
├── services/
│   └── facebook.services.js # Tích hợp Facebook Graph API
└── utils/
    ├── jwt.js               # Access & refresh token
    └── sendMail.js          # Gửi mail reset password
```

---

## Vai trò & phân quyền

Model `VaiTro` định nghĩa 4 vai trò:

| `ten` | Mô tả |
|-------|--------|
| `admin` | Quản trị hệ thống |
| `nhan_vien` | Nhân viên sale / hỗ trợ (phòng ban, chức vụ trong `NhanVien`) |
| `chu_tro` | Chủ nhà — quản lý danh sách BĐS, thu nhập (`ChuNha`) |
| `nguoi_thue` | Khách thuê — hồ sơ khách hàng (`KhachHang`) |

Middleware `verifyToken` xác thực JWT qua header `token` hoặc `Authorization: Bearer <token>`. Một số route có thêm `verifyTokenAndAdminAuth`.

---

## Các module chức năng

### 1. Authentication (`/api/auth`)

- **Đăng ký / đăng nhập / đăng xuất** — hash mật khẩu bcrypt, phát JWT access (15 phút) và refresh (365 ngày), lưu `RefreshToken`
- **Quên mật khẩu** — token reset qua email (Nodemailer)
- **Facebook OAuth** — Passport strategy; callback redirect về `CLIENT_URL` (tùy chọn khi có `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`)
- Endpoint debug/test cấu hình Facebook

### 2. Bất động sản (`/api/property`)

Quản lý model `BatDongSan`:

- Loại: `can_ho`, `nha_nguyen_can`, `studio`, `penthouse`
- Thông tin: giá, diện tích, địa chỉ, tỉnh/thành, quận/huyện, phòng ngủ/tắm, chỗ đậu xe
- Media: `anhDaiDien`, `gallery`, `features`, `overlay`
- Trạng thái: `dang_hoat_dong`, `da_cho_thue`
- CRUD + lọc theo quận/huyện (`GET /:district`)

### 3. Người dùng (`/api/user`)

CRUD tài khoản `nguoiDung` (tên, email, tên đăng nhập, SĐT, vai trò, avatar, trạng thái `hoat_dong` / `khoa`).

### 4. Vai trò (`/api/role`)

`GET /` — danh sách vai trò hệ thống.

### 5. Chủ nhà (`/api/owner`)

Hồ sơ `ChuNha` gắn với `nguoiDung`: tổng BĐS, thu nhập, danh sách BĐS, điểm đánh giá trung bình. CRUD đầy đủ.

### 6. Khách hàng (`/api/customer`)

Hồ sơ `KhachHang`: địa chỉ, loại khách, chi tiêu, BĐS đang thuê/yêu thích, điểm đánh giá, ghi chú. CRUD đầy đủ.

### 7. Nhân viên (`/api/employee`)

Quản lý `NhanVien`: phòng ban (`sale`, `ho_tro_khach_hang`, …), chức vụ, lương, hiệu suất, ngày vào làm, trạng thái. Hỗ trợ tìm kiếm.

### 8. Yêu thích (`/api/favorite`)

Lưu/xóa BĐS yêu thích theo `nguoiDungId` + `batDongSanId` (`YeuThich`).

### 9. Đánh giá (`/api/review`)

CRUD `DanhGia`: sao 1–5, bình luận, theo user hoặc BĐS.

### 10. Lịch xem nhà (`/api/viewing`)

CRUD `LichXemNha`: đặt lịch xem BĐS, trạng thái `cho_xac_nhan` | `da_xac_nhan` | `da_huy`.

### 11. Phòng chat (`/api/room`)

- Phòng `private` (2 thành viên) hoặc `group`
- Tạo phòng, tìm/tạo phòng riêng, thêm thành viên, rời phòng, chuyển admin
- Gắn tin nhắn vào phòng, cập nhật/xóa phòng

### 12. Tin nhắn (`/api/message`)

- Lấy tin theo `roomId`, tạo/sửa/xóa/thu hồi tin
- Upload tối đa 5 file (JPEG, PNG, MP4, PDF) qua Multer
- Đánh dấu đã đọc, ghim/bỏ ghim, tìm kiếm trong phòng
- Tin nhắn cuộc gọi (`loaiTinNhan`: `cuoc_goi`)

### 13. Thông báo chat (`/api/notification`)

`ThongBaoChat`: `new_message`, `room_update`, `call` — đọc/xóa từng hoặc toàn bộ, đếm chưa đọc.

### 14. Socket.IO (`socket/SocketServer.js`)

Bổ sung real-time cho chat (JWT trong `handshake.auth.token`):

| Event | Chức năng |
|-------|-----------|
| `joinRoom` | Vào phòng, broadcast online/offline |
| `room:create`, `room:findOrCreatePrivate`, `room:update`, `room:delete` | Quản lý phòng |
| `addMember`, `leaveRoom`, `transferAdmin` | Thành viên & quyền admin |
| `message:create`, `message:update`, `message:delete`, `message:read` | Tin nhắn |
| `message:addToRoom`, `message:removeFromRoom` | Đồng bộ phòng ↔ tin |
| `call:create` | Cuộc gọi audio/video |
| `ping` | Giữ kết nối |

---

## Mô hình dữ liệu

| Model | Mục đích |
|-------|----------|
| `nguoiDung` | Tài khoản đăng nhập |
| `VaiTro` | Vai trò hệ thống |
| `BatDongSan` | Tin bất động sản |
| `ChuNha` | Hồ sơ chủ trọ |
| `KhachHang` | Hồ sơ người thuê |
| `NhanVien` | Hồ sơ nhân viên |
| `YeuThich` | BĐS yêu thích |
| `DanhGia` | Đánh giá BĐS |
| `LichXemNha` | Lịch hẹn xem nhà |
| `PhongChat` | Phòng chat |
| `TinNhan` | Tin nhắn (text, file, reply, cuộc gọi) |
| `ThongBaoChat` | Thông báo real-time |
| `RefreshToken` | Refresh JWT |
| `HopDongThue` | Hợp đồng thuê (schema sẵn) |
| `PhieuDatCoc` | Phiếu đặt cọc (schema sẵn) |
| `HinhAnh`, `TienIch`, `TinTuc`, `ThongBao`, `LienHe` | Mở rộng / liên kết |

---

## API REST

Tất cả route gắn prefix `/api` (xem `routes/root.js`):

| Prefix | Module |
|--------|--------|
| `/api/auth` | Xác thực & Facebook |
| `/api/property` | Bất động sản |
| `/api/user` | Người dùng |
| `/api/role` | Vai trò |
| `/api/owner` | Chủ nhà |
| `/api/customer` | Khách hàng |
| `/api/employee` | Nhân viên |
| `/api/favorite` | Yêu thích |
| `/api/review` | Đánh giá |
| `/api/viewing` | Lịch xem nhà |
| `/api/room` | Phòng chat |
| `/api/message` | Tin nhắn |
| `/api/notification` | Thông báo chat |

Chi tiết request/response: **Swagger** tại `/api-docs` (file trong `swagger/*.swagger.js`).

---

## Socket.IO (real-time)

- Kết nối cùng HTTP server (`index.js` → `setupSocket(server)`)
- CORS: localhost (3000, 5173, 8080) + `CLIENT_URL`
- Xác thực: JWT access token (cùng `JWT_ACCESS_KEY` với REST)
- Client gửi token: `socket.handshake.auth.token` hoặc header `Authorization`

---

## Cài đặt & chạy

### Yêu cầu

- Node.js 18+
- MongoDB (local hoặc Atlas)

### Các bước

```bash
# Clone & cài dependency
npm install

# Tạo .env từ mẫu (nếu chưa có)
npm run setup:env

# Chỉnh .env — ít nhất DB_URL, JWT_ACCESS_KEY, JWT_REFRESH_SECRET
```

**MongoDB local (macOS Homebrew):**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

```bash
# Chạy production mode
npm run start

# Chạy dev (auto-reload)
npm run dev
```

Server mặc định: **http://localhost:8000**

---

## Biến môi trường

Sao chép `.env.example` → `.env`:

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DB_URL` | Có | Chuỗi kết nối MongoDB |
| `JWT_ACCESS_KEY` | Có | Ký access token & Socket |
| `JWT_REFRESH_SECRET` | Có | Ký refresh token |
| `PORT` | Không | Mặc định `8000` |
| `CLIENT_URL` | Không | CORS & redirect OAuth (mặc định `http://localhost:5173`) |
| `BASE_URL` | Không | URL API (Facebook callback) |
| `SESSION_SECRET` | Không | Express session |
| `NODE_ENV` | Không | `development` / `production` |
| `EMAIL_NAME`, `EMAIL_PASSWORD` | Không | Gmail gửi reset password |
| `URL_SERVER` | Không | Link reset password trong email |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Không | Đăng nhập Facebook |

---

## Tài liệu API

Sau khi chạy server, mở trình duyệt:

**http://localhost:8000/api-docs**

Swagger mô tả các endpoint auth, property, user, employee, customer, owner, favorite, review, viewing, message, room, notification và socket (tham chiếu).

---

## Scripts npm

| Lệnh | Mô tả |
|------|--------|
| `npm run start` | Chạy server (`node index.js`) |
| `npm run dev` | Dev với nodemon |
| `npm run setup:env` | Copy `.env.example` → `.env` nếu chưa tồn tại |

---

## Ghi chú triển khai

- Thư mục upload: `uploads/` (tạo tự động khi gửi file qua `/api/message`)
- Server thoát gracefully khi nhận `SIGINT` / `SIGTERM` (đóng HTTP + MongoDB)
- Facebook login chỉ bật khi đủ biến môi trường; thiếu credentials vẫn chạy được các module khác
- Frontend mặc định kỳ vọng tại `CLIENT_URL` (Vite thường dùng port `5173`)

---

## License

ISC
