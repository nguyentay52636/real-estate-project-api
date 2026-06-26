import mongoose from 'mongoose';

const ChuNhaSchema = new mongoose.Schema(
  {
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nguoiDung",
      required: true,
      unique: true,
    },
    tongSoBds: {
      type: Number,
      default: 0,
    },
    tongThuNhap: {
      type: Number,
      default: 0,
    },
    danhSachBds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BatDongSan",
      },
    ],
    diemTrungBinh: {
      type: Number,
      default: 0,
    },
    soDanhGia: {
      type: Number,
      default: 0,
    },
    ghiChu: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ChuNha || mongoose.model("ChuNha", ChuNhaSchema);
