// models/Notification.js.js
import mongoose from 'mongoose';

const ThongBaoSchema = new mongoose.Schema({
  nguoiNhan: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung', required: true },
  loai: { type: String, enum: ['new_message', 'room_update', 'call', 'handoff_ticket'], required: true },
  noiDung: { type: String, required: true },
  daDoc: { type: Boolean, default: false },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChat' },
  tinNhanId: { type: mongoose.Schema.Types.ObjectId, ref: 'TinNhan' },
  handoffToken: { type: String, index: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatTicket' },
}, {
  timestamps: true,
  versionKey: false,
});

ThongBaoSchema.index({ nguoiNhan: 1, createdAt: -1 });

export default mongoose.model('ThongBaoChat', ThongBaoSchema);