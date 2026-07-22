import CustomerModel from '#models/Customer.js';
import UserModel from '#models/User.js';
import { AppError } from '#shared/errors/AppError.js';

const CUSTOMER_FIELDS = [
  'nguoiDungId',
  'diaChi',
  'loai',
  'tongChiTieu',
  'soBdsDangThue',
  'soBdsYeuThich',
  'soDanhGia',
  'diemTrungBinh',
  'bdsDangThueHienTai',
  'ngayKetThucHopDong',
  'lanHoatDongGanNhat',
  'ghiChu',
];

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function parsePagination({ page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

export function createCustomerService(deps = {}) {
  const Customer = deps.Customer ?? CustomerModel;
  const User = deps.User ?? UserModel;

  async function getCustomers(query = {}) {
    const { pageNum, limitNum, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Customer.find()
        .populate('nguoiDungId', 'ten email soDienThoai anhDaiDien')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        ,
      Customer.countDocuments(),
    ]);
    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async function getCustomerById(id) {
    if (!id) throw new AppError('Customer ID is required', 400);
    const customer = await Customer.findById(id)
      .populate('nguoiDungId', 'ten email soDienThoai anhDaiDien')
      ;
    if (!customer) throw new AppError('Customer not found', 400);
    return customer;
  }

  async function createCustomer(input) {
    const { nguoiDungId } = input;
    if (!nguoiDungId) throw new AppError('nguoiDungId is required', 400);

    const user = await User.findById(nguoiDungId).select('_id');
    if (!user) throw new AppError('Nguoi dung not found', 400);

    const existing = await Customer.findOne({ nguoiDungId });
    if (existing) throw new AppError('Customer already exists for this user', 400);

    const created = await Customer.create({
      nguoiDungId,
      diaChi: input.diaChi || '',
      loai: input.loai || 'standard',
      tongChiTieu: input.tongChiTieu || 0,
      soBdsDangThue: input.soBdsDangThue || 0,
      soBdsYeuThich: input.soBdsYeuThich || 0,
      soDanhGia: input.soDanhGia || 0,
      diemTrungBinh: input.diemTrungBinh || 0,
      bdsDangThueHienTai: input.bdsDangThueHienTai,
      ngayKetThucHopDong: input.ngayKetThucHopDong,
      lanHoatDongGanNhat: input.lanHoatDongGanNhat,
      ghiChu: input.ghiChu,
    });

    return Customer.findById(created._id)
      .populate('nguoiDungId', 'ten email soDienThoai anhDaiDien')
      ;
  }

  async function updateCustomer(id, input) {
    if (!id) throw new AppError('Customer ID is required', 400);

    const customer = await Customer.findById(id).select('_id');
    if (!customer) throw new AppError('Customer not found', 400);

    if (input.nguoiDungId) {
      const user = await User.findById(input.nguoiDungId).select('_id');
      if (!user) throw new AppError('Nguoi dung not found', 400);
    }

    return Customer.findByIdAndUpdate(id, pick(input, CUSTOMER_FIELDS), {
      new: true,
    })
      .populate('nguoiDungId', 'ten email soDienThoai')
      ;
  }

  async function deleteCustomer(id) {
    if (!id) throw new AppError('Customer ID is required', 400);
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 400);
    await Customer.findByIdAndDelete(id);
    return customer;
  }

  return { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
}

const customerService = createCustomerService();
export default customerService;
