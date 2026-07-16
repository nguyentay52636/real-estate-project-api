/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: API for customer management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - nguoiDungId
 *         - vaiTro
 *       properties:
 *         _id:
 *           type: string
 *         nguoiDungId:
 *           type: string
 *           description: User reference (ObjectId)
 *         vaiTro:
 *           type: string
 *           description: Role reference (ObjectId)
 *         diaChi:
 *           type: string
 *           default: ""
 *         loai:
 *           type: string
 *           default: "standard"
 *         tongChiTieu:
 *           type: number
 *           default: 0
 *         soBdsDangThue:
 *           type: number
 *           default: 0
 *         soBdsYeuThich:
 *           type: number
 *           default: 0
 *         soDanhGia:
 *           type: number
 *           default: 0
 *         diemTrungBinh:
 *           type: number
 *           default: 0
 *         bdsDangThueHienTai:
 *           type: string
 *         ngayKetThucHopDong:
 *           type: string
 *           format: date
 *         lanHoatDongGanNhat:
 *           type: string
 *           format: date
 *         ghiChu:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/customer:
 *   get:
 *     summary: Get all customers
 *     tags: [Customer]
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *       500:
 *         description: Get all customers failed
 *   post:
 *     summary: Create a new customer
 *     tags: [Customer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *                 description: User ID (required)
 *               vaiTro:
 *                 type: string
 *                 description: Role ID
 *               diaChi:
 *                 type: string
 *                 description: Customer address
 *               loai:
 *                 type: string
 *                 description: Customer type
 *               tongChiTieu:
 *                 type: number
 *                 description: Total spending
 *               soBdsDangThue:
 *                 type: number
 *                 description: Number of properties currently rented
 *               soBdsYeuThich:
 *                 type: number
 *                 description: Number of favorite properties
 *               soDanhGia:
 *                 type: number
 *                 description: Number of reviews
 *               diemTrungBinh:
 *                 type: number
 *                 description: Average rating
 *               bdsDangThueHienTai:
 *                 type: string
 *                 description: Currently rented property
 *               ngayKetThucHopDong:
 *                 type: string
 *                 format: date
 *                 description: Contract end date
 *               lanHoatDongGanNhat:
 *                 type: string
 *                 format: date
 *                 description: Last activity date
 *               ghiChu:
 *                 type: string
 *                 description: Notes
 *     responses:
 *       200:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Missing required fields, Nguoi dung not found, or Customer already exists for this user
 *       500:
 *         description: Create customer failed
 */

/**
 * @swagger
 * /api/customer/{id}:  
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Customer not found or invalid ID
 *       500:
 *         description: Get customer by id failed
 *   put:
 *     summary: Update customer
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *                 description: User ID
 *               vaiTro:
 *                 type: string
 *                 description: Role ID
 *               diaChi:
 *                 type: string
 *                 description: Customer address
 *               loai:
 *                 type: string
 *                 description: Customer type
 *               tongChiTieu:
 *                 type: number
 *                 description: Total spending
 *               soBdsDangThue:
 *                 type: number
 *                 description: Number of properties currently rented
 *               soBdsYeuThich:
 *                 type: number
 *                 description: Number of favorite properties
 *               soDanhGia:
 *                 type: number
 *                 description: Number of reviews
 *               diemTrungBinh:
 *                 type: number
 *                 description: Average rating
 *               bdsDangThueHienTai:
 *                 type: string
 *                 description: Currently rented property
 *               ngayKetThucHopDong:
 *                 type: string
 *                 format: date
 *                 description: Contract end date
 *               lanHoatDongGanNhat:
 *                 type: string
 *                 format: date
 *                 description: Last activity date
 *               ghiChu:
 *                 type: string
 *                 description: Notes
 *     responses:
 *       200:
 *         description: Update customer successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Customer not found or Nguoi dung not found
 *       500:
 *         description: Update customer failed
 *   delete:
 *     summary: Delete customer
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Delete customer successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Customer not found or invalid ID
 *       500:
 *         description: Delete customer failed
 */
