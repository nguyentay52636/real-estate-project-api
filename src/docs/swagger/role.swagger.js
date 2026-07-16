/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - ten
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the role
 *           example: "64f8a1b2c3d4e5f6a7b8c9d0"
 *         ten:
 *           type: string
 *           enum: [admin, nhan_vien, nguoi_thue, chu_tro]
 *           description: The name of the role
 *           example: "admin"
 *         moTa:
 *           type: string
 *           description: Description of the role
 *           example: "Administrator role with full access"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the role was created
 *           example: "2023-09-06T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the role was last updated
 *           example: "2023-09-06T10:30:00.000Z"
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Internal server error"
 */

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management API endpoints
 */

/**
 * @swagger
 * /api/role:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve a list of all available roles in the system
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: Successfully retrieved all roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *             example:
 *               - _id: "64f8a1b2c3d4e5f6a7b8c9d0"
 *                 ten: "admin"
 *                 moTa: "Administrator role with full access"
 *                 createdAt: "2023-09-06T10:30:00.000Z"
 *                 updatedAt: "2023-09-06T10:30:00.000Z"
 *               - _id: "64f8a1b2c3d4e5f6a7b8c9d1"
 *                 ten: "nhan_vien"
 *                 moTa: "Employee role with limited access"
 *                 createdAt: "2023-09-06T10:30:00.000Z"
 *                 updatedAt: "2023-09-06T10:30:00.000Z"
 *               - _id: "64f8a1b2c3d4e5f6a7b8c9d2"
 *                 ten: "nguoi_thue"
 *                 moTa: "Tenant role for property renters"
 *                 createdAt: "2023-09-06T10:30:00.000Z"
 *                 updatedAt: "2023-09-06T10:30:00.000Z"
 *               - _id: "64f8a1b2c3d4e5f6a7b8c9d3"
 *                 ten: "chu_tro"
 *                 moTa: "Landlord role for property owners"
 *                 createdAt: "2023-09-06T10:30:00.000Z"
 *                 updatedAt: "2023-09-06T10:30:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Internal server error"
 */
