const mongoose = require('mongoose');
const Group = require('../models/Group');

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Recalculates amountOwed for every member of a group based on all expenses.
 * Uses a simple equal-split algorithm:
 *   For each expense, split the amount equally among the named members.
 *   Track net balance per member: balance = totalPaid - totalOwed.
 */
const recalculateBalances = (group) => {
  // Reset all balances
  const paid  = {}; // memberId -> total paid
  const share = {}; // memberId -> total share owed

  group.members.forEach((m) => {
    paid[m._id.toString()]  = 0;
    share[m._id.toString()] = 0;
  });

  group.expenses.forEach((expense) => {
    const paidById = expense.paidBy.toString();
    if (paid[paidById] !== undefined) {
      paid[paidById] += expense.amount;
    }

    // Determine who splits this expense
    const splitIds =
      expense.splitAmong && expense.splitAmong.length > 0
        ? expense.splitAmong.map((id) => id.toString())
        : group.members.map((m) => m._id.toString());

    const perPerson = expense.amount / splitIds.length;
    splitIds.forEach((id) => {
      if (share[id] !== undefined) {
        share[id] += perPerson;
      }
    });
  });

  // Update each member's amountPaid and amountOwed
  group.members.forEach((m) => {
    const id = m._id.toString();
    m.amountPaid = Math.round((paid[id] || 0) * 100) / 100;
    const net    = (paid[id] || 0) - (share[id] || 0);
    // amountOwed = how much they still need to pay (negative net means they owe)
    m.amountOwed = Math.round(Math.max(0 - net, 0) * 100) / 100;
  });

  group.totalExpense = Math.round(
    group.expenses.reduce((sum, e) => sum + e.amount, 0) * 100
  ) / 100;
};

// ─── controllers ─────────────────────────────────────────────────────────────

// @desc  Get all groups the logged-in user belongs to (as creator or member)
// @route GET /api/v1/groups
const getGroups = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [
        { createdBy: userId },
        { 'members.userId': userId },
      ],
      isArchived: false,
    })
      .select('-expenses') // keep the list view lean — expenses loaded on detail
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: groups.length, data: groups });
  } catch (error) {
    next(error);
  }
};

// @desc  Get a single group with all expenses
// @route GET /api/v1/groups/:id
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
      ],
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you do not have access');
    }

    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc  Create a new group
// @route POST /api/v1/groups
const createGroup = async (req, res, next) => {
  try {
    const { name, description, icon, type, members, currency } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Group name is required');
    }

    // Always add the creator as a member
    const creatorMember = {
      userId: req.user._id,
      name:   req.user.name,
      email:  req.user.email,
    };

    // De-duplicate members (avoid adding creator twice)
    const extraMembers = (members || []).filter(
      (m) => m.email?.toLowerCase() !== req.user.email?.toLowerCase()
    );

    const group = await Group.create({
      createdBy:   req.user._id,
      name,
      description: description || '',
      icon:        icon || '👥',
      type:        type || 'other',
      currency:    currency || req.user.currency || 'INR',
      members:     [creatorMember, ...extraMembers],
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Update group info (name, description, icon, type)
// @route PUT /api/v1/groups/:id
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you are not the owner');
    }

    const { name, description, icon, type, currency } = req.body;
    if (name)        group.name        = name;
    if (description !== undefined) group.description = description;
    if (icon)        group.icon        = icon;
    if (type)        group.type        = type;
    if (currency)    group.currency    = currency;

    const updated = await group.save();
    res.json({ success: true, message: 'Group updated', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete (archive) a group
// @route DELETE /api/v1/groups/:id
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you are not the owner');
    }

    group.isArchived = true;
    await group.save();

    res.json({ success: true, message: 'Group archived successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Add a member to a group
// @route POST /api/v1/groups/:id/members
const addMember = async (req, res, next) => {
  try {
    const { name, email, userId } = req.body;

    if (!name || !email) {
      res.status(400);
      throw new Error('Member name and email are required');
    }

    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you are not the owner');
    }

    const alreadyMember = group.members.some(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );

    if (alreadyMember) {
      res.status(400);
      throw new Error('This person is already a member of the group');
    }

    group.members.push({
      userId: userId || null,
      name,
      email: email.toLowerCase(),
    });

    await group.save();
    res.json({ success: true, message: 'Member added', data: group.members });
  } catch (error) {
    next(error);
  }
};

// @desc  Remove a member from a group
// @route DELETE /api/v1/groups/:id/members/:memberId
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you are not the owner');
    }

    group.members = group.members.filter(
      (m) => m._id.toString() !== req.params.memberId
    );

    recalculateBalances(group);
    await group.save();

    res.json({ success: true, message: 'Member removed', data: group.members });
  } catch (error) {
    next(error);
  }
};

// @desc  Add an expense to a group
// @route POST /api/v1/groups/:id/expenses
const addExpense = async (req, res, next) => {
  try {
    const { description, amount, category, date, splitAmong, receiptImage } = req.body;

    if (!description || amount === undefined) {
      res.status(400);
      throw new Error('Description and amount are required');
    }

    const group = await Group.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
      ],
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    group.expenses.push({
      paidBy:      req.user._id,
      paidByName:  req.user.name,
      description,
      amount:      Number(amount),
      category:    category || 'Others',
      date:        date ? new Date(date) : new Date(),
      splitAmong:  splitAmong || [],
      receiptImage: receiptImage || '',
    });

    recalculateBalances(group);
    await group.save();

    res.status(201).json({
      success: true,
      message: 'Expense added',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete an expense from a group
// @route DELETE /api/v1/groups/:id/expenses/:expenseId
const deleteExpense = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
      ],
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    const expense = group.expenses.id(req.params.expenseId);
    if (!expense) {
      res.status(404);
      throw new Error('Expense not found');
    }

    // Only the person who added the expense or the group creator can delete it
    if (
      expense.paidBy.toString() !== req.user._id.toString() &&
      group.createdBy.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this expense');
    }

    expense.deleteOne();
    recalculateBalances(group);
    await group.save();

    res.json({ success: true, message: 'Expense deleted', data: group });
  } catch (error) {
    next(error);
  }
};

// @desc  Mark a member as settled (paid back)
// @route PUT /api/v1/groups/:id/members/:memberId/settle
const settleMember = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!group) {
      res.status(404);
      throw new Error('Group not found or you are not the owner');
    }

    const member = group.members.id(req.params.memberId);
    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    member.isSettled = !member.isSettled; // toggle
    await group.save();

    res.json({ success: true, message: 'Settlement status updated', data: group.members });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  addExpense,
  deleteExpense,
  settleMember,
};
