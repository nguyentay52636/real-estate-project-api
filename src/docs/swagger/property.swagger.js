/**
 * @swagger
 * tags:
 *   name: Property
 *   description: API quản lý bất động sản
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - tieuDe
 *         - moTa
 *         - loaiBds
 *         - loaiGiaoDich
 *         - gia
 *         - dienTich
 *         - diaChi
 *         - tinhThanh
 *         - quanHuyen
 *         - anhDaiDien
 *         - phongNgu
 *         - phongTam
 *         - choDauXe
 *         - nguoiDungId
 *       properties:
 *         tieuDe:
 *           type: string
 *         moTa:
 *           type: string
 *         loaiBds:
 *           type: string
 *           enum: [can_ho, nha_nguyen_can, studio, penthouse]
 *         loaiGiaoDich:
 *           type: string
 *           enum: [ban, cho_thue]
 *           description: Danh mục giao dịch của tin
 *         gia:
 *           type: number
 *         dienTich:
 *           type: number
 *         diaChi:
 *           type: string
 *         tinhThanh:
 *           type: string
 *         quanHuyen:
 *           type: string
 *         duAn:
 *           type: string
 *           description: Tên dự án (dùng cho gợi ý BĐS liên quan)
 *         anhDaiDien:
 *           type: string
 *         gallery:
 *           type: array
 *           items:
 *             type: string
 *         phongNgu:
 *           type: number
 *         phongTam:
 *           type: number
 *         choDauXe:
 *           type: number
 *         trangThai:
 *           type: string
 *           enum: [dang_hoat_dong, da_cho_thue, da_ban]
 *         nguoiDungId:
 *           description: ID hoặc object người đăng (populate)
 *           oneOf:
 *             - type: string
 *             - type: object
 *         chuNha:
 *           type: object
 *           description: Thông tin chủ đăng tin (để liên hệ / đặt lịch) — luôn có trong response list & detail
 *           properties:
 *             _id:
 *               type: string
 *             ten:
 *               type: string
 *             email:
 *               type: string
 *             soDienThoai:
 *               type: string
 *             anhDaiDien:
 *               type: string
 *             trangThai:
 *               type: string
 *             vaiTro:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 ten:
 *                   type: string
 *                   example: chu_tro
 *         badge:
 *           type: string
 *         subtitle:
 *           type: string
 *         features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               icon:
 *                 type: string
 *               text:
 *                 type: string
 *               color:
 *                 type: string
 *         overlay:
 *           type: object
 *           properties:
 *             category:
 *               type: string
 *             location:
 *               type: string
 *             priceDisplay:
 *               type: string
 *             rating:
 *               type: number
 *             reviews:
 *               type: number
 *             amenities:
 *               type: array
 *               items:
 *                 type: string
 *         colorGradient:
 *           type: string
 *         thongTinChiTiet:
 *           type: object
 *           properties:
 *             tang:
 *               type: string
 *               description: Tầng
 *               example: Tầng 18
 *             huong:
 *               type: string
 *               description: Hướng nhà / căn hộ
 *               example: Đông Nam
 *             banCong:
 *               type: boolean
 *               description: Có ban công hay không
 *               example: true
 *             noiThat:
 *               type: string
 *               description: Tình trạng nội thất
 *               example: Full nội thất cao cấp
 */

/**
 * @swagger
 * /api/property:
 *   get:
 *     summary: Lấy tất cả bất động sản
 *     tags: [Property]
 *     parameters:
 *       - in: query
 *         name: loaiGiaoDich
 *         schema:
 *           type: string
 *           enum: [ban, cho_thue]
 *         description: Lọc tin bán hoặc cho thuê
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 *       500:
 *         description: Lỗi server
 *   post:
 *     summary: Tạo mới bất động sản (chỉ cần nguoiDungId + dữ liệu tin)
 *     description: |
 *       Body **không** gửi object `chuNha`. Chỉ gửi `nguoiDungId` (string).
 *       Server kiểm tra user tồn tại và vai trò `chu_tro` hoặc `admin`,
 *       rồi trả response kèm `chuNha` đã populate.
 *     tags: [Property]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tieuDe
 *               - moTa
 *               - loaiBds
 *               - loaiGiaoDich
 *               - gia
 *               - dienTich
 *               - diaChi
 *               - tinhThanh
 *               - quanHuyen
 *               - anhDaiDien
 *               - phongNgu
 *               - phongTam
 *               - choDauXe
 *               - nguoiDungId
 *             properties:
 *               tieuDe:
 *                 type: string
 *               moTa:
 *                 type: string
 *               loaiBds:
 *                 type: string
 *                 enum: [can_ho, nha_nguyen_can, studio, penthouse]
 *               loaiGiaoDich:
 *                 type: string
 *                 enum: [ban, cho_thue]
 *                 description: `ban` hoặc `cho_thue`
 *               gia:
 *                 type: number
 *               dienTich:
 *                 type: number
 *               diaChi:
 *                 type: string
 *               tinhThanh:
 *                 type: string
 *               quanHuyen:
 *                 type: string
 *               anhDaiDien:
 *                 type: string
 *               gallery:
 *                 type: array
 *                 items:
 *                   type: string
 *               phongNgu:
 *                 type: number
 *               phongTam:
 *                 type: number
 *               choDauXe:
 *                 type: number
 *               trangThai:
 *                 type: string
 *                 enum: [dang_hoat_dong, da_cho_thue, da_ban]
 *               nguoiDungId:
 *                 type: string
 *                 description: ID user chủ đăng (role chu_tro hoặc admin)
 *               badge:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               features:
 *                 type: array
 *                 items:
 *                   type: object
 *               overlay:
 *                 type: object
 *               colorGradient:
 *                 type: string
 *               thongTinChiTiet:
 *                 type: object
 *                 description: Tầng, hướng, ban công, nội thất
 *                 properties:
 *                   tang:
 *                     type: string
 *                     example: Tầng 18
 *                   huong:
 *                     type: string
 *                     example: Đông Nam
 *                   banCong:
 *                     type: boolean
 *                     example: true
 *                   noiThat:
 *                     type: string
 *                     example: Full nội thất cao cấp
 *     responses:
 *       201:
 *         description: Đã tạo thành công — response có thêm chuNha
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Thiếu nguoiDungId hoặc dữ liệu không hợp lệ
 *       403:
 *         description: Sai vai trò / tài khoản bị khóa
 *       404:
 *         description: Không tìm thấy user
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/property/{id}/related:
 *   get:
 *     summary: Gợi ý bất động sản liên quan (tương tự Batdongsan / OneHousing)
 *     description: |
 *       Trả về tối đa 6 BĐS liên quan (chỉ `dang_hoat_dong`, không gồm căn hiện tại).
 *       Ưu tiên: cùng dự án + giá ±20% → cùng dự án → cùng loại & quận/huyện →
 *       cùng tỉnh/thành & loại. Sắp xếp theo cùng dự án → giá gần → diện tích gần → mới nhất.
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID bất động sản đang xem
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Số lượng tối đa (1-12, mặc định 6)
 *     responses:
 *       200:
 *         description: Danh sách BĐS liên quan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       404:
 *         description: Không tìm thấy bất động sản
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/property/{id}/author:
 *   get:
 *     summary: Lấy thông tin tác giả (người đăng bài) kèm vai trò
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID bất động sản
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     propertyId:
 *                       type: string
 *                     tieuDe:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     tacGia:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         ten:
 *                           type: string
 *                         email:
 *                           type: string
 *                         soDienThoai:
 *                           type: string
 *                         anhDaiDien:
 *                           type: string
 *                         trangThai:
 *                           type: string
 *                         vaiTro:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             ten:
 *                               type: string
 *                               example: chu_tro
 *       404:
 *         description: Không tìm thấy BĐS hoặc tác giả
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/property/{id}:
 *   get:
 *     summary: Lấy thông tin bất động sản theo ID
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID bất động sản
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       404:
 *         description: Không tìm thấy
 *       500:
 *         description: Lỗi server
 *   put:
 *     summary: Cập nhật thông tin bất động sản
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID bất động sản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xóa bất động sản
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID bất động sản
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/property/{district}:
 *   get:
 *     summary: Lấy danh sách bất động sản theo quận
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: district
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên quận/huyện cần lọc
 *     responses:
 *       200:
 *         description: Danh sách bất động sản theo quận
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       500:
 *         description: Lỗi server
 */
