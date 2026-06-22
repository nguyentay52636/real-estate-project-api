const express = require('express');
const router = express.Router();
const middlewareController = require('../controllers/middlewareController');
const {
  sendAIMessage,
  requestHandoff,
  sendHumanMessage,
  getHandoffStatus,
  acceptHandoff,
  getPendingHandoffs,
  dismissHandoff,
  dismissAllHandoffs,
  searchApartment,
} = require('../controllers/aiChatController');

// Level 1 – AI agent
router.post('/message', sendAIMessage);
router.post('/search', searchApartment);

// Level 2 – Human handoff
router.post('/handoff', requestHandoff);
router.get('/handoff/pending', middlewareController.verifyToken, getPendingHandoffs);
router.delete('/handoff/dismiss-all', middlewareController.verifyToken, dismissAllHandoffs);
router.get('/handoff/:handoffToken/status', getHandoffStatus);
router.delete('/handoff/:handoffToken/dismiss', middlewareController.verifyToken, dismissHandoff);
router.post('/handoff/:handoffToken/accept', middlewareController.verifyToken, acceptHandoff);
router.post('/human/send', sendHumanMessage);

module.exports = router;
