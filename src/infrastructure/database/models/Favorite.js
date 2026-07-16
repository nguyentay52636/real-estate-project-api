import mongoose from 'mongoose';

const YeuThichSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' ,required: true },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' , required: true },
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('YeuThich', YeuThichSchema);
