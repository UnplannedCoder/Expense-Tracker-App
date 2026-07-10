const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null indicates global default categories
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    color: {
      type: String,
      default: '#cbd5e1', // hex color code
    },
    icon: {
      type: String,
      default: 'FaPiggyBank', // React icon identifier
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate categories of the same type for a user (or default)
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
