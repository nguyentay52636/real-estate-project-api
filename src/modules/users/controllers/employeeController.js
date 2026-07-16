import employeeService from '#modules/users/services/employeeService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const employeeController = {
  getAllEmployee: asyncHandler(async (req, res) => {
    const employees = await employeeService.getAllEmployees();
    return res.status(200).json({ message: 'Get all employee successfully', employees });
  }),

  createEmployee: asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee(req.body);
    return res.status(201).json({ message: 'Employee created successfully', employee });
  }),

  updateEmployee: asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    return res.status(200).json({ message: 'Update employee successfully', employee });
  }),

  deleteEmployee: asyncHandler(async (req, res) => {
    const deletedEmployee = await employeeService.deleteEmployee(req.params.id);
    return res.status(200).json({ message: 'Delete employee successfully', deletedEmployee });
  }),

  getEmployeeById: asyncHandler(async (req, res) => {
    const employee = await employeeService.getEmployeeById(req.params.id);
    return res.status(200).json({ message: 'Get employee by id successfully', employee });
  }),

  searchEmployees: asyncHandler(async (req, res) => {
    const employees = await employeeService.searchEmployees(req.query.keyword || '');
    return res.status(200).json({ message: 'Search employees successfully', employees });
  }),
};

export default employeeController;
