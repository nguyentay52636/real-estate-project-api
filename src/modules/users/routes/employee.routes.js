import employeeController from '#modules/users/controllers/employeeController.js';
import express from 'express';

const router = express.Router();

router.get("/", employeeController.getAllEmployee);
router.post("/", employeeController.createEmployee);
router.put("/:id", employeeController.updateEmployee);
router.delete("/:id", employeeController.deleteEmployee);
router.get("/search", employeeController.searchEmployees);
router.get("/:id", employeeController.getEmployeeById);

export default router;
