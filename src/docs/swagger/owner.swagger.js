/**
 * @swagger
 * tags:
 *   name: Owner
 *   description: API for owner (ChuNha) management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Owner:
 *       type: object
 *       required:
 *         - nguoiDungId
 *       properties:
 *         _id:
 *           type: string
 *         nguoiDungId:
 *           type: string
 *           description: User reference (ObjectId)
 *         tongSoBds:
 *           type: number
 *           default: 0
 *         tongThuNhap:
 *           type: number
 *           default: 0
 *         danhSachBds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of property IDs
 *         diemTrungBinh:
 *           type: number
 *           default: 0
 *         soDanhGia:
 *           type: number
 *           default: 0
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
 * /api/owner:
 *   get:
 *     summary: Get all owners
 *     tags: [Owner]
 *     responses:
 *       200:
 *         description: List of owners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 owners:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Owner'
 *       500:
 *         description: Get all owners failed
 *   post:
 *     summary: Create a new owner
 *     tags: [Owner]
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
 *               tongSoBds:
 *                 type: number
 *               tongThuNhap:
 *                 type: number
 *               danhSachBds:
 *                 type: array
 *                 items:
 *                   type: string
 *               diemTrungBinh:
 *                 type: number
 *               soDanhGia:
 *                 type: number
 *               ghiChu:
 *                 type: string
 *     responses:
 *       201:
 *         description: Owner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 owner:
 *                   $ref: '#/components/schemas/Owner'
 *       400:
 *         description: Missing required fields or User not found
 *       500:
 *         description: Create owner failed
 */

/**
 * @swagger
 * /api/owner/{id}:
 *   get:
 *     summary: Get owner by ID
 *     tags: [Owner]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Owner ID
 *     responses:
 *       200:
 *         description: Owner details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 owner:
 *                   $ref: '#/components/schemas/Owner'
 *       400:
 *         description: Owner not found or invalid ID
 *       500:
 *         description: Get owner by id failed
 *   put:
 *     summary: Update owner
 *     tags: [Owner]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Owner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tongSoBds:
 *                 type: number
 *               tongThuNhap:
 *                 type: number
 *               danhSachBds:
 *                 type: array
 *                 items:
 *                   type: string
 *               diemTrungBinh:
 *                 type: number
 *               soDanhGia:
 *                 type: number
 *               ghiChu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Owner updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 owner:
 *                   $ref: '#/components/schemas/Owner'
 *       400:
 *         description: Owner not found or invalid ID
 *       500:
 *         description: Update owner failed
 *   delete:
 *     summary: Delete owner
 *     tags: [Owner]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Owner ID
 *     responses:
 *       200:
 *         description: Owner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 owner:
 *                   $ref: '#/components/schemas/Owner'
 *       400:
 *         description: Owner not found or invalid ID
 *       500:
 *         description: Delete owner failed
 */
