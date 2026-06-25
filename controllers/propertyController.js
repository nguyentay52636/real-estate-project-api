const Property = require("../models/BatDongSan");
const NguoiDung = require("../models/Nguoidung");

const propertyController = {
  // ─────────────────────────────────────────────────────────────
  // GET /api/property
  // Lấy tất cả bất động sản, hỗ trợ: filter, search, pagination
  // Query params:
  //   page        - số trang (mặc định 1)
  //   limit       - số item / trang (mặc định 10)
  //   loaiBds     - lọc theo loại (can_ho | nha_nguyen_can | studio | penthouse)
  //   trangThai   - lọc theo trạng thái (dang_hoat_dong | da_cho_thue)
  //   tinhThanh   - lọc theo tỉnh/thành (regex không phân biệt hoa thường)
  //   quanHuyen   - lọc theo quận/huyện (regex)
  //   giaMin      - giá tối thiểu
  //   giaMax      - giá tối đa
  //   search      - tìm kiếm theo tiêu đề hoặc địa chỉ
  //   sortBy      - trường sắp xếp (mặc định: createdAt)
  //   sortOrder   - asc | desc (mặc định: desc)
  // ─────────────────────────────────────────────────────────────
  getAllProperty: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        loaiBds,
        trangThai,
        tinhThanh,
        quanHuyen,
        giaMin,
        giaMax,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filter = {};

      if (loaiBds) filter.loaiBds = loaiBds;
      if (trangThai) filter.trangThai = trangThai;
      if (tinhThanh) filter.tinhThanh = { $regex: new RegExp(tinhThanh, "i") };
      if (quanHuyen) filter.quanHuyen = { $regex: new RegExp(quanHuyen, "i") };

      if (giaMin || giaMax) {
        filter.gia = {};
        if (giaMin) filter.gia.$gte = Number(giaMin);
        if (giaMax) filter.gia.$lte = Number(giaMax);
      }

      if (search) {
        filter.$or = [
          { tieuDe: { $regex: new RegExp(search, "i") } },
          { diaChi: { $regex: new RegExp(search, "i") } },
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [propertiesList, total] = await Promise.all([
        Property.find(filter)
          .populate("nguoiDungId", "ten email soDienThoai anhDaiDien")
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum),
        Property.countDocuments(filter),
      ]);

      return res.status(200).json({
        message: "Lấy danh sách bất động sản thành công",
        data: propertiesList,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /api/property/:id
  // Lấy chi tiết bất động sản theo MongoDB ObjectId
  // ─────────────────────────────────────────────────────────────
  getPropertyById: async (req, res) => {
    try {
      const { id } = req.params;
      const property = await Property.findById(id).populate(
        "nguoiDungId",
        "ten email soDienThoai anhDaiDien"
      );

      if (!property)
        return res
          .status(404)
          .json({ message: "Không tìm thấy bất động sản" });

      return res.status(200).json({
        message: "Lấy chi tiết bất động sản thành công",
        data: property,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /api/property/slug/:slug
  // Lấy chi tiết bất động sản theo slug (SEO-friendly URL)
  // ─────────────────────────────────────────────────────────────
  getPropertyBySlug: async (req, res) => {
    try {
      const { slug } = req.params;
      const property = await Property.findOne({ slug }).populate(
        "nguoiDungId",
        "ten email soDienThoai anhDaiDien"
      );

      if (!property)
        return res
          .status(404)
          .json({ message: "Không tìm thấy bất động sản" });

      return res.status(200).json({
        message: "Lấy chi tiết bất động sản theo slug thành công",
        data: property,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /api/property/district/:district
  // Lấy bất động sản theo quận/huyện
  // ─────────────────────────────────────────────────────────────
  getPropertiesByDistrict: async (req, res) => {
    try {
      const { district } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter = { quanHuyen: { $regex: new RegExp(district, "i") } };

      const [propertiesList, total] = await Promise.all([
        Property.find(filter)
          .populate("nguoiDungId", "ten email soDienThoai anhDaiDien")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Property.countDocuments(filter),
      ]);

      if (total === 0)
        return res.status(404).json({
          message: "Không tìm thấy bất động sản tại quận/huyện này",
        });

      return res.status(200).json({
        message: "Lấy bất động sản theo quận/huyện thành công",
        data: propertiesList,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /api/property/user/:userId
  // Lấy tất cả bất động sản theo chủ sở hữu (nguoiDungId)
  // ─────────────────────────────────────────────────────────────
  getPropertiesByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter = { nguoiDungId: userId };

      const [propertiesList, total] = await Promise.all([
        Property.find(filter)
          .populate("nguoiDungId", "ten email soDienThoai anhDaiDien")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Property.countDocuments(filter),
      ]);

      return res.status(200).json({
        message: "Lấy bất động sản theo người dùng thành công",
        data: propertiesList,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // POST /api/property
  // Tạo mới bất động sản (slug sẽ được tự động tạo từ tieuDe)
  // ─────────────────────────────────────────────────────────────
  createProperty: async (req, res) => {
    try {
      const userData = await NguoiDung.findById(req.body.nguoiDungId);
      if (!userData)
        return res.status(404).json({ message: "Không tìm thấy người dùng" });

      const newProperty = new Property(req.body);
      const savedProperty = await newProperty.save();

      return res.status(201).json({
        message: "Tạo bất động sản thành công",
        data: savedProperty,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // PUT /api/property/:id
  // Cập nhật bất động sản theo id
  // Nếu tieuDe thay đổi, slug sẽ được tự động cập nhật
  // ─────────────────────────────────────────────────────────────
  updateProperty: async (req, res) => {
    try {
      const { id } = req.params;

      const updatedProperty = await Property.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }).populate("nguoiDungId", "ten email soDienThoai anhDaiDien");

      if (!updatedProperty)
        return res
          .status(404)
          .json({ message: "Không tìm thấy bất động sản" });

      return res.status(200).json({
        message: "Cập nhật bất động sản thành công",
        data: updatedProperty,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/property/:id/status
  // Cập nhật trạng thái bất động sản (dang_hoat_dong | da_cho_thue)
  // Body: { trangThai: "da_cho_thue" }
  // ─────────────────────────────────────────────────────────────
  updatePropertyStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { trangThai } = req.body;

      const validStatuses = ["dang_hoat_dong", "da_cho_thue"];
      if (!validStatuses.includes(trangThai)) {
        return res.status(400).json({
          message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(", ")}`,
        });
      }

      const updatedProperty = await Property.findByIdAndUpdate(
        id,
        { trangThai },
        { new: true }
      );

      if (!updatedProperty)
        return res
          .status(404)
          .json({ message: "Không tìm thấy bất động sản" });

      return res.status(200).json({
        message: "Cập nhật trạng thái thành công",
        data: updatedProperty,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/property/:id
  // Xóa bất động sản theo id
  // ─────────────────────────────────────────────────────────────
  deleteProperty: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedProperty = await Property.findByIdAndDelete(id);

      if (!deletedProperty)
        return res
          .status(404)
          .json({ message: "Không tìm thấy bất động sản" });

      return res.status(200).json({
        message: "Xóa bất động sản thành công",
        data: { id: deletedProperty._id, slug: deletedProperty.slug },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
};

module.exports = propertyController;
