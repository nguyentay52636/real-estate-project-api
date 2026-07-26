import mongoose from 'mongoose';


const GiaoDichSchema = new mongoose.Schema(
  {
    tieuDe: { type: String, default: '', trim: true },
    batDongSanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatDongSan',
      required: true,
      index: true,
    },
    /** Khách (người thuê / mua) */
    khachHangId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
      index: true,
    },
    /** Chủ tin — snapshot từ property.nguoiDungId */
    chuNhaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
      index: true,
    },
    /** Sale phụ trách */
    nhanVienId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      default: null,
      index: true,
    },
    nhomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nhom',
      default: null,
      index: true,
    },
    lichXemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LichXemNha',
      default: null,
    },
    /** form | handoff | viewing | thu_cong */
    nguonLead: {
      type: String,
      enum: ['form', 'handoff', 'viewing', 'thu_cong'],
      default: 'thu_cong',
      index: true,
    },
    loaiGiaoDich: {
      type: String,
      enum: ['ban', 'cho_thue'],
      required: true,
    },
    trangThai: {
      type: String,
      enum: ['moi', 'lien_he', 'hen_xem', 'da_xem', 'chot', 'rot'],
      default: 'moi',
      index: true,
    },
    giaNiemYet: { type: Number, default: 0 },
    giaChot: { type: Number, default: null },
    ngayChot: { type: Date, default: null },
    lyDoRot: { type: String, default: '' },
    /** Hoa hồng % (0–100) — nhập tay */
    hoaHongPhanTram: { type: Number, default: null, min: 0, max: 100 },
    /** Hoa hồng số tiền — nhập tay hoặc tính từ % */
    hoaHongSoTien: { type: Number, default: null },
    ghiChu: { type: String, default: '' },
    nguoiTaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

GiaoDichSchema.index({ nhanVienId: 1, trangThai: 1, updatedAt: -1 });
GiaoDichSchema.index({ nhomId: 1, trangThai: 1 });
GiaoDichSchema.index({ batDongSanId: 1, trangThai: 1 });
GiaoDichSchema.index({ createdAt: -1 });

export default mongoose.models.GiaoDich || mongoose.model('GiaoDich', GiaoDichSchema);
