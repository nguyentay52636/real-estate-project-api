import mongoose from 'mongoose';

const YeuThichSchema = new mongoose.Schema({
  nguoiDungId: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' ,required: true },
  batDongSanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatDongSan' , required: true },
}, {
  timestamps: true,
  versionKey: false,
});

YeuThichSchema.index({ nguoiDungId: 1, batDongSanId: 1 }, { unique: true });
YeuThichSchema.index({ batDongSanId: 1 });
YeuThichSchema.index({ nguoiDungId: 1, createdAt: -1 });

export default mongoose.model('YeuThich', YeuThichSchema);
