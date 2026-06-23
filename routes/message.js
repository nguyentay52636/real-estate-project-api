// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const middlewareController = require('../controllers/middlewareController');
const {
  getMessages,
  createMessageHandler,
  createCallMessage,
  updateMessageHandler,
  deleteMessageHandler,
  recallMessage,
  markMessageAsRead,
  searchMessages,
  pinMessage,
  unpinMessage,
} = require('../controllers/messageController');
const upload = require('../middleware/upload');

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

module.exports = router;
