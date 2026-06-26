import mongoose from 'mongoose';

const VaiTroSchema = new mongoose.Schema(
  {
    ten: {
      type: String,
      required: true,
      unique: true,
      enum: ["admin", "nhan_vien", "nguoi_thue", "chu_tro"]
    },
    moTa: {
      type: String,
      default: ""
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default mongoose.models.VaiTro || mongoose.model("VaiTro", VaiTroSchema);
