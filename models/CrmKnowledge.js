import mongoose from 'mongoose';

const crmKnowledgeSchema = new mongoose.Schema(
  {
    tieuDe: { type: String, required: true, trim: true },
    moTa: { type: String, required: true },
    gia: { type: Number, required: true },
    diaChi: { type: String, required: true },
    quanHuyen: { type: String, required: true },
    phongNgu: { type: Number, default: 1 },
    dienTich: { type: Number },
    loaiBds: {
      type: String,
      enum: ['can_ho', 'nha_nguyen_can', 'studio', 'penthouse'],
      default: 'can_ho',
    },
    anhUrls: { type: [String], default: [] },
    anhDaiDien: { type: String, default: '' },
    url: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
    trangThai: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    nguoiTao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nguoiDung',
    },
  },
  { timestamps: true }
);

crmKnowledgeSchema.index({ trangThai: 1 });

export default mongoose.model('CrmKnowledge', crmKnowledgeSchema);
