import mongoose from 'mongoose';

export const PROPERTY_LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'FOLLOWING',
  'CLOSED',
  'LOST',
];

const PropertyLeadSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
      index: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      index: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PROPERTY_LEAD_STATUSES,
      default: 'NEW',
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
    lastAction: {
      type: String,
      default: '',
    },
    /** Các action đã từng ghi nhận (unique) — dùng ranking UI */
    actions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

// Mỗi property chỉ 1 lead / viewer
PropertyLeadSchema.index({ propertyId: 1, viewerId: 1 }, { unique: true });
PropertyLeadSchema.index({ ownerId: 1, score: -1 });
PropertyLeadSchema.index({ propertyId: 1, score: -1 });

export default mongoose.models.PropertyLead
  || mongoose.model('PropertyLead', PropertyLeadSchema);
