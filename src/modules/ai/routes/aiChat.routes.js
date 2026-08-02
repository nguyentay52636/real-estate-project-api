import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
import { authorizeRoles } from '#shared/middleware/authorizeRoles.js';
import { aiChatRateLimiter } from '#shared/middleware/rateLimit.js';
import {
  sendAIMessage,
  requestHandoff,
  sendHumanMessage,
  getHandoffStatus,
  acceptHandoff,
  getPendingHandoffs,
  getAllHandoffs,
  dismissHandoff,
  dismissAllHandoffs,
  resolveHandoff,
  cancelHandoff,
  cancelHandoffByGuest,
  reopenHandoff,
  deleteHandoff,
  deleteHandoffsBulk,
  searchApartment,
} from '#modules/ai/controllers/aiChatController.js';

const router = express.Router();

const staffOnly = authorizeRoles('admin', 'nhan_vien', 'quan_tri_vien');

// Level 1 – AI agent (public + rate-limit)
router.post('/message', aiChatRateLimiter, sendAIMessage);
router.post('/search', aiChatRateLimiter, searchApartment);

// Level 2 – Human handoff
router.post('/handoff', aiChatRateLimiter, requestHandoff);
router.get('/handoff/pending', middlewareController.verifyToken, getPendingHandoffs);
router.get('/handoff/all', middlewareController.verifyAdmin, getAllHandoffs);
router.delete('/handoff/dismiss-all', middlewareController.verifyToken, dismissAllHandoffs);
router.post('/handoff/bulk-delete', middlewareController.verifyAdmin, deleteHandoffsBulk);
router.get('/handoff/:handoffToken/status', aiChatRateLimiter, getHandoffStatus);
router.delete('/handoff/:handoffToken/dismiss', middlewareController.verifyToken, dismissHandoff);
router.post('/handoff/:handoffToken/accept', middlewareController.verifyToken, acceptHandoff);
router.post('/handoff/:handoffToken/resolve', middlewareController.verifyToken, resolveHandoff);
router.post('/handoff/:handoffToken/cancel', middlewareController.verifyAdmin, cancelHandoff);
router.post('/handoff/:handoffToken/cancel-by-guest', middlewareController.verifyToken, cancelHandoffByGuest);
router.post('/handoff/:handoffToken/reopen', middlewareController.verifyAdmin, reopenHandoff);
router.delete('/handoff/:handoffToken', middlewareController.verifyAdmin, deleteHandoff);
router.post('/human/send', staffOnly, sendHumanMessage);

export default router;
