import { getActivePropertiesForAi } from '#modules/ai/services/propertyAiCatalog.js';
import { searchByText } from '#modules/ai/services/vectorSearchService.js';

const crmKnowledgeCatalogController = {
  /**
   * GET /api/crm-knowledge-catalog
   * Catalog AI = Property trangThai dang_hoat_dong (single source).
   */
  listAll: async (req, res) => {
    try {
      const items = await getActivePropertiesForAi({ includeEmbedding: false });
      return res.status(200).json({
        message: 'Lấy catalog BĐS (Property) thành công',
        source: 'property',
        total: items.length,
        items,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi lấy catalog', error: error.message });
    }
  },

  /** GET /api/crm-knowledge-catalog/search?q=... */
  search: async (req, res) => {
    try {
      const q = String(req.query.q || req.query.query || '').trim();
      if (!q) {
        return res.status(400).json({ message: 'Tham số q (câu hỏi) là bắt buộc' });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 3, 20);
      const catalog = await getActivePropertiesForAi({ includeEmbedding: false });
      const results = searchByText(q, catalog, { limit });

      return res.status(200).json({
        message: 'Tìm kiếm catalog thành công',
        source: 'property',
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
