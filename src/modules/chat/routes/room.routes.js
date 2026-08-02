// routes/roomRoutes.js
import express from 'express';
import roomController from '#modules/chat/controllers/roomChatController.js';
import middlewareController from '#shared/middleware/auth.js';
import attachAuthUser from '#shared/middleware/attachAuthUser.js';

const router = express.Router();

router.use(middlewareController.verifyToken, attachAuthUser);

router.get('/search', roomController.searchRooms);
router.get('/user/:userId', roomController.getRoomsOfUser);
router.get('/:roomId', roomController.getRoomById);
router.post('/', roomController.createRoom);
router.post('/find-or-create-private', roomController.findOrCreatePrivateRoom);
router.post('/:roomId/message', roomController.addMessageToRoom);
router.delete('/:roomId/message/:messageId', roomController.removeMessageFromRoom);
router.put('/:roomId', roomController.updateRoom);
router.delete('/:roomId', roomController.deleteRoom);
router.post('/:roomId/add-member', roomController.addMemberToRoom);
router.post('/:roomId/leave', roomController.leaveRoom);
router.patch('/:roomId/hide', roomController.hideRoom);
router.post('/:roomId/clear-history', roomController.clearHistoryForMe);
router.put('/:roomId/transfer-admin', roomController.transferAdmin);
router.get('/', roomController.getAllRom);

export default router;
