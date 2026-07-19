import express from 'express';
import crmKnowledgeController from '#modules/ai/controllers/crmKnowledgeController.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';
import uploadMemory from '#modules/upload/middleware/uploadMemory.js';

const router = express.Router();

const handleUploadError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Lỗi upload file' });
  }
  next();
};

router.use(authorizeRoles('admin', 'nhan_vien', 'quan_tri_vien'));

router.post('/', crmKnowledgeController.create);
router.get('/', crmKnowledgeController.list);
router.get('/:id', crmKnowledgeController.getById);
router.put('/:id', crmKnowledgeController.update);
router.delete('/:id', crmKnowledgeController.remove);
router.post(
  '/:id/images',
  uploadMemory.array('files', 10),
  handleUploadError,
  crmKnowledgeController.uploadImages
);

export default router;
