import Employee from '#models/Employee.js';

const employeeController = {
  getAllEmployee: async (req, res) => {
    try {
      const employees = await Employee.find().populate("nguoiDungId");
      if (employees)
        return res
          .status(200)
          .json({ message: "Get all employee successfully", employees });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Get all employee failed", error: err });
    }
  },
  createEmployee: async (req, res) => {
    try {
      const { nguoiDungId, phongBan, chucVu, luong, ngayVaoLam } = req.body;
      // Kiểm tra các trường bắt buộc
      if (!nguoiDungId || !phongBan || !chucVu || !luong || !ngayVaoLam) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const existed = await Employee.findOne({ nguoiDungId });
      if (existed) {
        return res
          .status(409)
          .json({ message: "Employee already exists for this user" });
      }
      const newEmployee = new Employee({
        nguoiDungId,
        phongBan,
        chucVu,
        luong,
        ngayVaoLam,
      });
      const savedEmployee = await newEmployee.save();
      return res.status(201).json({
        message: "Employee created successfully",
        employee: savedEmployee,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Create employee failed", error: err });
    }
  },
  updateEmployee: async (req, res) => {
    try {
      const employeeId = req.params.id;
      const { nguoiDungId, phongBan, chucVu, luong, ngayVaoLam } = req.body;
      const employee = await Employee.findByIdAndUpdate(employeeId, req.body, {
        new: true,
      });
      if (!employee)
        return res.status(404).json({ message: "Employee not found" });
      return res
        .status(200)
        .json({ message: "Update employee successfully", employee });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Update employee failed", error: err });
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      const employeeId = req.params.id;
      const deletedEmployee = await Employee.findByIdAndDelete(employeeId);
      if (!deletedEmployee)
        return res.status(404).json({ message: "Employee not found" });
      return res
        .status(200)
        .json({ message: "Delete employee successfully", deletedEmployee });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Delete employee failed", error: err });
    }
  },
  getEmployeeById: async (req, res) => {
    try {
      const {id} = req.params;
      const employee = await Employee.findById(id).populate(
        "nguoiDungId"
      );
      if (!employee)
        return res.status(404).json({ message: "Employee not found" });
      return res
        .status(200)
        .json({ message: "Get employee by id successfully", employee });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Get employee by id failed", error: err });
    }
  },
  searchEmployees: async (req, res) => {
    try {
      const keyword = req.query.keyword || "";
      const employees = await Employee.find().populate({
        path: "nguoiDungId",
        match: {
          $or: [
            { ten: { $regex: keyword, $options: "i" } },
            { tenDangNhap: { $regex: keyword, $options: "i" } },
          ],
        },
      });

      // Lọc nhân viên có nguoiDungId khớp (do match có thể trả về null)
      const filteredEmployees = employees.filter(
        (emp) =>
          emp.nguoiDungId !== null ||
          emp.phongBan.toLowerCase().includes(keyword.toLowerCase()) ||
          emp.chucVu.toLowerCase().includes(keyword.toLowerCase())
      );

      if (filteredEmployees.length === 0) {
        return res.status(404).json({ message: "No employees found" });
      }

      return res.status(200).json({
        message: "Search employees successfully",
        employees: filteredEmployees,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Search employees failed", error: err });
    }
  },
};

export default employeeController;
