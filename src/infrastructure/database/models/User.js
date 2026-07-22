import mongoose from 'mongoose';
import crypto from 'crypto';

const nguoiDungSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^\S+@\S+\.\S+$/,
    },
    tenDangNhap: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    matKhau: { type: String, required: true, minlength: 6 },
    soDienThoai: { type: String, match: /^[0-9]{9,11}$/ },
    vaiTro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VaiTro",
      required: true,
    },
    anhDaiDien: { 
      type: String, 
      default: ""
    },
    trangThai: {
      type: String,
      enum: ["hoat_dong", "khoa"],
      default: "hoat_dong",
    },
    passwordChangedAt: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
nguoiDungSchema.methods = {
  createPasswordChangedToken: function() {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpires = Date.now() + 15*60*1000;
    return resetToken;
  }
}
// Index để tối ưu performance cho Facebook login
nguoiDungSchema.index({ facebookId: 1 });
nguoiDungSchema.index({ email: 1, facebookId: 1 });
nguoiDungSchema.index({ vaiTro: 1, createdAt: -1 });
nguoiDungSchema.index({ trangThai: 1, vaiTro: 1 });
nguoiDungSchema.index({ resetPasswordToken: 1 });

// Pre-save middleware để ensure tenDangNhap is never null or empty
nguoiDungSchema.pre("save", function (next) {
  if (!this.tenDangNhap || this.tenDangNhap.trim() === "") {
    return next(new Error("tenDangNhap cannot be null or empty"));
  }
  this.tenDangNhap = this.tenDangNhap.trim();

  // Special handling cho Facebook login - skip password length validation
  if (this.facebookId && this.matKhau === 'facebook_login_no_password') {
    // Bypass password validation cho Facebook users
    return next();
  }

  // Normal validation cho regular users
  if (this.matKhau && this.matKhau.length < 6 && !this.facebookId) {
    return next(new Error("Password must be at least 6 characters long"));
  }

  next();
});

export default mongoose.models.nguoiDung || mongoose.model("nguoiDung", nguoiDungSchema);
