import express from 'express';
import middlewareController from '#shared/middleware/auth.js';
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
  searchApartment,
} from '#modules/ai/controllers/aiChatController.js';

const router = express.Router();

// Level 1 – AI agent
router.post('/message', sendAIMessage);
router.post('/search', searchApartment);

// Level 2 – Human handoff
router.post('/handoff', requestHandoff);
router.get('/handoff/pending', middlewareController.verifyToken, getPendingHandoffs);
router.get('/handoff/all', middlewareController.verifyAdmin, getAllHandoffs);
router.delete('/handoff/dismiss-all', middlewareController.verifyToken, dismissAllHandoffs);
router.get('/handoff/:handoffToken/status', getHandoffStatus);
router.delete('/handoff/:handoffToken/dismiss', middlewareController.verifyToken, dismissHandoff);
router.post('/handoff/:handoffToken/accept', middlewareController.verifyToken, acceptHandoff);
router.post('/handoff/:handoffToken/resolve', middlewareController.verifyToken, resolveHandoff);
router.post('/handoff/:handoffToken/cancel', middlewareController.verifyAdmin, cancelHandoff);
router.post('/handoff/:handoffToken/cancel-by-guest', middlewareController.verifyToken, cancelHandoffByGuest);
router.post('/handoff/:handoffToken/reopen', middlewareController.verifyAdmin, reopenHandoff);
router.delete('/handoff/:handoffToken', middlewareController.verifyAdmin, deleteHandoff);
router.post('/human/send', sendHumanMessage);

export default router;
