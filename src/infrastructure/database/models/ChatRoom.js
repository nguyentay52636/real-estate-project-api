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