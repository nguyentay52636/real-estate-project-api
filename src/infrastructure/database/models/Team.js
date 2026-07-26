import mongoose from 'mongoose';

const NhomSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true, trim: true },
    ma: { type: String, trim: true, default: '' },
    moTa: { type: String, default: '' },
    chiNhanh: { type: String, default: '', trim: true },
    truongNhomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
    },
    thanhVienIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'nguoiDung',
      },
    ],
    trangThai: {
      type: String,
      enum: ['dang_hoat_dong', 'tam_ngung'],
      default: 'dang_hoat_dong',
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

NhomSchema.index({ ten: 1 });

export default mongoose.models.Nhom || mongoose.model('Nhom', NhomSchema);
