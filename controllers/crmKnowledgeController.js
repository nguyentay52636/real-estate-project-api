import crmKnowledgeService from '../services/crmKnowledgeService.js';

const crmKnowledgeController = {
  create: async (req, res) => {
    try {
      const { tieuDe, moTa, gia, diaChi, quanHuyen, phongNgu, dienTich, loaiBds, anhUrls, anhDaiDien, trangThai } = req.body;

      if (!tieuDe || !moTa || gia == null || !diaChi || !quanHuyen) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (tieuDe, moTa, gia, diaChi, quanHuyen)' });
      }

      const item = await crmKnowledgeService.createKnowledge(
        { tieuDe, moTa, gia, diaChi, quanHuyen, phongNgu, dienTich, loaiBds, anhUrls, anhDaiDien, trangThai },
        req.user.id
      );

      return res.status(201).json({ message: 'Tạo bài CRM thành công', data: item });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi tạo bài CRM', error: error.message });
    }
  },

  list: async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const { trangThai } = req.query;

      const result = await crmKnowledgeService.listKnowledge({ page, limit, trangThai });
      return res.status(200).json({ message: 'Lấy danh sách thành công', ...result });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi lấy danh sách', error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const item = await crmKnowledgeService.getKnowledgeById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Không tìm thấy bài CRM' });
      }
      return res.status(200).json({ message: 'OK', data: item });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi lấy chi tiết', error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const item = await crmKnowledgeService.updateKnowledge(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: 'Không tìm thấy bài CRM' });
      }
      return res.status(200).json({ message: 'Cập nhật thành công', data: item });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const item = await crmKnowledgeService.deleteKnowledge(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Không tìm thấy bài CRM' });
      }
      return res.status(200).json({ message: 'Xóa thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi xóa', error: error.message });
    }
  },

  uploadImages: async (req, res) => {
    try {
      if (!req.files?.length) {
        return res.status(400).json({ message: 'Vui lòng tải lên ít nhất một ảnh' });
      }

      const item = await crmKnowledgeService.addImages(req.params.id, req.files);
      if (!item) {
        return res.status(404).json({ message: 'Không tìm thấy bài CRM' });
      }

      return res.status(200).json({ message: 'Upload ảnh thành công', data: item });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi upload ảnh', error: error.message });
    }
  },
};

export default crmKnowledgeController;
