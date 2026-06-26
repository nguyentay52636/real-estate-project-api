import Customer from '../models/Customer.js';
import NguoiDung from '../models/User.js';

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate("nguoiDungId")
    
    res.status(200).json({
      message: "Get all customers successfully",
      customers: customers
    });
  } catch (error) {
    res.status(500).json({
      message: "Get all customers failed",
      error: error.message
    });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        message: "Customer ID is required"
      });
    }

    const customer = await Customer.findById(id)
      .populate("nguoiDungId",)

    if (!customer) {
      return res.status(400).json({
        message: "Customer not found"
      });
    }

    res.status(200).json({
      message: "Get customer by id successfully",
      customer: customer
    });
  } catch (error) {
    res.status(500).json({
      message: "Get customer by id failed",
      error: error.message
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { nguoiDungId, diaChi, loai, tongChiTieu, soBdsDangThue, soBdsYeuThich, soDanhGia, diemTrungBinh, bdsDangThueHienTai, ngayKetThucHopDong, lanHoatDongGanNhat, ghiChu } = req.body;

    if (!nguoiDungId) {
      return res.status(400).json({
        message: "nguoiDungId is required"
      });
    }

    // Check if user exists
    const existingUser = await NguoiDung.findById(nguoiDungId);
    if (!existingUser) {
      return res.status(400).json({
        message: "Nguoi dung not found"
      });
    }

    // Check if customer already exists for this user
    const existingCustomer = await Customer.findOne({ nguoiDungId });
    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer already exists for this user"
      });
    }

    const newCustomer = await Customer.create({
      nguoiDungId,
      diaChi: diaChi || "",
      loai: loai || "standard",
      tongChiTieu: tongChiTieu || 0,
      soBdsDangThue: soBdsDangThue || 0,
      soBdsYeuThich: soBdsYeuThich || 0,
      soDanhGia: soDanhGia || 0,
      diemTrungBinh: diemTrungBinh || 0,
      bdsDangThueHienTai,
      ngayKetThucHopDong,
      lanHoatDongGanNhat,
      ghiChu
    });

    const populatedCustomer = await Customer.findById(newCustomer._id)
      .populate("nguoiDungId")
    res.status(200).json({
      message: "Create customer successfully",
      customer: populatedCustomer
    });
  } catch (error) {
    res.status(500).json({
      message: "Create customer failed",
      error: error.message
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { nguoiDungId, diaChi, loai, tongChiTieu, soBdsDangThue, soBdsYeuThich, soDanhGia, diemTrungBinh, bdsDangThueHienTai, ngayKetThucHopDong, lanHoatDongGanNhat, ghiChu } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Customer ID is required"
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(400).json({
        message: "Customer not found"
      });
    }

    // Check if user exists if nguoiDungId is being updated
    if (nguoiDungId) {
      const existingUser = await NguoiDung.findById(nguoiDungId);
      if (!existingUser) {
        return res.status(400).json({
          message: "Nguoi dung not found"
        });
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        nguoiDungId,
        diaChi,
        loai,
        tongChiTieu,
        soBdsDangThue,
        soBdsYeuThich,
        soDanhGia,
        diemTrungBinh,
        bdsDangThueHienTai,
        ngayKetThucHopDong,
        lanHoatDongGanNhat,
        ghiChu
      },
      { new: true }
    ).populate("nguoiDungId", "ten email soDienThoai");

    res.status(200).json({
      message: "Update customer successfully",
      customer: updatedCustomer
    });
  } catch (error) {
    res.status(500).json({
      message: "Update customer failed",
      error: error.message
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Customer ID is required"
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(400).json({
        message: "Customer not found"
      });
    }

    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      message: "Delete customer successfully",
      customer: customer
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete customer failed",
      error: error.message
    });
  }
};

export { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
export default { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };