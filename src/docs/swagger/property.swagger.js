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
 *           enum: [dang_hoat_dong, da_cho_thue]
 *         nguoiDungId:
 *           type: string
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
 *             huong:
 *               type: string
 *             banCong:
 *               type: string
 *             noiThat:
 *               type: string
 */

/**
 * @swagger
 * /api/property:
 *   get:
 *     summary: Lấy tất cả bất động sản
 *     tags: [Property]
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
 *     summary: Tạo mới bất động sản
 *     tags: [Property]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: Đã tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Dữ liệu không hợp lệ
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
