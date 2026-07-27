import mongoose from 'mongoose';

/** Hợp đồng gắn deal — MVP upload + trạng thái (e-sign sau). */
const HopDongSchema = new mongoose.Schema(
  {
    tieuDe: { type: String, required: true, trim: true },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GiaoDich',
      default: null,
      index: true,
    },
    batDongSanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      default: null,
    },
    fileUrl: { type: String, default: '' },
    trangThai: {
      type: String,
      enum: ['nhap', 'cho_ky', 'da_ky', 'huy'],
      default: 'nhap',
      index: true,
    },
    ghiChu: { type: String, default: '' },
    nguoiTaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

HopDongSchema.index({ createdAt: -1 });

export default mongoose.models.HopDong || mongoose.model('HopDong', HopDongSchema);
