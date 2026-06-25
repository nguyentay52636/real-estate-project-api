const mongoose = require("mongoose");
const slugify = require("slugify");

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

    colorGradient: String, // Gradient màu cho card

    // Thông tin bổ sung cho tab "Thông tin chi tiết"
    thongTinChiTiet: {
      tang: String,
      huong: String,
      banCong: String,
      noiThat: String,
      // ...bổ sung thêm nếu UI có
    },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────────
// Helper: tạo slug duy nhất từ tieuDe
// ──────────────────────────────────────────────
async function generateUniqueSlug(tieuDe, excludeId = null) {
  // Chuyển tiếng Việt → ASCII rồi slugify
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

// ──────────────────────────────────────────────
// Auto-regenerate slug khi dùng findByIdAndUpdate
// ──────────────────────────────────────────────
BDSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update && update.tieuDe) {
    const docId = this.getQuery()._id;
    update.slug = await generateUniqueSlug(update.tieuDe, docId);
  }
  next();
});

module.exports = mongoose.model("BatDongSan", BDSchema);
