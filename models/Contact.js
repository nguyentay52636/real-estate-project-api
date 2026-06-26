import mongoose from 'mongoose';

const LienHeSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' },
  ngayTraLoi: { type: Date, default: null },
  tinNhan: { type: String, required: true },
  trangThai: { type: String, enum: ['chua_tra_loi', 'da_tra_loi'], default: 'chua_tra_loi' },
  ngayGui: { type: Date, default: Date.now }
});

export default mongoose.model('LienHe', LienHeSchema);
