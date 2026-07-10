const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// Helper to recalculate budget spent
const recalculateBudgetSpent = async (userId, category, date) => {
  const transactionDate = new Date(date);
  const month = transactionDate.getMonth() + 1; // 1-12
  const year = transactionDate.getFullYear();

  // Calculate total spent for this user, category, month, and year
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

  const totalSpent = aggregation.length > 0 ? aggregation[0].totalSpent : 0;

  // Update budget if it exists
  await Budget.findOneAndUpdate(
    { userId, category, month, year },
    { spent: totalSpent },
    { new: true }
  );
};

// @desc    Get all transactions for logged in user with filters
// @route   GET /api/v1/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, search, filterPreset, startDate, endDate, sortBy } = req.query;
    
    let query = { userId: req.user._id };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search by description or category
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    // Date Filters
    const now = new Date();
    if (filterPreset) {
      let start, end;
      if (filterPreset === 'today') {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else if (filterPreset === 'this_week') {
        // Calculate start of week (Sunday or Monday, let's say Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start = new Date(new Date(now.setDate(diff)).setHours(0, 0, 0, 0));
        end = new Date();
      } else if (filterPreset === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (filterPreset === 'this_year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      if (start) {
        query.date = { $gte: start, $lte: end };
      }
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Make end date go up to end of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Sort options
    let sortOptions = { date: -1 }; // default: newest first
    if (sortBy === 'amount_asc') {
      sortOptions = { amount: 1 };
    } else if (sortBy === 'amount_desc') {
      sortOptions = { amount: -1 };
    } else if (sortBy === 'date_asc') {
      sortOptions = { date: 1 };
    }

    const transactions = await Transaction.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/v1/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/v1/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, paymentMethod, description, date } = req.body;

    if (!type || !category || amount === undefined) {
      res.status(400);
      throw new Error('Please enter type, category, and amount');
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      category,
      amount: Number(amount),
      paymentMethod,
      description,
      date: date ? new Date(date) : undefined,
    });

    // If type is expense, update budget spent
    if (type === 'expense') {
      await recalculateBudgetSpent(req.user._id, category, transaction.date);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/v1/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, paymentMethod, description, date } = req.body;

    let transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    const oldCategory = transaction.category;
    const oldDate = transaction.date;
    const oldType = transaction.type;

    // Update details
    transaction.type = type || transaction.type;
    transaction.category = category || transaction.category;
    transaction.amount = amount !== undefined ? Number(amount) : transaction.amount;
    transaction.paymentMethod = paymentMethod || transaction.paymentMethod;
    transaction.description = description || transaction.description;
    transaction.date = date ? new Date(date) : transaction.date;

    const updatedTransaction = await transaction.save();

    // Recalculate spent for old and new category / date budgets if expense
    if (oldType === 'expense') {
      await recalculateBudgetSpent(req.user._id, oldCategory, oldDate);
    }
    if (updatedTransaction.type === 'expense') {
      await recalculateBudgetSpent(req.user._id, updatedTransaction.category, updatedTransaction.date);
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/v1/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    const category = transaction.category;
    const date = transaction.date;
    const type = transaction.type;

    await transaction.deleteOne();

    // Recalculate spent if expense
    if (type === 'expense') {
      await recalculateBudgetSpent(req.user._id, category, date);
    }

    res.json({
      success: true,
      message: 'Transaction removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  recalculateBudgetSpent,
};
