const express = require('express');
const router = express.Router();
const crmKnowledgeController = require('../controllers/crmKnowledgeController');
const middlewareController = require('../controllers/middlewareController');
const uploadMemory = require('../middleware/uploadMemory');

const handleUploadError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Lỗi upload file' });
  }
  next();
};

router.post('/', middlewareController.verifyAdmin, crmKnowledgeController.create);
router.get('/', middlewareController.verifyAdmin, crmKnowledgeController.list);
router.get('/:id', middlewareController.verifyAdmin, crmKnowledgeController.getById);
router.put('/:id', middlewareController.verifyAdmin, crmKnowledgeController.update);
router.delete('/:id', middlewareController.verifyAdmin, crmKnowledgeController.remove);
router.post(
  '/:id/images',
  middlewareController.verifyAdmin,
  uploadMemory.array('files', 10),
  handleUploadError,
  crmKnowledgeController.uploadImages
);

module.exports = router;
