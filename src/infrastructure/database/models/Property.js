import mongoose from 'mongoose';
import slugify from 'slugify';

const BDSchema = new mongoose.Schema(
  {
    tieuDe: { type: String, required: true }, // Tiêu đề
    slug: { type: String, unique: true, index: true }, // Slug URL-friendly

    moTa: { type: String, required: true }, // Mô tả chi tiết
    loaiBds: {
      type: String,
      enum: ["can_ho", "nha_nguyen_can", "studio", "penthouse"],
      required: true,
    },
    gia: { type: Number, required: true }, // Giá
    dienTich: { type: Number, required: true }, // Diện tích (m2)
    diaChi: { type: String, required: true }, // Địa chỉ cụ thể
    tinhThanh: { type: String, required: true }, // Tỉnh/Thành phố
    quanHuyen: { type: String, required: true }, // Quận/Huyện

    anhDaiDien: { type: String, required: true }, // Ảnh đại diện (thumbnail)
    gallery: [String], // Mảng link ảnh gallery

    phongNgu: { type: Number, required: true }, // Số phòng ngủ
    phongTam: { type: Number, required: true }, // Số phòng tắm
    choDauXe: { type: Number, required: true }, // Số chỗ đậu xe

    trangThai: {
      type: String,
      enum: ["dang_hoat_dong", "da_cho_thue"],
      default: "dang_hoat_dong",
    },

    nguoiDungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nguoiDung",
      required: true,
    },

    badge: String, // Nhãn nổi bật
    subtitle: String, // Phụ đề

    features: [
      {
        icon: String,
        text: String,
        color: String,
      },
    ], // Các điểm nổi bật

    overlay: {
      category: String,
      location: String,
      priceDisplay: String,
      rating: Number, // Điểm đánh giá trung bình
      reviews: Number, // Số lượng đánh giá
      amenities: [String], // Các tiện ích
    },

    colorGradient: String,

    thongTinChiTiet: {
      tang: { type: String, default: '' }, // Tầng
      huong: { type: String, default: '' }, // Hướng (Đông Nam, Nam, …)
      banCong: { type: Boolean, default: false }, // Có ban công hay không
      noiThat: { type: String, default: '' }, // Nội thất
    },
  },
  { timestamps: true }
);

async function generateUniqueSlug(tieuDe, excludeId = null) {
  const baseSlug = slugify(tieuDe, {
    lower: true,
    strict: true,
    locale: "vi",
  });

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await mongoose.model("BatDongSan").findOne(query);
    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// ──────────────────────────────────────────────
// Auto-generate slug trước khi save (tạo mới)
// ──────────────────────────────────────────────
BDSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("tieuDe")) {
    this.slug = await generateUniqueSlug(this.tieuDe, this._id);
  }
  next();
});

BDSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update && update.tieuDe) {
    const docId = this.getQuery()._id;
    update.slug = await generateUniqueSlug(update.tieuDe, docId);
  }
  next();
});

export default mongoose.model("BatDongSan", BDSchema);
