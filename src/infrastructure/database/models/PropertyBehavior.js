import mongoose from 'mongoose';

export const BEHAVIOR_ACTIONS = [
  'IMPRESSION',
  'VIEW_DETAIL',
  'VIEW_IMAGE',
  'VIEW_VIDEO',
  'SAVE_PROPERTY',
  'SHARE_PROPERTY',
  'VIEW_PHONE',
  'CLICK_ZALO',
  'CHAT',
  'CALL',
  'BOOKING',
];

/** Điểm cộng vào PropertyLead khi ghi behavior (IMPRESSION không cộng điểm). */
export const BEHAVIOR_SCORES = {
  IMPRESSION: 0,
  VIEW_DETAIL: 1,
  VIEW_IMAGE: 1,
  VIEW_VIDEO: 2,
  SAVE_PROPERTY: 5,
  SHARE_PROPERTY: 3,
  VIEW_PHONE: 10,
  CLICK_ZALO: 15,
  CHAT: 20,
  CALL: 20,
  BOOKING: 30,
};

const PropertyBehaviorSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      required: true,
      index: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: '',
      index: true,
    },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    action: {
      type: String,
      enum: BEHAVIOR_ACTIONS,
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

PropertyBehaviorSchema.index({ propertyId: 1, action: 1, createdAt: -1 });
PropertyBehaviorSchema.index({ propertyId: 1, viewerId: 1, action: 1, createdAt: -1 });
PropertyBehaviorSchema.index({ propertyId: 1, sessionId: 1, action: 1, createdAt: -1 });

export default mongoose.models.PropertyBehavior
  || mongoose.model('PropertyBehavior', PropertyBehaviorSchema);
