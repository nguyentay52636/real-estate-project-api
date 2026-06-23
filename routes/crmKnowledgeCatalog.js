const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/crmKnowledgeCatalogController');

/** Catalog đọc công khai — AI và client lấy toàn bộ danh sách BĐS tư vấn */
router.get('/search', catalogController.search);
router.get('/', catalogController.listAll);

module.exports = router;
