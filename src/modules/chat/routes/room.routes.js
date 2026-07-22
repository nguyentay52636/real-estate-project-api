// routes/roomRoutes.js
import express from 'express';
import roomController from '#modules/chat/controllers/roomChatController.js';

import middlewareController from '#shared/middleware/auth.js';

const router = express.Router();

// Tất cả thao tác phòng chat đều cần xác thực token
router.use(middlewareController.verifyToken);

// Search rooms - không cần auth
router.get('/search', roomController.searchRooms);

// Get rooms of user - không cần auth
router.get('/user/:userId', roomController.getRoomsOfUser);

// Get room by ID - không cần auth
router.get('/:roomId', roomController.getRoomById);

// Create new room - không cần auth
router.post('/', roomController.createRoom);

// Find or create private room between 2 users - không cần auth
router.post('/find-or-create-private', roomController.findOrCreatePrivateRoom);

// Add message to room - không cần auth
router.post('/:roomId/message', roomController.addMessageToRoom);

// Remove message from room - không cần auth
router.delete('/:roomId/message/:messageId', roomController.removeMessageFromRoom);

// Update room - không cần auth
router.put('/:roomId', roomController.updateRoom);

// Delete room - không cần auth
router.delete('/:roomId', roomController.deleteRoom);

// Add member to group room - không cần auth
router.post('/:roomId/add-member', roomController.addMemberToRoom);

// Remove member from group room (leave room) - không cần auth
router.post('/:roomId/leave', roomController.leaveRoom);

// Hide room from a single user's own conversation list - không cần auth
router.patch('/:roomId/hide', roomController.hideRoom);

// Transfer admin role - không cần auth
router.put('/:roomId/transfer-admin', roomController.transferAdmin);

// Get all rooms - không cần auth
router.get('/', roomController.getAllRom);

export default router;