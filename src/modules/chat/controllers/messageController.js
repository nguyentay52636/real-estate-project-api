// controllers/messageController.js
import messageService from '#modules/chat/services/messageService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';
import { AppError } from '#shared/errors/AppError.js';

function requireUserId(req) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Bạn chưa đăng nhập', 401);
  return userId;
}

const getMessages = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const result = await messageService.getMessages(req.params.roomId, userId, {
    ...req.query,
    roomId: req.params.roomId,
  });
  return res.json(result);
});

const createMessageHandler = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const message = await messageService.createMessage(req.body, userId);
  return res.status(201).json(message);
});

const createCallMessage = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const message = await messageService.createCallMessage(req.body, userId);
  return res.status(201).json(message);
});

const updateMessageHandler = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const updated = await messageService.updateMessage(req.params.id, userId, req.body);
  return res.json(updated);
});

const deleteMessageHandler = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const deleted = await messageService.deleteMessage(req.params.id, userId);
  return res.json(deleted);
});

const recallMessage = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const updated = await messageService.recallMessage(req.params.id, userId);
  return res.json(updated);
});

const markMessageAsRead = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const updated = await messageService.markAsRead(req.params.id, userId);
  return res.json(updated);
});

const searchMessages = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const messages = await messageService.searchMessages(req.query, userId);
  return res.json(messages);
});

const pinMessage = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  await messageService.pinMessage(req.params.roomId, req.params.messageId, userId);
  return res.status(200).json({ message: 'Ghim tin nhắn thành công' });
});

const unpinMessage = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  await messageService.unpinMessage(req.params.roomId, req.params.messageId, userId);
  return res.status(200).json({ message: 'Gỡ ghim tin nhắn thành công' });
});

// ── Socket helpers (giữ chữ ký cũ cho realtime handlers) ──
const createMessage = (data, io) => messageService.socketCreateMessage(data, io);
const updateMessage = (id, noiDungMoi, userId, io) =>
  messageService.socketUpdateMessage(id, noiDungMoi, userId, io);
const deleteMessage = (id, userId, io) => messageService.socketDeleteMessage(id, userId, io);
const recallMessageSocket = (id, userId, io) => messageService.socketRecallMessage(id, userId, io);

export {
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
  createMessage,
  updateMessage,
  deleteMessage,
  recallMessageSocket,
};
export default {
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
  createMessage,
  updateMessage,
  deleteMessage,
  recallMessageSocket,
};
