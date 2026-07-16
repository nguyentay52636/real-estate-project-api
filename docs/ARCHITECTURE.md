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
