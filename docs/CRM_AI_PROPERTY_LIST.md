# CRM AI — Hỏi và trả danh sách bất động sản

Tài liệu tổng hợp luồng hiện tại (Phương án A): **AI đọc từ Property**, không còn CRUD CRM Knowledge riêng.

---

## 1. Ý tưởng

| Trước | Hiện tại |
|-------|----------|
| Admin tạo bài riêng trong `CrmKnowledge` | AI lấy tin đang bán trên web |
| Hai nguồn (web + CRM) dễ lệch | **Một nguồn:** `Property` với `trangThai = dang_hoat_dong` |

Khách hỏi → hệ thống tìm tin Property khớp → trả **text + danh sách card** (giá, quận, ảnh, link chi tiết).

---

## 2. Luồng xử lý (tóm tắt)

```
Khách hỏi
  │
  ├─ HTTP:  POST /api/ai-chat/message
  └─ WS:    /ws  { type: "message", message, sessionId? }
        │
        ▼
  processUserMessage → processAdvisoryMessage
        │
        ├─ Chào hỏi / small talk → chỉ text, không list
        ├─ Từ khóa handoff → chuyển nhân viên
        │
        ▼
  Trích filter: quận, giá, số phòng ngủ…
        │
        ▼
  searchProperties (thường tối đa ~5 tin)
        │
        ├─ Ưu tiên: semantic (embedding câu hỏi ↔ Property.embedding)
        └─ Fallback: tìm theo text (keyword / fuzzy)
        │
        ▼
  Lọc thêm quận / giá / PN (+ gợi ý quận gần nếu cần)
        │
        ▼
  Response JSON:
    • aiResponse / message     — câu trả lời có đánh số + link
    • matchedProperties[]      — card BĐS (FE ưu tiên field này)
    • apartments[]             — mirror (tương thích cũ)
    • media[]                  — URL ảnh (tối đa ~8)
```

Khi đã có tin khớp, BE dùng **template liệt kê** (không bắt buộc LLM viết lại từng căn).

---

## 3. Nguồn dữ liệu catalog

| Layer | Vai trò |
|-------|---------|
| `Property` (`dang_hoat_dong`) | Nguồn sự thật |
| `propertyAiCatalog` | `getActivePropertiesForAi` → map sang item AI |
| `propertyAiMapper.toAiCatalogItem` | Map field + build `url` |
| `crmKnowledgeCatalogClient` | Cache + đọc catalog (path cũ, data Property) |
| `GET /api/crm-knowledge-catalog` | API public catalog (giữ path cho FE) |

**URL sản phẩm trong catalog:**

```text
{CLIENT_URL}/products/{slug}
```

Ví dụ: `https://phuongtayland.space/products/can-ho-2pn-quan-2`

**Ảnh:** `anhUrls` = `gallery` (hoặc `[anhDaiDien]` nếu không có gallery).

---

## 4. API liên quan

### FE / khách dùng

| Mục đích | Endpoint |
|----------|----------|
| Hỏi AI → list BĐS | `POST /api/ai-chat/message` |
| Chat realtime | WebSocket `/ws` |
| Search có filter | `POST /api/ai-chat/search` |
| Catalog full | `GET /api/crm-knowledge-catalog` |
| Catalog search text | `GET /api/crm-knowledge-catalog/search?q=` |

### Admin quản tin (nguồn AI)

| Mục đích | Endpoint |
|----------|----------|
| Đăng / sửa / duyệt tin | `/api/property` hoặc `/api/property-post` |
| List public web | `GET /api/property` |

### Đã ngừng

| Endpoint | Kết quả |
|----------|---------|
| `/api/crm-knowledge` (CRUD) | **HTTP 410** — `CRM_KNOWLEDGE_DEPRECATED` |

---

## 5. Response mẫu (rút gọn)

```json
{
  "aiResponse": "Em tìm được vài căn phù hợp:\n1. ...\n2. ...",
  "matchedProperties": [
    {
      "_id": "...",
      "tieuDe": "Căn 2PN Quận 2 view sông",
      "gia": 12000000,
      "quanHuyen": "Quận 2",
      "phongNgu": 2,
      "dienTich": 65,
      "anhDaiDien": "https://...",
      "anhUrls": ["https://..."],
      "url": "https://phuongtayland.space/products/can-2pn-quan-2"
    }
  ],
  "media": ["https://..."],
  "requiresHandOff": false
}
```

**FE render card:** dùng `matchedProperties[]` (hoặc `apartments[]`).  
Link: `item.url` hoặc `{FE_ORIGIN}/products/{slug}`.

---

## 6. Embedding (semantic search)

Để tìm theo “ý nghĩa” câu hỏi (không chỉ keyword):

1. Tin Property **tạo / sửa / mở** (`dang_hoat_dong`) → job `property:embed`
2. Lưu vector vào field `Property.embedding`
3. Invalidate cache catalog

**Backfill tin cũ:**

```bash
npm run backfill:property-embeddings
```

Cần cấu hình `OPEN_ROUTER_KEY` (hoặc Gemini) + model embed.

---

## 7. Biến môi trường quan trọng

| Biến | Mục đích |
|------|----------|
| `OPEN_ROUTER_KEY` | Chat + embedding |
| `AI_EMBEDDING_MODEL` | Model embed (vd. `openai/text-embedding-3-small`) |
| `CLIENT_URL` | Origin FE → build link `/products/{slug}` |
| `VECTOR_SIMILARITY_THRESHOLD` | Ngưỡng semantic (mặc định `0.6`) |
| `VECTOR_TEXT_SEARCH_THRESHOLD` | Ngưỡng text (mặc định `0.3`) |
| `CRM_CATALOG_CACHE_MS` | TTL cache catalog (mặc định 30s) |
| `REDIS_URL` | Cache / queue job (optional) |

---

## 8. File code chính

| File | Vai trò |
|------|---------|
| `src/modules/ai/controllers/aiChatController.js` | HTTP chat / search |
| `src/modules/ai/services/aiAdvisoryPipeline.js` | Pipeline hỏi → trả lời + list |
| `src/modules/ai/services/vectorSearchService.js` | Semantic + text search |
| `src/modules/ai/services/propertyAiCatalog.js` | Đọc Property active + embed |
| `src/modules/ai/services/propertyAiMapper.js` | Map Property → catalog item |
| `src/modules/ai/services/crmKnowledgeCatalogClient.js` | Cache / fetch catalog |
| `src/infrastructure/realtime/aiWebSocket.js` | WebSocket `/ws` |
| `src/modules/ai/routes/crmKnowledge.routes.js` | CRUD cũ → 410 |

---

## 9. Checklist vận hành

- [ ] Tin muốn AI tư vấn: `trangThai = dang_hoat_dong`, có `slug`, mô tả, giá, quận, ảnh
- [ ] `CLIENT_URL` trỏ đúng domain FE (vd. `https://phuongtayland.space`)
- [ ] Có `OPEN_ROUTER_KEY` (và credit) để embed + chat
- [ ] Đã backfill embedding cho tin cũ (nếu cần semantic tốt)
- [ ] FE **không** gọi `/api/crm-knowledge` CRUD
- [ ] FE chat dùng `matchedProperties` + `resolveUrl` cho ảnh `/images/...`

---

## 10. Tài liệu liên quan

- Prompt đồng bộ FE (catalog Property): [`crm-answear-property.md`](./crm-answear-property.md)
- Prompt tin nhắn audio chat: [`FE_CHAT_AUDIO_PROMPT.md`](./FE_CHAT_AUDIO_PROMPT.md)

> **Lưu ý:** [`CRM-api-ai.md`](./CRM-api-ai.md) mô tả flow cũ (đăng bài `CrmKnowledge`). Flow đó đã thay bằng Property — dùng tài liệu **này** làm chuẩn.
