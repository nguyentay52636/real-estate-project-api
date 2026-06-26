import mongoose from 'mongoose';

const NhanVienSchema = new mongoose.Schema(
  {
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nguoiDung",
      required: true,
      unique: true,
    },
    phongBan: {
      type: String,
      required: true,
      enum: ["sale","ho_tro_khach_hang","chuyen_vien_sale","truong_phong_ban"],
      default: "sale"
    },
    chucVu: {
      type: String,
      required: true,
      enum: ["nhan_vien","quan_ly","giam_doc","truong_phong"],
      default: "nhan_vien"
    },
    luong: {
      type: Number,
      required: true,
      default: 0,
    },
    hieuSuat: {
      type: Number,
      default: 0,
    },
    ngayVaoLam: {
      type: Date,
      required: true,
      default: Date.now,
    },
    trangThai: {
      type: String,
      enum: ["dang_hoat_dong", "tam_nghi", "da_nghi"],
      default: "dang_hoat_dong",
    },
  },
  { timestamps: true }
);

export default mongoose.models.NhanVien || mongoose.model("NhanVien", NhanVienSchema);
