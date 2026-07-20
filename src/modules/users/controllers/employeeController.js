import employeeService from '#modules/users/services/employeeService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const employeeController = {
  /** GET /api/employee — tất cả user vaiTro = nhan_vien */
  getAllEmployee: asyncHandler(async (req, res) => {
    const { data, pagination } = await employeeService.getAllEmployees(req.query);
    return res.status(200).json({
      message: 'Lấy danh sách nhân viên thành công',
      data,
      pagination,
    });
  }),

  /** Alias GET /api/employee/users */
  listStaffUsers: asyncHandler(async (req, res) => {
    const { data, pagination } = await employeeService.listStaffUsers(req.query);
    return res.status(200).json({
      message: 'Lấy danh sách user vai trò nhan_vien thành công',
      data,
      pagination,
    });
  }),

  createEmployee: asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee(req.body);
    return res.status(201).json({
      message: 'Tạo nhân viên thành công',
      data: employee,
    });
  }),

  updateEmployee: asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    return res.status(200).json({
      message: 'Cập nhật nhân viên thành công',
      data: employee,
    });
  }),

  deleteEmployee: asyncHandler(async (req, res) => {
    const result = await employeeService.deleteEmployee(req.params.id);
    return res.status(200).json({
      message: 'Xóa nhân viên thành công',
      data: result,
    });
  }),

  getEmployeeById: asyncHandler(async (req, res) => {
    const employee = await employeeService.getEmployeeById(req.params.id);
    return res.status(200).json({
      message: 'Lấy chi tiết nhân viên thành công',
      data: employee,
    });
  }),

  searchEmployees: asyncHandler(async (req, res) => {
    const employees = await employeeService.searchEmployees(req.query.keyword || req.query.q || '');
    return res.status(200).json({
      message: 'Tìm kiếm nhân viên thành công',
      data: employees,
    });
  }),
};

export default employeeController;
