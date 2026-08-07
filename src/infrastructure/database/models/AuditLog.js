import mongoose from 'mongoose';

const NhatKySchema = new mongoose.Schema(
  {
    thucThe: {
      type: String,
      enum: ['deal', 'team', 'property', 'viewing', 'contact', 'employee', 'user', 'auth', 'admin'],
      required: true,
      index: true,
    },
    thucTheId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
      default: null,
    },
    hanhDong: {
      type: String,
      required: true,
      trim: true,
    },
    truoc: { type: mongoose.Schema.Types.Mixed, default: null },
    sau: { type: mongoose.Schema.Types.Mixed, default: null },
    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: false,
      default: null,
    },
    ghiChu: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

NhatKySchema.index({ thucThe: 1, thucTheId: 1, createdAt: -1 });
NhatKySchema.index({ thucThe: 1, createdAt: -1 });

export default mongoose.models.NhatKy || mongoose.model('NhatKy', NhatKySchema);
