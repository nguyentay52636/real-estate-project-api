import mongoose from 'mongoose';

const TinTucSchema = new mongoose.Schema({
  tieuDe: { type: String , required: true , maxlength: 200 },
  moTa: { type: String , required: true },
  danhMuc: { type: String , required: true, enum: ['chung_cu', 'nha_o', 'dat_nen', 'khac'] },
  noiDung: { type: String , required: true },
  anhDaiDien: { type: String },
  tacGiaId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('TinTuc', TinTucSchema);
