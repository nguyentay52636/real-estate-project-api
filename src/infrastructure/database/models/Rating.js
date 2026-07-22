import mongoose from 'mongoose';

const DanhGiaSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' },
  soSao: { type: Number, min: 1, max: 5 , required: true },
  binhLuan: String
}, { timestamps: true });

DanhGiaSchema.index({ batDongSanId: 1, createdAt: -1 });
DanhGiaSchema.index({ nguoiDungId: 1, createdAt: -1 });
DanhGiaSchema.index({ nguoiDungId: 1, batDongSanId: 1 });

export default mongoose.model('DanhGia', DanhGiaSchema);
