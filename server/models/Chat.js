const mongoose = require('mongoose');

/**
 * Chat model - stores every conversation message for a user.
 * Each document represents a single message (role: user | model).
 * Used to load chat history when the user reopens FinBot.
 */
const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 'user' = sent by the human, 'model' = sent by FinBot (Gemini)
    role: {
      type: String,
      enum: ['user', 'model'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt used as the message timestamp in UI
  }
);

module.exports = mongoose.model('Chat', chatSchema);
