import mongoose from 'mongoose';

const LEAD_TYPES = ['VIEW', 'PHONE', 'ZALO', 'CHAT', 'BOOKING'];
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'];

const LeadSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      required: true,
      index: true,
    },
    // Chủ tin đăng (BatDongSan.nguoiDungId)
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
      index: true,
    },
    // Người xem / quan tâm (thường là nguoi_thue)
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: LEAD_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'NEW',
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true, versionKey: false },
);

LeadSchema.index({ ownerId: 1, createdAt: -1 });
LeadSchema.index({ propertyId: 1, createdAt: -1 });
LeadSchema.index({ viewerId: 1, propertyId: 1, type: 1, createdAt: -1 });

export { LEAD_TYPES, LEAD_STATUSES };
export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
