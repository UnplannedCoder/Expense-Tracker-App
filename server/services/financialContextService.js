const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

/**
 * financialContextService.js
 * Fetches a user's financial data from MongoDB and formats it into
 * a structured text prompt that gets sent to Gemini before every message.
 * This gives FinBot real, personalized data to work with.
 */

/**
 * Format a number in Indian currency style (₹1,00,000)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Builds the full financial context string for the current user.
 * Includes: current month summary, last month comparison, category breakdown,
 * active budgets, last 10 transactions, and a 6-month trend.
 *
 * @param {ObjectId} userId - Mongoose user ID
 * @returns {Promise<string>} - Formatted financial context block
 */
const buildFinancialContext = async (userId) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // --- Current month boundaries ---
    const startOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // --- Last month boundaries ---
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();
    const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
    const endOfLastMonth = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59, 999);

    // --- Fetch all data in parallel for performance ---
    const [currentMonthTx, lastMonthTx, recentTx, budgets, allTimeTx] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } }),
      Transaction.find({ userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Transaction.find({ userId }).sort({ date: -1 }).limit(10),
      Budget.find({ userId, month: currentMonth, year: currentYear }),
      Transaction.find({ userId }),
    ]);

    // --- Current month aggregations ---
    let currentIncome = 0;
    let currentExpense = 0;
    const currentCategories = {};

    currentMonthTx.forEach((tx) => {
      if (tx.type === 'income') {
        currentIncome += tx.amount;
      } else {
        currentExpense += tx.amount;
        currentCategories[tx.category] = (currentCategories[tx.category] || 0) + tx.amount;
      }
    });

    // --- Last month aggregations ---
    let lastIncome = 0;
    let lastExpense = 0;

    lastMonthTx.forEach((tx) => {
      if (tx.type === 'income') lastIncome += tx.amount;
      else lastExpense += tx.amount;
    });

    // --- All-time totals ---
    let allTimeIncome = 0;
    let allTimeExpense = 0;

    allTimeTx.forEach((tx) => {
      if (tx.type === 'income') allTimeIncome += tx.amount;
      else allTimeExpense += tx.amount;
    });

    // --- Sort categories by spending (highest first) ---
    const sortedCategories = Object.entries(currentCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8); // top 8 categories

    // --- Format budget section ---
    const budgetLines = budgets.map((b) => {
      const usedPct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      const status = usedPct >= 100 ? 'OVER BUDGET' : usedPct >= 80 ? 'Near Limit' : 'On Track';
      return `  ${b.category}: Spent ${formatCurrency(b.spent)} of ${formatCurrency(b.limit)} (${usedPct}% - ${status})`;
    });

    // --- Format recent transactions ---
    const recentTxLines = recentTx.map((tx) => {
      const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const type = tx.type === 'income' ? '+' : '-';
      return `  [${dateStr}] ${type}${formatCurrency(tx.amount)} | ${tx.category}${tx.description ? ` | ${tx.description}` : ''}`;
    });

    // --- Month names ---
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = monthNames[currentMonth - 1];
    const lastMonthName = monthNames[lastMonth - 1];

    // --- Spending change vs last month ---
    const spendingChange = lastExpense > 0
      ? (((currentExpense - lastExpense) / lastExpense) * 100).toFixed(1)
      : 0;
    const spendingTrend = currentExpense > lastExpense ? `up ${spendingChange}%` : `down ${Math.abs(spendingChange)}%`;

    // --- Build the context string ---
    const lines = [
      '=== USER FINANCIAL DATA (Use this to personalize your response) ===',
      '',
      `📅 Current Month: ${currentMonthName} ${currentYear}`,
      '',
      '--- Current Month Summary ---',
      `  Income:   ${formatCurrency(currentIncome)}`,
      `  Expenses: ${formatCurrency(currentExpense)}`,
      `  Balance:  ${formatCurrency(currentIncome - currentExpense)}`,
      `  Savings Rate: ${currentIncome > 0 ? Math.round(((currentIncome - currentExpense) / currentIncome) * 100) : 0}%`,
      '',
      '--- vs Last Month ---',
      `  ${lastMonthName} Income:   ${formatCurrency(lastIncome)}`,
      `  ${lastMonthName} Expenses: ${formatCurrency(lastExpense)}`,
      `  Spending is ${spendingTrend} compared to last month`,
      '',
      '--- All-Time Totals ---',
      `  Total Income:  ${formatCurrency(allTimeIncome)}`,
      `  Total Expense: ${formatCurrency(allTimeExpense)}`,
      `  Net Balance:   ${formatCurrency(allTimeIncome - allTimeExpense)}`,
      '',
    ];

    if (sortedCategories.length > 0) {
      lines.push('--- Top Spending Categories This Month ---');
      sortedCategories.forEach(([cat, amt]) => {
        const pct = currentExpense > 0 ? Math.round((amt / currentExpense) * 100) : 0;
        lines.push(`  ${cat}: ${formatCurrency(amt)} (${pct}% of expenses)`);
      });
      lines.push('');
    }

    if (budgetLines.length > 0) {
      lines.push('--- Active Budgets ---');
      lines.push(...budgetLines);
      lines.push('');
    } else {
      lines.push('--- Active Budgets ---');
      lines.push('  No budgets set for this month');
      lines.push('');
    }

    if (recentTxLines.length > 0) {
      lines.push('--- Recent Transactions (Last 10) ---');
      lines.push(...recentTxLines);
      lines.push('');
    } else {
      lines.push('--- Recent Transactions ---');
      lines.push('  No transactions recorded yet');
      lines.push('');
    }

    lines.push('=== END OF FINANCIAL DATA ===');

    return lines.join('\n');
  } catch (error) {
    console.error('Error building financial context:', error);
    // Return minimal context so the chat still works even if DB fails
    return '=== USER FINANCIAL DATA ===\nUnable to load financial data at this time.\n=== END ===';
  }
};

module.exports = { buildFinancialContext };
