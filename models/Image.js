import mongoose from 'mongoose';

const HinhAnhSchema = new mongoose.Schema({
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' },
  duongDan: { type: String, required: true },
  laAnhChinh: { type: Boolean, default: false }
});

export default mongoose.model('HinhAnh', HinhAnhSchema);
