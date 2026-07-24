# Real Estate Project API

Backend API cho nền tảng **quản lý và cho thuê bất động sản** — REST + real-time (Socket.IO / WebSocket), AI tư vấn, CRM knowledge, và tài liệu OpenAPI (Swagger).

| | |
|---|---|
| **Base URL** | `http://localhost:8000/api` |
| **Swagger** | `http://localhost:8000/api-docs` |
| **Kiến trúc** | Feature / Modular Monolith (ESM + import aliases `#`) |
| **Runtime** | Node.js 18+ · Express 5 · MongoDB (Mongoose 8) |

Chi tiết kiến trúc: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ](#công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Import aliases](#import-aliases)
- [Vai trò & phân quyền](#vai-trò--phân-quyền)
- [Các module chức năng](#các-module-chức-năng)
- [API REST](#api-rest)
- [Mô hình dữ liệu](#mô-hình-dữ-liệu)
- [Real-time](#real-time)
- [Cài đặt & chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [Scripts npm](#scripts-npm)
- [Kiểm thử](#kiểm-thử)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

---

## Tổng quan

Dự án là **REST API + Socket.IO + AI WebSocket**, tổ chức theo domain trong `src/modules/*`. Mỗi module theo pattern:

```
routes → controller (HTTP) → service (nghiệp vụ + AppError) → models / infra
```

| Nhóm | Mô tả |
|------|--------|
| **Auth** | Đăng ký / đăng nhập / JWT / quên–đặt lại–đổi mật khẩu / Facebook OAuth |
| **Users** | User, Role, Employee, Customer, Owner |
| **Property** | Tin BĐS, property post, yêu thích, đánh giá, lịch xem, lead & behavior |
| **Contact** | Form hỗ trợ (Liên hệ) — public gửi, admin/NV quản lý |
| **Chat** | Phòng chat, tin nhắn, thông báo |
| **AI** | Chat tư vấn, handoff nhân viên, CRM knowledge + vector search |
| **Upload** | Upload ảnh / media (Cloudinary + local) |
| **Real-time** | Socket.IO (chat) + AI WebSocket (`/ws`) |

---

## Công nghệ

| Thành phần | Thư viện |
|------------|----------|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT, bcrypt, Passport (Facebook) |
| Real-time | Socket.IO 4, `ws` |
| Upload | Multer, Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| AI | OpenRouter SDK, `@google/generative-ai` (tùy chọn) |
| API docs | swagger-jsdoc, swagger-ui-express |
| Validation | Joi |
| Khác | cors, cookie-parser, express-session, express-rate-limit |

---

## Cấu trúc thư mục

```
real-estate-project-api/
├── index.js                      # Entry mỏng → src/server.js
├── package.json                  # "type": "module" + imports aliases
├── .env / .env.example
├── images/                       # Static uploads local (serve /images)
├── docs/                         # Kiến trúc, AI, FE prompts, API notes
├── scripts/                      # Seed CRM, embeddings, coordinates
├── tests/unit/                   # Unit tests (node:test)
└── src/
    ├── app.js                    # Express: CORS, session, /api, Swagger, errorHandler
    ├── server.js                 # HTTP + Socket + graceful shutdown
    ├── config/                   # env, db, passport, response
    ├── shared/
    │   ├── errors/AppError.js
    │   ├── http/asyncHandler.js
    │   ├── middleware/           # auth, authorizeRoles, errorHandler, optionalAuth
    │   └── utils/                # jwt, sendMail, emailTemplates, corsOrigins, …
    ├── infrastructure/
    │   ├── database/models/      # Mongoose schemas
    │   ├── realtime/             # Socket.IO handlers + AI WS
    │   └── storage/              # Cloudinary / local upload
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── property/
    │   ├── contact/
    │   ├── chat/
    │   ├── ai/
    │   ├── upload/
    │   └── index.routes.js       # Gom router → /api/*
    └── docs/swagger/             # OpenAPI theo module
```

---

## Import aliases

Khai báo trong `package.json` → `imports`:

| Alias | Path |
|-------|------|
| `#config/*` | `src/config/*` |
| `#shared/*` | `src/shared/*` |
| `#models/*` | `src/infrastructure/database/models/*` |
| `#infra/*` | `src/infrastructure/*` |
| `#modules/*` | `src/modules/*` |
| `#docs/*` | `src/docs/*` |

Ví dụ:

```js
import User from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';
import authService from '#modules/auth/services/authService.js';
```

---

## Vai trò & phân quyền

Model `Role` (`VaiTro`) — 4 vai trò chính:

| `ten` | Mô tả |
|-------|--------|
| `admin` | Quản trị hệ thống |
| `nhan_vien` | Nhân viên sale / hỗ trợ |
| `chu_tro` | Chủ nhà — quản lý tin BĐS |
| `nguoi_thue` | Người thuê / khách hàng |

**Auth middleware** (`#shared/middleware/auth.js`):

- `verifyToken` — JWT qua header `Authorization: Bearer <token>` hoặc `token`
- `verifyTokenAndAdminAuth` — admin hoặc chính chủ resource
- `authorizeRoles(...)` — giới hạn theo tên vai trò

Đăng ký công khai chỉ cho phép `nguoi_thue` / `chu_tro`. Role nội bộ (`admin`, `nhan_vien`) do admin tạo.

---

## Các module chức năng

### 1. Auth — `/api/auth`

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/register` | Đăng ký |
| `POST` | `/login` | Đăng nhập (access JWT + refresh cookie) |
| `POST` | `/logout` | Đăng xuất |
| `PATCH` | `/forgot-password` | Quên MK — gửi email chứa link reset |
| `PATCH` | `/reset-password` | Đặt lại MK bằng token từ email |
| `PATCH` | `/password` | Đổi MK (cần Bearer token) |
| `GET` | `/facebook` … | OAuth Facebook (khi đủ env) |

Alias cũ vẫn hoạt động: `POST /forgotPassword`, `POST /resetPassword`.

Email reset dùng template HTML (`src/shared/utils/emailTemplates/`). Cần `EMAIL_NAME` + `EMAIL_PASSWORD` (Gmail App Password).

### 2. Users — `/api/user`, `/role`, `/employee`, `/customer`, `/owner`

| Prefix | Nghiệp vụ |
|--------|-----------|
| `/api/user` | CRUD tài khoản `User` |
| `/api/role` | Danh sách vai trò |
| `/api/employee` | Nhân viên (`vaiTro = nhan_vien`) + hồ sơ `Employee` |
| `/api/customer` | Hồ sơ người thuê (`Customer`) |
| `/api/owner` | Hồ sơ chủ nhà (`Owner`) |

### 3. Property — `/api/property`, `/property-post`, `/favorite`, `/review`, `/viewing`, `/lead`

| Prefix | Nghiệp vụ |
|--------|-----------|
| `/api/property` (`/properties`) | CRUD / lọc tin BĐS (slug, district, related, author) |
| `/api/property-post` | Tin đăng / duyệt trạng thái |
| `/api/favorite` | Yêu thích |
| `/api/review` | Đánh giá sao + bình luận |
| `/api/viewing` | Lịch xem nhà |
| `/api/lead` | Behavior tracking + lead scoring (xem tin → điểm lead) |

Chi tiết lead/behavior: [`docs/FE_BEHAVIOR_LEAD_SYNC_PROMPT.md`](docs/FE_BEHAVIOR_LEAD_SYNC_PROMPT.md), [`docs/feature-lead-api.md`](docs/feature-lead-api.md).

### 4. Contact — `/api/contact`

Form hỗ trợ / liên hệ (`Contact`):

- **Public** `POST` — gửi yêu cầu
- **Admin / nhân viên** `GET`, `PATCH` — danh sách & cập nhật trạng thái

### 5. Chat — `/api/room`, `/message`, `/notification`

| Prefix | Nghiệp vụ |
|--------|-----------|
| `/api/room` | Phòng private / group, thành viên, admin |
| `/api/message` | Tin nhắn text/file, đọc, ghim, thu hồi |
| `/api/notification` | Thông báo chat |

Real-time bổ sung qua Socket.IO (xem bên dưới).

### 6. AI — `/api/ai-chat`, `/crm-knowledge`, `/crm-knowledge-catalog`

| Prefix | Nghiệp vụ |
|--------|-----------|
| `/api/ai-chat` | Chat tư vấn + handoff sang nhân viên |
| `/api/crm-knowledge` | **DEPRECATED (410)** — không còn CRUD |
| `/api/crm-knowledge-catalog` | Catalog AI từ **Property** `dang_hoat_dong` |

Tài liệu: [`docs/CRM_AI_HUONG_DAN.md`](docs/CRM_AI_HUONG_DAN.md), [`docs/CRM_VECTOR_INDEX.md`](docs/CRM_VECTOR_INDEX.md).

### 7. Upload — `/api/upload`

Upload ảnh / media (Cloudinary hoặc local → `images/`).

---

## API REST

Tất cả route gắn prefix `/api` qua `src/modules/index.routes.js`:

| Prefix | Module |
|--------|--------|
| `/api/auth` | Auth |
| `/api/user` | Users |
| `/api/role` | Roles |
| `/api/employee` | Employees |
| `/api/customer` | Customers |
| `/api/owner` | Owners |
| `/api/property`, `/api/properties` | Properties |
| `/api/property-post`, `/api/property-posts` | Property posts |
| `/api/favorite` | Favorites |
| `/api/review` | Reviews |
| `/api/viewing` | Viewing schedules |
| `/api/lead` | Leads & behavior |
| `/api/contact` | Contact / support |
| `/api/room` | Chat rooms |
| `/api/message` | Messages |
| `/api/notification` | Chat notifications |
| `/api/ai-chat` | AI chat & handoff |
| `/api/crm-knowledge` | CRM knowledge |
| `/api/crm-knowledge-catalog` | CRM catalog |
| `/api/upload` | Upload |

Chi tiết request/response: **Swagger** tại `/api-docs`.

---

## Mô hình dữ liệu

| Model | Mục đích |
|-------|----------|
| `User` (`nguoiDung`) | Tài khoản đăng nhập |
| `Role` (`VaiTro`) | Vai trò hệ thống |
| `Owner` | Hồ sơ chủ nhà |
| `Customer` | Hồ sơ người thuê |
| `Employee` | Hồ sơ nhân viên |
| `Property` | Tin bất động sản |
| `Favorite` | BĐS yêu thích |
| `Rating` | Đánh giá |
| `ViewingSchedule` | Lịch xem nhà |
| `PropertyBehavior` | Hành vi xem tin |
| `PropertyLead` / `Lead` | Lead scoring |
| `Contact` | Form liên hệ / hỗ trợ |
| `ChatRoom` | Phòng chat |
| `Message` | Tin nhắn |
| `ChatNotification` / `Notification` | Thông báo |
| `ChatTicket` | Ticket chat / handoff |
| `CrmKnowledge` | Knowledge CRM + embedding |
| `RefreshToken` | Refresh JWT |

---

## Real-time

### Socket.IO (chat)

- Mount cùng HTTP server (`src/server.js` → `src/infrastructure/realtime/`)
- CORS: origins từ `CLIENT_URL` / `CLIENT_URLS`
- Auth: JWT access token (`handshake.auth.token` hoặc `Authorization`)
- Events chính: `joinRoom`, `message:*`, `room:*`, `call:create`, `ping`, …

### AI WebSocket

- Endpoint: `ws://localhost:8000/ws`
- Dùng cho luồng chat AI / handoff realtime

---

## Cài đặt & chạy

### Yêu cầu

- Node.js **18+**
- MongoDB (local hoặc Atlas)
- (Tùy chọn) Cloudinary, Gmail App Password, OpenRouter key

### Các bước

```bash
npm install

# Tạo .env từ mẫu (nếu chưa có)
npm run setup:env

# Điền tối thiểu: DB_URL, JWT_ACCESS_KEY, JWT_REFRESH_SECRET
# Quên mật khẩu: EMAIL_NAME, EMAIL_PASSWORD
# AI: OPEN_ROUTER_KEY
```

```bash
npm run start    # production
npm run dev      # nodemon
```

Server mặc định: **http://localhost:8000**  
Swagger: **http://localhost:8000/api-docs**

### Thêm tính năng mới

1. Tạo `src/modules/<domain>/{controllers,routes,services}`
2. Đăng ký trong `src/modules/index.routes.js`
3. Model (nếu cần) → `src/infrastructure/database/models/`
4. Swagger (nếu cần) → `src/docs/swagger/`
5. Unit test → `tests/unit/<domain>/`

API public (`/api/...`) giữ ổn định khi chỉ tổ chức lại folder.

---

## Biến môi trường

Sao chép `.env.example` → `.env`:

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DB_URL` | Có | Chuỗi kết nối MongoDB |
| `JWT_ACCESS_KEY` | Có | Ký access token & Socket |
| `JWT_REFRESH_SECRET` | Có | Ký refresh token |
| `JWT_ACCESS_EXPIRES` | Không | TTL access (mặc định `7d`) |
| `JWT_REFRESH_EXPIRES` | Không | TTL refresh (mặc định `365d`) |
| `PORT` | Không | Mặc định `8000` |
| `CLIENT_URL` | Không | Origin FE (CORS, OAuth, link email) — nhiều origin phân cách `,` |
| `CLIENT_URLS` | Không | Origin CORS bổ sung |
| `BASE_URL` | Không | URL API (Facebook callback, catalog) |
| `SESSION_SECRET` | Không | Express session |
| `NODE_ENV` | Không | `development` / `production` |
| `EMAIL_NAME`, `EMAIL_PASSWORD` | Không* | Gmail SMTP gửi reset password (*bắt buộc nếu dùng quên MK) |
| `EMAIL_BRAND_NAME`, `EMAIL_BRAND_TAGLINE` | Không | Branding email |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Không | Đăng nhập Facebook |
| `CLOUDINARY_*` | Không | Upload Cloudinary |
| `OPEN_ROUTER_KEY` | Không* | AI chat / embedding (*bắt buộc nếu dùng AI) |
| `AI_CHAT_MODELS` | Không | Danh sách model chat (OpenRouter) |
| `AI_EMBEDDING_MODEL` | Không | Model embedding |
| `VECTOR_SEARCH_INDEX` | Không | Tên index Atlas Vector Search |
| `VECTOR_SIMILARITY_THRESHOLD` | Không | Ngưỡng similarity |
| `GEMINI_API_KEY` | Không | Google AI Studio (tùy chọn) |

---

## Scripts npm

| Lệnh | Mô tả |
|------|--------|
| `npm run start` | Chạy server (`node index.js`) |
| `npm run dev` | Dev với nodemon |
| `npm test` | Toàn bộ unit tests |
| `npm run test:auth` | Test auth |
| `npm run test:ai` | Test AI helpers |
| `npm run test:property` | Test property |
| `npm run test:users` | Test users |
| `npm run test:chat` | Test chat |
| `npm run setup:env` | Copy `.env.example` → `.env` nếu chưa có |
| `npm run seed:crm` | Seed CRM knowledge |
| `npm run seed:coordinates` | Seed tọa độ |
| `npm run backfill:embeddings` | Backfill embeddings |
| `npm run test:crm-ai` | Script test pipeline CRM AI |

---

## Kiểm thử

- Runner: Node.js built-in (`node --test`)
- Thư mục: `tests/unit/<domain>/*.test.js`
- Service dùng **factory + DI** để mock dependency (không cần Express/Mongo thật)
- Lỗi nghiệp vụ: `AppError(message, statusCode)`

```bash
npm test
```

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Kiến trúc Modular Monolith, pattern module, testability |
| [`docs/CRM_AI_HUONG_DAN.md`](docs/CRM_AI_HUONG_DAN.md) | Hướng dẫn CRM AI |
| [`docs/CRM_VECTOR_INDEX.md`](docs/CRM_VECTOR_INDEX.md) | Atlas Vector Search index |
| [`docs/FE_BEHAVIOR_LEAD_SYNC_PROMPT.md`](docs/FE_BEHAVIOR_LEAD_SYNC_PROMPT.md) | Prompt FE — behavior & lead |
| [`docs/feature-lead-api.md`](docs/feature-lead-api.md) | API lead |
| [`docs/feature-view-api.md`](docs/feature-view-api.md) | API view / behavior |
| [`docs/intergration-api.md`](docs/intergration-api.md) | Ghi chú tích hợp |

---

## Ghi chú triển khai

- Static images: `images/` → serve tại `/images`
- Graceful shutdown: `SIGINT` / `SIGTERM` đóng HTTP + MongoDB
- Facebook login chỉ bật khi đủ env; thiếu credentials vẫn chạy các module khác
- Quên mật khẩu cần `EMAIL_*`; thiếu cấu hình API trả **503** với message rõ ràng
- CORS hỗ trợ nhiều origin qua `CLIENT_URL` (phân cách dấu phẩy)
- Frontend mặc định: Vite port `5173` (khớp `CLIENT_URL`)

---

## License

ISC
