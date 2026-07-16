// routes/messageRoutes.js
import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
import upload from '#modules/upload/middleware/upload.js';
import { getMessages,
  createMessageHandler,
  createCallMessage,
  updateMessageHandler,
  deleteMessageHandler,
  recallMessage,
  markMessageAsRead,
  searchMessages,
  pinMessage,
  unpinMessage, } from '#modules/chat/controllers/messageController.js';

const router = express.Router();

router.use(middlewareController.verifyToken);

router.post('/call', createCallMessage);
router.get('/:roomId/search', searchMessages);
router.put('/:roomId/pin/:messageId', pinMessage);
router.put('/:roomId/unpin/:messageId', unpinMessage);
router.get('/:roomId', getMessages);
router.post('/', upload.array('tapTin', 5), createMessageHandler);
router.put('/:id', updateMessageHandler);
router.delete('/:id', deleteMessageHandler);
router.put('/:id/recall', recallMessage);
router.put('/:id/read', markMessageAsRead);

export default router;
