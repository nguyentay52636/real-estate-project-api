# FE sync — AI catalog từ Property (Phương án A)

BE đã chuyển AI sang **single source: Property** (`trangThai = dang_hoat_dong`).
CRUD `/api/crm-knowledge` trả **410 Gone**.

Dùng prompt dưới đây cho Agent FE.

---

```text
## Task: Đồng bộ FE với BE — AI đọc Property, bỏ CRM Knowledge Admin

### Thay đổi BE (đã deploy / local)
1. AI catalog & chat search lấy từ **Property** đang hoạt động, KHÔNG còn CrmKnowledge.
2. `GET /api/crm-knowledge-catalog` và `/search` vẫn giữ path cũ nhưng:
   - `source: "property"`
   - mỗi item có `url` = `{CLIENT_URL}/products/{slug}`
   - `anhUrls` = `gallery` (hoặc `[anhDaiDien]`)
   - `trangThai` map `"active"` khi tin `dang_hoat_dong`
3. Mọi `POST|GET|PUT|DELETE /api/crm-knowledge*` (admin CRUD) → **HTTP 410** JSON:
```json
{
  "message": "CRM Knowledge CRUD đã ngừng...",
  "code": "CRM_KNOWLEDGE_DEPRECATED",
  "migration": {
    "catalog": "GET /api/crm-knowledge-catalog",
    "manageListings": "GET|POST /api/property-post",
    "publicList": "GET /api/property"
  }
}
```
4. Đăng/sửa/duyệt tin Property → BE tự (re)embed + invalidate catalog cache.
5. Public list vẫn: `GET /api/property` (không trả embedding).

### Việc FE cần làm

#### A. Xóa / ẩn UI Admin “CRM Knowledge”
- Remove routes/pages: tạo/sửa/xóa bài CRM Knowledge, upload ảnh CRM Knowledge.
- Remove API clients gọi `/api/crm-knowledge` (create/list/update/delete/images).
- Nếu còn gọi → sẽ 410; xử lý toast: “Đã chuyển sang quản lý tin BĐS”.

#### B. Admin quản tin AI = quản Property
- Tin hiển thị trên web (`dang_hoat_dong`) = tin AI có thể tư vấn.
- Dùng sẵn flow property / property-post (không form CRM riêng).
- Đảm bảo tin có: `tieuDe`, `moTa`, `gia`, `diaChi`, `quanHuyen`, `slug`, `anhDaiDien`/`gallery`.
- Link chat AI dùng: `{FE_ORIGIN}/products/{slug}` — **khớp** route chi tiết sản phẩm FE.

#### C. Chat AI / catalog client
- Giữ `GET /api/crm-knowledge-catalog` nếu đang dùng (path không đổi).
- Khi render card / link từ AI response:
  - Prefer `matchedProperties[].url` hoặc `property.url` từ BE
  - Fallback: `${FE_ORIGIN}/products/${slug}` nếu có slug
- Preview ảnh: `anhDaiDien` / `anhUrls[]`; nếu path `/images/...` thì prefix API origin.
- Không gọi `/api/crm-knowledge` để “seed” data cho AI.

#### D. Copy / docs trong app
- Đổi text admin: “Dữ liệu AI lấy từ tin đang hoạt động trên website”.
- Bỏ hướng dẫn “Tạo bài CRM Knowledge rồi mới chat”.

### Acceptance
- [ ] Không còn màn hình CRUD CRM Knowledge (hoặc redirect sang danh sách tin)
- [ ] Không còn request `/api/crm-knowledge` (trừ catalog nếu rename sau)
- [ ] Chat AI gợi ý tin có thật trên `GET /api/property` (cùng slug/giá)
- [ ] Click link AI → trang `/products/{slug}` đúng tin
- [ ] Duyệt tin `dang_hoat_dong` → sau ~30s (cache) AI có thể match tin đó

### Không làm
- Không tạo lại form CRM Knowledge
- Không hardcode localhost trong production `url`
- Không expect `anhUrls: ["string"]` từ Swagger cũ
```
