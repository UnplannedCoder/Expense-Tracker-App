const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Helper to compute spent amount for a budget category in a month/year
const calculateSpent = async (userId, category, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const aggregation = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        category,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);

  return aggregation.length > 0 ? aggregation[0].totalSpent : 0;
};

// @desc    Get all budgets for user with optional month/year filter
// @route   GET /api/v1/budgets
// @access  Private
const getBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year,
    });

    res.json({
      success: true,
      count: budgets.length,
      data: budgets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new budget
// @route   POST /api/v1/budgets
// @access  Private
const createBudget = async (req, res, next) => {
  try {
    const { category, limit, month, year } = req.body;

    if (!category || limit === undefined || !month || !year) {
      res.status(400);
      throw new Error('Please enter category, limit, month, and year');
    }

    // Check if budget already exists for this category/month/year
    const budgetExists = await Budget.findOne({
      userId: req.user._id,
      category,
      month,
      year,
    });

    if (budgetExists) {
      res.status(400);
      throw new Error('Budget already set for this category and month');
    }

    // Calculate current spent for this category/month/year
    const spent = await calculateSpent(req.user._id, category, month, year);

    const budget = await Budget.create({
      userId: req.user._id,
      category,
      limit: Number(limit),
      spent,
      month: Number(month),
      year: Number(year),
    });

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a budget
// @route   PUT /api/v1/budgets/:id
// @access  Private
const updateBudget = async (req, res, next) => {
  try {
    const { limit } = req.body;

    if (limit === undefined) {
      res.status(400);
      throw new Error('Please provide a new limit');
    }

    let budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      res.status(404);
      throw new Error('Budget not found');
    }

    budget.limit = Number(limit);
    const updatedBudget = await budget.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: updatedBudget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a budget
// @route   DELETE /api/v1/budgets/:id
// @access  Private
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      res.status(404);
      throw new Error('Budget not found');
    }

    await budget.deleteOne();

    res.json({
      success: true,
      message: 'Budget removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
