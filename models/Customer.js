import mongoose from 'mongoose';

const KhachHangSchema = new mongoose.Schema({
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nguoiDung",
      required: true,
      unique: true,
    },
    diaChi: {
      type: String,
      required: false,
      default: "",
    },
    loai: {
      type: String,
      default: "standard",
    },
    tongChiTieu: {
      type: Number,
      default: 0,
    },
    soBdsDangThue: {
      type: Number,
      default: 0,
    },
    soBdsYeuThich: {
      type: Number,
      default: 0,
    },
    soDanhGia: {
      type: Number,
      default: 0,
    },
    diemTrungBinh: {
      type: Number,
      default: 0,
    },
    bdsDangThueHienTai: {
      type: String,
    },
    ngayKetThucHopDong: {
      type: Date,
    },
    lanHoatDongGanNhat: {
      type: Date,
    },
    ghiChu: {
      type: String,
    },
  }, { timestamps: true });
  
  export default mongoose.models.KhachHang || mongoose.model("KhachHang", KhachHangSchema);
  