const mongoose = require('mongoose');

/**
 * Group.js
 * Represents a shared expense group (roommates, trip, project, etc.)
 *
 * Members array stores lightweight user snapshots (name + email) so that
 * the group still displays useful info even if a non-registered person is
 * added.  If the member is a registered user, their userId is also stored.
 *
 * Expenses are stored as sub-documents so the full group ledger lives in one
 * document — no separate collection join needed for a typical group list view.
 * For very large groups (100+ expenses) they can be promoted to a separate
 * collection later without changing the API contract.
 */

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name:   { type: String, required: true, trim: true },
    email:  { type: String, required: true, trim: true, lowercase: true },
    // How much this member has already paid toward the group total
    amountPaid:   { type: Number, default: 0, min: 0 },
    // How much this member owes after equal split is calculated
    amountOwed:   { type: Number, default: 0, min: 0 },
    // Whether this member has settled their balance
    isSettled:    { type: Boolean, default: false },
  },
  { _id: true }
);

const groupExpenseSchema = new mongoose.Schema(
  {
    // Who paid for this specific item
    paidBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paidByName:   { type: String, required: true },
    description:  { type: String, required: true, trim: true },
    amount:       { type: Number, required: true, min: 0 },
    category:     { type: String, default: 'Others' },
    date:         { type: Date,   default: Date.now },
    // Which member IDs this expense is split among (defaults to all members)
    splitAmong:   [{ type: mongoose.Schema.Types.ObjectId }],
    // Optional receipt image stored as base64 data-url or a URL string
    receiptImage: { type: String, default: '' },
  },
  { timestamps: true }
);

const groupSchema = new mongoose.Schema(
  {
    // Creator of the group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // emoji or icon identifier for the group
    icon: {
      type: String,
      default: '👥',
    },
    // Group type: trip | roommates | event | other
    type: {
      type: String,
      enum: ['trip', 'roommates', 'event', 'other'],
      default: 'other',
    },
    members:  [memberSchema],
    expenses: [groupExpenseSchema],
    // Quick-access total
    totalExpense: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
