// models/Notification.js.js (suy ra từ notificationController.js)
import mongoose from 'mongoose';

const ThongBaoSchema = new mongoose.Schema({
  nguoiNhan: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung', required: true },
  loai: { type: String, enum: ['room_update', 'new_message', 'call'], required: true },
  noiDung: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChat' },
  tinNhanId: { type: mongoose.Schema.Types.ObjectId, ref: 'TinNhan' },
  daDoc: { type: Boolean, default: false },
}, {
  timestamps: true,
  versionKey: false,
});

ThongBaoSchema.index({ nguoiNhan: 1, createdAt: -1 });

export default mongoose.model('ThongBao', ThongBaoSchema);