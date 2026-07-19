// models/ChatRoom.js.js
import mongoose from 'mongoose';

const PhongChatSchema = new mongoose.Schema({
  tenPhong: {
    type: String,
    required: function () {
      return this.loaiPhong === 'group';
    },
    trim: true,
  },
  loaiPhong: {
    type: String,
    enum: ['private', 'group'],
    required: true,
  },
  thanhVien: [{
    nguoiDung: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
    },
    vaiTro: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    trangThai: {
      type: String,
      enum: ['active', 'left'],
      default: 'active',
    },
  }],
  nguoiTao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'nguoiDung',
    required: true,
  },
  anhDaiDien: {
    type: String,
    default: '',
  },
  tinNhan: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TinNhan',
  }],
  tinNhanCuoi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TinNhan',
    default: null,
  },
  /** Gắn ngược về ChatTicket khi phòng được tạo từ luồng AI handoff — cho phép
   * trang quản lý chat biết phòng nào là ticket hỗ trợ. null với phòng chat
   * thường (không qua handoff). Giữ nguyên vĩnh viễn kể cả sau khi hoàn tất —
   * xem `handoffResolvedAt` để biết còn mở hay đã xong, để UI đổi nút "Hoàn tất"
   * thành "Đã hoàn tất" thay vì mất dấu vết đây từng là ticket hỗ trợ. */
  handoffToken: {
    type: String,
    default: null,
    index: true,
  },
  handoffResolvedAt: {
    type: Date,
    default: null,
  },
  /** Danh sách userId đã "ẩn" phòng này khỏi danh sách hội thoại của riêng họ
   * (soft-delete theo từng người). Dữ liệu phòng/tin nhắn vẫn giữ nguyên cho
   * (các) thành viên còn lại — không phải xóa thật. */
  anDoiVoi: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'nguoiDung',
    default: [],
  }],
}, {
  timestamps: true,
  versionKey: false,
});

PhongChatSchema.index({ 'thanhVien.nguoiDung': 1, 'thanhVien.trangThai': 1 });
PhongChatSchema.index({ tinNhanCuoi: 1, updatedAt: -1 });

PhongChatSchema.pre('validate', function (next) {
  if (this.loaiPhong === 'private' && this.thanhVien.length !== 2) {
    return next(new Error('Phòng chat riêng phải có đúng 2 thành viên'));
  }
  next();
});

export default mongoose.model('PhongChat', PhongChatSchema);