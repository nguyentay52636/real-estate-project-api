# Redis Cache — API đã xử lý

Wrapper: [`src/infrastructure/cache/redisCache.js`](../src/infrastructure/cache/redisCache.js) (`ioredis`).

**Bật khi** có `REDIS_URL` hoặc `REDIS_HOST` trong `.env`.  
`REDIS_ENABLED=false` → tắt cache, API vẫn chạy bình thường (bypass).

Không cấu hình Redis → mọi `cacheGet` / `cacheSet` no-op, logic DB vẫn chạy như cũ.

---

## 1. Property list

| | |
|--|--|
| **API** | `GET /api/property`, `GET /api/properties` |
| **Service** | `propertyService.getAllProperties` |
| **Key** | `property:list:{sha1(query).slice(0,16)}` |
| **TTL** | `CACHE_TTL_PROPERTY_LIST` (mặc định **45** giây) |
| **Invalidate** | create / update / updateStatus / delete property → xóa prefix `property:list:` |

Ghi chú: mỗi bộ query khác nhau (page, filter, search, …) = một key riêng.

---

## 2. Property by slug

| | |
|--|--|
| **API** | `GET /api/property/slug/:slug` |
| **Service** | `propertyService.getPropertyBySlug` |
| **Key** | `property:slug:{slug}` |
| **TTL** | `CACHE_TTL_PROPERTY_SLUG` (mặc định **180** giây) |
| **Invalidate** | update / delete property đúng slug đó |

---

## 3. Roles

| | |
|--|--|
| **API** | `GET /api/role` |
| **Service** | `roleService.getAllRoles` |
| **Key** | `roles:all` |
| **TTL** | `CACHE_TTL_ROLES` (mặc định **3600** giây) |
| **Invalidate** | `roleService.invalidateRolesCache()` — cần gọi khi CRUD Role |

---

## 4. CRM Knowledge Catalog

| | |
|--|--|
| **API / luồng** | `GET /api/crm-knowledge-catalog` (client nội bộ) + AI pipeline / vector search |
| **Module** | `crmKnowledgeCatalogClient.js` |
| **Keys** | `crm:catalog`, `crm:catalog:embeddings` |
| **TTL** | `CRM_CATALOG_CACHE_MS` → giây (mặc định **30** giây) |
| **Invalidate** | `clearCatalogCache()` khi CRUD CRM knowledge |

Layer: memory TTL trước, Redis sau (hữu ích multi-instance).

---

## 5. Redis cho Queue (không phải HTTP cache)

Khi có Redis: BullMQ ([`src/infrastructure/queue/`](../src/infrastructure/queue/)).

Ví dụ job: `email:password-reset` (quên mật khẩu — gửi email nền).

Không có Redis → fallback `setImmediate` inline.

---

## Chưa dùng Redis cache

- Chat / message / room / notification  
- User / employee / customer / owner lists  
- Review / favorite / viewing / lead / behavior  
- Auth login / register  
- Upload  

Prefix `property:related:` được xóa khi invalidate nhưng **chưa** có `cacheGetOrSet` cho related API.

---

## Cấu hình `.env`

```env
# Bắt buộc một trong hai dạng:
REDIS_URL=redis://127.0.0.1:6379
# hoặc:
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
# REDIS_PASSWORD=

# REDIS_ENABLED=false

CACHE_TTL_PROPERTY_LIST=45
CACHE_TTL_PROPERTY_SLUG=180
CACHE_TTL_ROLES=3600
CRM_CATALOG_CACHE_MS=30000
```

Xem thêm mẫu trong [`.env.example`](../.env.example).
