/**
 * @swagger
 * tags:
 *   - name: CRM Knowledge Catalog
 *     description: |
 *       Catalog BĐS cho AI — **không cần đăng nhập**.
 *       Nguồn: Property (`trangThai = dang_hoat_dong`).
 *       - List: `GET /api/crm-knowledge-catalog`
 *       - Search: `GET /api/crm-knowledge-catalog/search?q=...`
 *       Item có `url` = `{CLIENT_URL}/products/{slug}`.
 *   - name: CRM Knowledge Admin
 *     description: |
 *       **DEPRECATED (410).** Không còn CRUD tin AI riêng.
 *       Quản lý qua `/api/property` / `/api/property-post`.
 *       Catalog: `/api/crm-knowledge-catalog`.
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT access token (admin cho CRM Knowledge Admin)
 *
 *   schemas:
 *     CrmKnowledge:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6a3a98662b6bc60a380baf45"
 *         tieuDe:
 *           type: string
 *           example: "Căn 2PN Quận 2 view sông"
 *         moTa:
 *           type: string
 *           example: "Full nội thất, 65m2, gần Metro"
 *         gia:
 *           type: number
 *           description: Giá thuê VNĐ/tháng
 *           example: 12000000
 *         diaChi:
 *           type: string
 *           example: "123 Nguyễn Văn Linh"
 *         quanHuyen:
 *           type: string
 *           example: "Quận 2"
 *         phongNgu:
 *           type: number
 *           example: 2
 *         dienTich:
 *           type: number
 *           example: 65
 *         loaiBds:
 *           type: string
 *           enum: [can_ho, nha_nguyen_can, studio, penthouse]
 *           example: can_ho
 *         anhUrls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://res.cloudinary.com/.../image.jpg"]
 *         anhDaiDien:
 *           type: string
 *           example: "https://res.cloudinary.com/.../image.jpg"
 *         url:
 *           type: string
 *           example: "http://localhost:5173/products/can-ho-vinhomes-can-gio"
 *         trangThai:
 *           type: string
 *           enum: [active, inactive]
 *           example: active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CrmKnowledgeWithScore:
 *       allOf:
 *         - $ref: '#/components/schemas/CrmKnowledge'
 *         - type: object
 *           properties:
 *             score:
 *               type: number
 *               description: Điểm khớp (0–1) từ text hoặc vector search
 *               example: 0.67
 *
 *     CrmKnowledgeCreate:
 *       type: object
 *       required:
 *         - tieuDe
 *         - moTa
 *         - gia
 *         - diaChi
 *         - quanHuyen
 *       properties:
 *         tieuDe:
 *           type: string
 *           example: "Căn 2PN Quận 2 view sông"
 *         moTa:
 *           type: string
 *           example: "Full nội thất, 65m2"
 *         gia:
 *           type: number
 *           example: 12000000
 *         diaChi:
 *           type: string
 *           example: "123 Nguyễn Văn Linh"
 *         quanHuyen:
 *           type: string
 *           example: "Quận 2"
 *         phongNgu:
 *           type: number
 *           example: 2
 *         dienTich:
 *           type: number
 *           example: 65
 *         loaiBds:
 *           type: string
 *           enum: [can_ho, nha_nguyen_can, studio, penthouse]
 *         anhUrls:
 *           type: array
 *           items:
 *             type: string
 *           description: |
 *             URL ảnh đã upload (https Cloudinary hoặc /images/...).
 *             Upload trước qua POST /api/upload (auto) hoặc /cloudinary → /local.
 *           example: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
 *         anhDaiDien:
 *           type: string
 *           description: URL ảnh đại diện (cùng quy tắc anhUrls)
 *           example: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
 *         url:
 *           type: string
 *           example: "http://localhost:5173/products/can-ho-vinhomes-can-gio"
 *         trangThai:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 *
 *     CrmKnowledgeCatalogListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Lấy catalog CRM thành công"
 *         total:
 *           type: integer
 *           example: 2
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CrmKnowledge'
 *
 *     CrmKnowledgeCatalogSearchResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Tìm kiếm catalog thành công"
 *         mode:
 *           type: string
 *           enum: [text, vector, catalog]
 *           description: Phương thức tìm kiếm (`text` khi không có embedding credit)
 *           example: text
 *         total:
 *           type: integer
 *           example: 1
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CrmKnowledgeWithScore'
 *
 *     CrmKnowledgeListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CrmKnowledge'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

/**
 * @swagger
 * /api/crm-knowledge-catalog:
 *   get:
 *     summary: Lấy toàn bộ catalog BĐS active (cho AI tư vấn)
 *     description: |
 *       Trả về **tất cả** bài `trangThai=active` trong collection CrmKnowledge.
 *       Không phân trang. AI pipeline dùng nguồn này để tìm sản phẩm tư vấn.
 *
 *       **Ví dụ curl:**
 *       ```
 *       curl http://localhost:8000/api/crm-knowledge-catalog
 *       ```
 *     tags: [CRM Knowledge Catalog]
 *     responses:
 *       200:
 *         description: Danh sách catalog
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmKnowledgeCatalogListResponse'
 *             example:
 *               message: "Lấy catalog CRM thành công"
 *               total: 2
 *               items:
 *                 - _id: "6a3a98662b6bc60a380baf45"
 *                   tieuDe: "Căn 2PN Quận 2 view sông"
 *                   moTa: "Full nội thất, 65m2"
 *                   gia: 12000000
 *                   diaChi: "123 Nguyễn Văn Linh"
 *                   quanHuyen: "Quận 2"
 *                   phongNgu: 2
 *                   dienTich: 65
 *                   loaiBds: can_ho
 *                   anhUrls: []
 *                   trangThai: active
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/crm-knowledge-catalog/search:
 *   get:
 *     summary: Tìm BĐS khớp câu hỏi khách trên catalog
 *     description: |
 *       Tìm kiếm text/vector trên toàn bộ catalog active.
 *       Trả về `items` kèm `score` — dùng để debug hoặc tích hợp ngoài pipeline WebSocket.
 *
 *       **Ví dụ curl:**
 *       ```
 *       curl "http://localhost:8000/api/crm-knowledge-catalog/search?q=căn%202%20phòng%20Quận%202&limit=3"
 *       ```
 *     tags: [CRM Knowledge Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Câu hỏi / từ khóa tìm kiếm
 *         example: "căn 2 phòng Quận 2"
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Alias của `q`
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 3
 *           maximum: 20
 *         description: Số kết quả tối đa
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmKnowledgeCatalogSearchResponse'
 *       400:
 *         description: Thiếu tham số q
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tham số q (câu hỏi) là bắt buộc"
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/crm-knowledge:
 *   post:
 *     summary: Tạo bài CRM AI (admin)
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrmKnowledgeCreate'
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Thiếu trường bắt buộc
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải admin
 *       500:
 *         description: Lỗi server
 *   get:
 *     summary: Danh sách bài CRM (admin, có phân trang)
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Danh sách phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmKnowledgeListResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải admin
 */

/**
 * @swagger
 * /api/crm-knowledge/{id}:
 *   get:
 *     summary: Chi tiết bài CRM (admin)
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết bài
 *       404:
 *         description: Không tìm thấy
 *   put:
 *     summary: Cập nhật bài CRM (admin)
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrmKnowledgeCreate'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 *   delete:
 *     summary: Xóa bài CRM (admin)
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/crm-knowledge/{id}/images:
 *   post:
 *     summary: Upload thêm ảnh cho bài CRM (admin)
 *     description: |
 *       Multipart field `files`. Ưu tiên Cloudinary; nếu lỗi → lưu `images/crm-properties/`.
 *     tags: [CRM Knowledge Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Không có file
 *       404:
 *         description: Không tìm thấy bài
 */

export default {};