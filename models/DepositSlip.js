import mongoose from 'mongoose';

const PhieuDatCocSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung', required: true },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan', required: true },
  soTienCoc: { type: Number, required: true , min: 1000 },
  trangThai: { type: String, enum: ['cho_xac_nhan', 'da_xac_nhan', 'da_huy'], default: 'cho_xac_nhan' },
  ngayDatCoc: { type: Date, default: Date.now },
  ngayHetHan: { type: Date, required: true },
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('PhieuDatCoc', PhieuDatCocSchema);
