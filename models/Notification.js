import mongoose from 'mongoose';

const ThongBaoSchema = new mongoose.Schema({
  nguoiNhanId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung', required: true },
  tieuDe: { type: String, required: true, maxlength: 100 },
  noiDung: { type: String, required: true, maxlength: 1000 },
  daDoc: { type: Boolean, default: false },
  loai: { type: String, enum: ['he_thong', 'ca_nhan', 'canh_bao'], default: 'he_thong' },
  ngayHetHan: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('ThongBao', ThongBaoSchema);
