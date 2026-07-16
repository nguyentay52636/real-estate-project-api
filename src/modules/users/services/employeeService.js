import EmployeeModel from '#models/Employee.js';
import { AppError } from '#shared/errors/AppError.js';

export function createEmployeeService(deps = {}) {
  const Employee = deps.Employee ?? EmployeeModel;

  async function getAllEmployees() {
    return Employee.find().populate('nguoiDungId');
  }

  async function getEmployeeById(id) {
    const employee = await Employee.findById(id).populate('nguoiDungId');
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  }

  async function createEmployee(input) {
    const { nguoiDungId, phongBan, chucVu, luong, ngayVaoLam } = input;
    if (!nguoiDungId || !phongBan || !chucVu || !luong || !ngayVaoLam) {
      throw new AppError('Missing required fields', 400);
    }
    const existed = await Employee.findOne({ nguoiDungId });
    if (existed) {
      throw new AppError('Employee already exists for this user', 409);
    }
    const employee = new Employee({ nguoiDungId, phongBan, chucVu, luong, ngayVaoLam });
    return employee.save();
  }

  async function updateEmployee(id, input) {
    const updated = await Employee.findByIdAndUpdate(id, input, { new: true });
    if (!updated) throw new AppError('Employee not found', 404);
    return updated;
  }

  async function deleteEmployee(id) {
    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) throw new AppError('Employee not found', 404);
    return deleted;
  }

  async function searchEmployees(keyword = '') {
    const employees = await Employee.find().populate({
      path: 'nguoiDungId',
      match: {
        $or: [
          { ten: { $regex: keyword, $options: 'i' } },
          { tenDangNhap: { $regex: keyword, $options: 'i' } },
        ],
      },
    });

    const filtered = employees.filter(
      (emp) =>
        emp.nguoiDungId !== null ||
        emp.phongBan.toLowerCase().includes(keyword.toLowerCase()) ||
        emp.chucVu.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (filtered.length === 0) {
      throw new AppError('No employees found', 404);
    }
    return filtered;
  }

  return {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
  };
}

const employeeService = createEmployeeService();
export default employeeService;
