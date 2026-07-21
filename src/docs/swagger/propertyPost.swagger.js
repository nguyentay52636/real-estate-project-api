/**
 * @swagger
 * tags:
 *   name: PropertyPost
 *   description: API đăng và quản lý bài BĐS (admin, nhan_vien, chu_tro)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PropertyPostInput:
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
 *         toaDo:
 *           type: object
 *           description: Tọa độ địa lý (vĩ độ, kinh độ). Nếu bỏ trống sẽ tự động gán tọa độ trung tâm quận/huyện
 *           properties:
 *             lat:
 *               type: number
 *               example: 10.7756
 *             lng:
 *               type: number
 *               example: 106.7004
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
 *           enum: [cho_duyet, dang_hoat_dong, da_ban, da_cho_thue]
 *           description: Mặc định khi đăng mới thường là cho_duyet
 *         thongTinChiTiet:
 *           type: object
 */

/**
 * @swagger
 * /api/property-post:
 *   get:
 *     summary: Lấy bài đăng được phép quản lý
 *     description: Chủ trọ chỉ thấy bài của mình; admin/nhân viên thấy mọi bài.
 *     tags: [PropertyPost]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Sai vai trò hoặc tài khoản bị khóa
 *   post:
 *     summary: Đăng bài bất động sản
 *     description: Chủ bài lấy từ JWT; không cần gửi nguoiDungId.
 *     tags: [PropertyPost]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PropertyPostInput'
 *     responses:
 *       201:
 *         description: Đăng bài thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Sai vai trò hoặc tài khoản bị khóa
 */

/**
 * @swagger
 * /api/property-post/user/{userId}:
 *   get:
 *     summary: Lấy danh sách bài đăng theo userId (dashboard)
 *     description: |
 *       chu_tro chỉ xem được userId = chính mình.
 *       admin / nhan_vien xem được mọi user.
 *       Trả cả tin cho_duyet (public=false).
 *     tags: [PropertyPost]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [cho_duyet, dang_hoat_dong, da_ban, da_cho_thue]
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền xem bài của user khác
 *       404:
 *         description: Không tìm thấy người dùng
 */

/**
 * @swagger
 * /api/property-post/{id}:
 *   get:
 *     summary: Lấy chi tiết bài được phép quản lý
 *     tags: [PropertyPost]
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
 *         description: Thành công
 *       403:
 *         description: Không có quyền quản lý bài
 *       404:
 *         description: Không tìm thấy bài
 *   put:
 *     summary: Cập nhật bài đăng
 *     tags: [PropertyPost]
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
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền quản lý bài
 *       404:
 *         description: Không tìm thấy bài
 *   delete:
 *     summary: Xóa bài đăng
 *     tags: [PropertyPost]
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
 *       403:
 *         description: Không có quyền quản lý bài
 *       404:
 *         description: Không tìm thấy bài
 */

/**
 * @swagger
 * /api/property-post/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái bài đăng
 *     tags: [PropertyPost]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trangThai]
 *             properties:
 *               trangThai:
 *                 type: string
 *                 enum: [cho_duyet, dang_hoat_dong, da_ban, da_cho_thue]
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Trạng thái không hợp lệ
 *       403:
 *         description: Không có quyền quản lý bài
 *       404:
 *         description: Không tìm thấy bài
 */
