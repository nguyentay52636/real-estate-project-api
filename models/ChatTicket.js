import mongoose from 'mongoose';

const ChatTicketSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  handoffToken: { type: String, required: true, unique: true, index: true },
  khachHangId: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' },
  tenKhachHang: { type: String, default: 'Khách hàng' },
  lyDo: { type: String, default: 'AI chuyển nhân viên' },
  lichSuChat: [{
    role: { type: String, enum: ['user', 'ai'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  trangThai: {
    type: String,
    enum: ['pending', 'active', 'resolved', 'timeout', 'cancelled'],
    default: 'pending',
    index: true,
  },
  nhanVienId: { type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung', default: null },
  phongChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongChat', default: null },
  /** Nhân viên đã ẩn/bỏ qua ticket này khỏi danh sách thông báo */
  boQuaBoi: [{ type: mongoose.Schema.Types.ObjectId, ref: 'nguoiDung' }],
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('ChatTicket', ChatTicketSchema);
