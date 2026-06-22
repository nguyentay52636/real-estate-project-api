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
  searchApartment,
} = require('../controllers/aiChatController');

// Level 1 – AI agent
router.post('/message', sendAIMessage);
router.post('/search', searchApartment);

// Level 2 – Human handoff
router.post('/handoff', requestHandoff);
router.get('/handoff/pending', middlewareController.verifyToken, getPendingHandoffs);
router.get('/handoff/:handoffToken/status', getHandoffStatus);
router.post('/handoff/:handoffToken/accept', middlewareController.verifyToken, acceptHandoff);
router.post('/human/send', sendHumanMessage);

module.exports = router;
