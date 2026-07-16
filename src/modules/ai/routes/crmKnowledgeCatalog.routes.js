import express from 'express';
import catalogController from '#modules/ai/controllers/crmKnowledgeCatalogController.js';

const router = express.Router();

/** Catalog đọc công khai — AI và client lấy toàn bộ danh sách BĐS tư vấn */
router.get('/search', catalogController.search);
router.get('/', catalogController.listAll);

export default router;
