const Chat = require('../models/Chat');
const { sendMessageToGemini } = require('../services/geminiService');
const { buildFinancialContext } = require('../services/financialContextService');
const { buildMarketContext, detectMarketIntent } = require('../services/marketDataService');

/**
 * chatController.js
 * Handles all FinBot chat endpoints.
 * Never contains Gemini or DB logic directly — delegates to services.
 */

// @desc    Send a message to FinBot and get an AI response
// @route   POST /api/v1/chat/message
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    // --- Validate input ---
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long. Please keep it under 2000 characters.',
      });
    }

    // --- Check API key early to give a clear error ---
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'FinBot is not configured. Please add OPENROUTER_API_KEY to server/.env and restart the server.',
      });
    }

    // --- Fetch conversation history for context (last 20 messages) ---
    const history = await Chat.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Reverse so oldest is first (chronological order for Gemini)
    const conversationHistory = history.reverse();

    // --- Detect market intent early so we can log and gate the fetch ---
    const { isMarketQuery, detectedTerms } = detectMarketIntent(trimmedMessage);
    if (isMarketQuery) {
      console.log(`[FinBot] Market query detected. Terms: ${detectedTerms.slice(0, 5).join(', ')}`);
    }

    // --- Fetch financial context + market context in parallel ---
    const [financialContext, marketContext] = await Promise.all([
      buildFinancialContext(userId),
      isMarketQuery ? buildMarketContext(trimmedMessage) : Promise.resolve(null),
    ]);

    // --- Combine contexts: financial first, then live market data ---
    const combinedContext = [financialContext, marketContext]
      .filter(Boolean)
      .join('\n\n');

    // --- Save user message to DB ---
    await Chat.create({
      userId,
      role: 'user',
      message: trimmedMessage,
    });

    // --- Send to Gemini with combined context ---
    const aiResponse = await sendMessageToGemini(trimmedMessage, combinedContext, conversationHistory);

    // --- Save AI response to DB ---
    const savedResponse = await Chat.create({
      userId,
      role: 'model',
      message: aiResponse,
    });

    res.status(200).json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: savedResponse.createdAt,
      },
    });
  } catch (error) {
    console.error('chatController.sendMessage error:', error.message);

    // All errors thrown by geminiService are already user-friendly — surface them directly
    // Only pass truly unexpected errors to the global error handler
    if (error.message) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// @desc    Get chat history for the logged-in user
// @route   GET /api/v1/chat/history
// @access  Private
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Limit to last 100 messages to keep the payload manageable
    const messages = await Chat.find({ userId })
      .sort({ createdAt: 1 }) // oldest first for display order
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('chatController.getChatHistory error:', error.message);
    next(error);
  }
};

// @desc    Clear all chat history for the logged-in user
// @route   DELETE /api/v1/chat/history
// @access  Private
const clearChatHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Chat.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully.',
    });
  } catch (error) {
    console.error('chatController.clearChatHistory error:', error.message);
    next(error);
  }
};

module.exports = { sendMessage, getChatHistory, clearChatHistory };
