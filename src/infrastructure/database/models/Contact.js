import mongoose from 'mongoose';

const VALID_STATUSES = ['moi', 'dang_xu_ly', 'da_phan_hoi', 'da_dong'];

const LienHeSchema = new mongoose.Schema(
  {
    chuDe: { type: String, required: true, trim: true },
    hoTen: { type: String, required: true, trim: true },
    soDienThoai: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    noiDung: { type: String, required: true, trim: true },
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
      index: true,
    },
    trangThai: {
      type: String,
      enum: VALID_STATUSES,
      default: 'moi',
      index: true,
    },
    ghiChuNoiBo: { type: String, default: '' },
  },
  { timestamps: true },
);

LienHeSchema.index({ trangThai: 1, createdAt: -1 });
LienHeSchema.index({ email: 1 });

export { VALID_STATUSES };
export default mongoose.models.LienHe || mongoose.model('LienHe', LienHeSchema);
