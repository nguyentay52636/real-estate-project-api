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

router.post('/', middlewareController.verifyToken, crmKnowledgeController.create);
router.get('/', middlewareController.verifyToken, crmKnowledgeController.list);
router.get('/:id', middlewareController.verifyToken, crmKnowledgeController.getById);
router.put('/:id', middlewareController.verifyToken, crmKnowledgeController.update);
router.delete('/:id', middlewareController.verifyToken, crmKnowledgeController.remove);
router.post(
  '/:id/images',
  middlewareController.verifyToken,
  uploadMemory.array('files', 10),
  handleUploadError,
  crmKnowledgeController.uploadImages
);

module.exports = router;
