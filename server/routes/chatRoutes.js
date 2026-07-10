const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendMessage, getChatHistory, clearChatHistory } = require('../controllers/chatController');

// All chat routes require authentication — matching the pattern of all other routes
router.use(protect);

// POST   /api/v1/chat/message  — send a message, get AI reply
router.post('/message', sendMessage);

// GET    /api/v1/chat/history  — load previous conversation
router.get('/history', getChatHistory);

// DELETE /api/v1/chat/history  — clear all chat messages for the user
router.delete('/history', clearChatHistory);

module.exports = router;
