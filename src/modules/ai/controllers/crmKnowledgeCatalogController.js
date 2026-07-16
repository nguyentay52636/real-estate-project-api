import crmKnowledgeService from '#modules/ai/services/crmKnowledgeService.js';
import { searchByText } from '#modules/ai/services/vectorSearchService.js';

const crmKnowledgeCatalogController = {
  /** GET /api/crm-knowledge-catalog — toàn bộ BĐS active cho AI / catalog */
  listAll: async (req, res) => {
    try {
      const items = await crmKnowledgeService.getAllActive();
      return res.status(200).json({
        message: 'Lấy catalog CRM thành công',
        total: items.length,
        items,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi lấy catalog CRM', error: error.message });
    }
  },

  /** GET /api/crm-knowledge-catalog/search?q=... — tìm BĐS khớp câu hỏi khách */
  search: async (req, res) => {
    try {
      const q = String(req.query.q || req.query.query || '').trim();
      if (!q) {
        return res.status(400).json({ message: 'Tham số q (câu hỏi) là bắt buộc' });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 3, 20);
      const catalog = await crmKnowledgeService.getAllActive();
      const results = searchByText(q, catalog, { limit });

      return res.status(200).json({
        message: 'Tìm kiếm catalog thành công',
        mode: 'text',
        total: results.length,
        items: results,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi tìm kiếm catalog', error: error.message });
    }
  },
};

export default crmKnowledgeCatalogController;
