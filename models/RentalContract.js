const HopDongThueSchema = new mongoose.Schema({
    nguoiThueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NguoiDung",
      required: true,
    },
    chuTroId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NguoiDung",
      required: true,
    },
    batDongSanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatDongSan",
      required: true,
    },
    phieuDatCocId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PhieuDatCoc",
      required: true,
    },
    soHopDong: {
      type: String,
      required: true,
      unique: true,
    },
    ngayBatDau: {
      type: Date,
      required: true,
    },
    ngayKetThuc: {
      type: Date,
      required: true,
    },
    giaThue: {
      type: Number,
      required: true,
    },
    tienCoc: {
      type: Number,
      required: true,
    },
    trangThai: {
      type: String,
      default: "cho_xac_nhan",
    },
    dieuKhoan: {
      type: String,
    },
    kyHanThanhToan: {
      type: String,
      default: "thang",
    },
    ngayKyHopDong: {
      type: Date,
      required: true,
    },
  }, { timestamps: true });
  
  export default mongoose.model("HopDongThue", HopDongThueSchema);
  