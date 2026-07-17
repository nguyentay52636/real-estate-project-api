import mongoose from 'mongoose';

const LichSchema = new mongoose.Schema(
  {
    // Người đặt lịch xem nhà
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
      index: true,
    },
    // Căn hộ / BĐS muốn xem
    batDongSanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      required: true,
      index: true,
    },
    thoiGian: { type: Date, required: true },
    ghiChu: { type: String, default: '' },
    trangThai: {
      type: String,
      enum: ['cho_xac_nhan', 'da_xac_nhan', 'da_huy'],
      default: 'cho_xac_nhan',
      index: true,
    },
  },
  { timestamps: true },
);

LichSchema.index({ batDongSanId: 1, thoiGian: 1 });
LichSchema.index({ nguoiDungId: 1, createdAt: -1 });

export default mongoose.models.LichXemNha || mongoose.model('LichXemNha', LichSchema);
