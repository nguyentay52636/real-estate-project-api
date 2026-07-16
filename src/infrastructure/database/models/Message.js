import mongoose from 'mongoose';

const TinNhanSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChat', required: true },
  nguoiGuiId: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung', required: true },
  noiDung: { type: String, maxlength: 1000 },
  tapTin: [{ type: String }],
  phanHoiTinNhan: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'TinNhan' },
    noiDung: { type: String },
    nguoiGuiId: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' },
  },
  daDoc: [{ type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' }],
  trangThai: { type: String, enum: ['sent', 'edited', 'deleted', 'recalled'], default: 'sent' },
  loaiTinNhan: { type: String, enum: ['text', 'image', 'cuoc_goi', 'system'], default: 'text' },
  cuocGoi: {
    trangThai: { type: String, enum: ['missed', 'ended', 'declined', 'ongoing'], default: 'missed' },
    thoiLuong: { type: Number, default: 0 },
    loai: { type: String, enum: ['audio', 'video'] },
    thanhVien: [{ type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' }],
  },
}, {
  timestamps: true,
  versionKey: false,
});

TinNhanSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.model('TinNhan', TinNhanSchema);