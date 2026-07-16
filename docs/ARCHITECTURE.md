# Kiến trúc API Bất động sản

Cấu trúc hiện tại theo kiểu **Feature / Modular Monolith** (chuẩn phổ biến cho Express + Node ESM hiện nay).

## Tổng quan

```
real-estate-project-api/
├── index.js                 # Entry mỏng → src/server.js
├── package.json             # "type": "module" + import aliases #
├── .env / .env.example
├── images/                  # Static uploads local
├── docs/                    # Tài liệu FE / AI / kiến trúc
├── scripts/                 # seed + test (giữ lâu dài)
└── src/
    ├── app.js               # Express: middleware, mount /api
    ├── server.js            # HTTP + Socket + shutdown
    ├── config/              # env, db, passport, response
    ├── shared/              # middleware & utils dùng chung
    ├── infrastructure/
    │   ├── database/models/ # Mongoose schemas
    │   ├── realtime/        # Socket.IO + AI WebSocket
    │   └── storage/         # Cloudinary / local file
    ├── modules/             # Theo domain nghiệp vụ
    │   ├── auth/            # Login, Facebook, JWT validation
    │   ├── users/           # User, Role, Employee, Customer, Owner
    │   ├── property/        # BĐS, Review, Favorite, Viewing
    │   ├── chat/            # Room, Message, Notification
    │   ├── ai/              # AI chat, handoff, CRM knowledge
    │   ├── upload/
    │   └── index.routes.js  # Gom router → /api/*
    └── docs/swagger/        # OpenAPI
```

## Domain map (web BĐS)

| Module | Nghiệp vụ |
|--------|-----------|
| `auth` | Đăng ký / đăng nhập / OAuth / token |
| `users` | Hồ sơ, vai trò (người thuê, chủ nhà, NV, admin) |
| `property` | Tin đăng, yêu thích, đánh giá, lịch xem nhà |
| `chat` | Chat realtime giữa các bên |
| `ai` | Tư vấn AI + chuyển nhân viên (handoff) |
| `upload` | Ảnh / media |

## Import aliases

```js
import User from '#models/User.js';
import { responseApi } from '#config/response.js';
import auth from '#shared/middleware/auth.js';
```

| Alias | Path |
|-------|------|
| `#config/*` | `src/config/*` |
| `#shared/*` | `src/shared/*` |
| `#models/*` | `src/infrastructure/database/models/*` |
| `#infra/*` | `src/infrastructure/*` |
| `#modules/*` | `src/modules/*` |
| `#docs/*` | `src/docs/*` |

## Thêm tính năng mới

1. Tạo `src/modules/<domain>/{controllers,routes,services}`
2. Đăng ký trong `src/modules/index.routes.js`
3. Model (nếu cần) → `src/infrastructure/database/models/`
4. Swagger (nếu cần) → `src/docs/swagger/`

API public (`/api/...`) **không đổi** khi tổ chức lại folder.

## Testability

Mục tiêu: **logic nghiệp vụ test được không cần Express + Mongo thật**.

### Pattern

```
routes → controller (HTTP: validate, cookie, status)
              ↓
         service (business rules, throw AppError)
              ↓
         models / infra
```

- Service dùng **factory + dependency injection** khi cần mock (`createAuthService(deps)`).
- Lỗi nghiệp vụ: `AppError(message, statusCode)` từ `#shared/errors/AppError.js`.
- Pure helpers (AI: cosineSimilarity, handoff keywords, …) export riêng để unit test.

### Chạy test

```bash
npm test              # toàn bộ unit tests
npm run test:auth     # auth service
npm run test:ai       # AI helpers (không cần LLM/DB)
```

Thư mục: `tests/unit/<domain>/*.test.js` — dùng Node.js built-in test runner (`node --test`).

## Đồng nhất pattern giữa modules

Tất cả module nghiệp vụ tuân theo cùng một hình dạng:

```
routes → controller (mỏng)          # HTTP: đọc req, set status/cookie, trả JSON
            ↓ gọi
         service (createXxxService)  # nghiệp vụ + throw AppError, DI qua factory
            ↓
         models (#models/*)
```

### Quy ước

| Thành phần | Vị trí | Vai trò |
|-----------|--------|---------|
| `asyncHandler` | `#shared/http/asyncHandler.js` | Bọc controller async, forward lỗi (bỏ try/catch lặp) |
| `errorHandler` | `#shared/middleware/errorHandler.js` | Map lỗi tập trung; mount cuối `app.js` |
| `AppError` | `#shared/errors/AppError.js` | Lỗi nghiệp vụ có `statusCode` |
| `createXxxService(deps)` | `modules/<domain>/services/` | Factory + DI để unit test không cần Mongo |

### Trạng thái áp dụng

| Module | Service | Controller mỏng | Test |
|--------|:------:|:---------------:|:----:|
| `auth` | ✅ | ✅ | ✅ |
| `ai` | ✅ (sẵn) | ✅ | ✅ |
| `property` (property/favorite/viewing/review) | ✅ | ✅ | ✅ |
| `users` (user/customer/owner/employee/role) | ✅ | ✅ | ✅ |
| `chat` — message, notification | ✅ | ✅ | ✅ |
| `chat` — room (`roomChatController`) | ⏳ chưa tách (750 dòng, đan xen `req.io`) | — | — |

> `messageService` được dùng chung cho **cả REST lẫn Socket.IO** (các hàm `socketCreateMessage/...`), nên logic tin nhắn chỉ còn một nguồn.

### Thêm module mới — checklist

1. `services/<name>Service.js`: `export function create<Name>Service(deps = {}) { ... }` + default instance.
2. Ném `AppError(message, statusCode)` cho mọi lỗi nghiệp vụ (không `res` trong service).
3. `controllers/<name>Controller.js`: bọc `asyncHandler`, chỉ lo HTTP.
4. `tests/unit/<domain>/<name>Service.test.js`: mock `deps`, assert `statusCode`.
