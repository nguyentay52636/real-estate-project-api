/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: API for employee management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - nguoiDungId
 *         - phongBan
 *         - chucVu
 *         - luong
 *         - ngayVaoLam
 *       properties:
 *         _id:
 *           type: string
 *         nguoiDungId:
 *           type: string
 *           description: User reference (ObjectId)
 *         phongBan:
 *           type: string
 *         chucVu:
 *           type: string
 *         luong:
 *           type: number
 *         hieuSuat:
 *           type: number
 *           default: 0
 *         ngayVaoLam:
 *           type: string
 *           format: date
 *         trangThai:
 *           type: string
 *           default: active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/employee:
 *   get:
 *     summary: Get all employees
 *     tags: [Employee]
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *       500:
 *         description: Get all employee failed
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nguoiDungId
 *               - phongBan
 *               - chucVu
 *               - luong
 *               - ngayVaoLam
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               phongBan:
 *                 type: string
 *               chucVu:
 *                 type: string
 *               luong:
 *                 type: number
 *               ngayVaoLam:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Employee already exists for this user
 *       500:
 *         description: Create employee failed
 */

/**
 * @swagger
 * /api/employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Get employee by id failed
 *   put:
 *     summary: Update employee
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nguoiDungId:
 *                 type: string
 *               phongBan:
 *                 type: string
 *               chucVu:
 *                 type: string
 *               luong:
 *                 type: number
 *               ngayVaoLam:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Update employee successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Update employee failed
 *   delete:
 *     summary: Delete employee
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Delete employee successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedEmployee:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Delete employee failed
 */

/**
 * @swagger
 * /api/employee/search:
 *   get:
 *     summary: Search employees by keyword (name, username, department, position)
 *     tags: [Employee]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         required: false
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search employees successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *       404:
 *         description: No employees found
 *       500:
 *         description: Search employees failed
 */
