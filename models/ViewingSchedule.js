import mongoose from 'mongoose';

const LichSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' },
  thoiGian: { type: Date, required: true },
  ghiChu: String,
  trangThai: { type: String, enum: ['cho_xac_nhan', 'da_xac_nhan', 'da_huy'], default: 'cho_xac_nhan' }
});

export default mongoose.model('LichXemNha', LichSchema);
