const Transaction = require('../models/Transaction');
const PDFDocument = require('pdfkit');

// @desc    Get monthly financial report
// @route   GET /api/v1/reports/monthly
// @access  Private
const getMonthlyReport = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch transactions in date range
    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    // Format category breakdown as array
    const breakdownArray = Object.keys(categoryBreakdown).map((cat) => ({
      category: cat,
      amount: categoryBreakdown[cat],
      percentage: totalExpense > 0 ? Math.round((categoryBreakdown[cat] / totalExpense) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        month,
        year,
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        categoryBreakdown: breakdownArray,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get yearly financial report
// @route   GET /api/v1/reports/yearly
// @access  Private
const getYearlyReport = async (req, res, next) => {
  try {
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startOfYear, $lte: endOfYear },
    });

    // Monthly aggregates (0 = January, ..., 11 = December)
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
    }));

    const categoryBreakdown = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      const txMonth = new Date(tx.date).getMonth();
      if (tx.type === 'income') {
        monthlyData[txMonth].income += tx.amount;
        totalIncome += tx.amount;
      } else {
        monthlyData[txMonth].expense += tx.amount;
        totalExpense += tx.amount;
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    const breakdownArray = Object.keys(categoryBreakdown).map((cat) => ({
      category: cat,
      amount: categoryBreakdown[cat],
      percentage: totalExpense > 0 ? Math.round((categoryBreakdown[cat] / totalExpense) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        year,
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        monthlyData,
        categoryBreakdown: breakdownArray,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions as CSV
// @route   GET /api/v1/reports/export/csv
// @access  Private
const exportCSV = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1 });

    let csvContent = 'Date,Type,Category,Amount,Payment Method,Description\r\n';

    transactions.forEach((tx) => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      const typeStr = tx.type.toUpperCase();
      const catStr = tx.category;
      const amtStr = tx.amount.toString();
      const payStr = tx.paymentMethod || 'Cash';
      const descStr = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '""';

      csvContent += `${dateStr},${typeStr},${catStr},${amtStr},${payStr},${descStr}\r\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expense_report.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Export financial report as PDF
// @route   GET /api/v1/reports/export/pdf
// @access  Private
const exportPDF = async (req, res, next) => {
  try {
    const user = req.user;
    const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 }).limit(100);

    // Calculate overall summaries
    const allTransactions = await Transaction.find({ userId: user._id });
    let totalIncome = 0;
    let totalExpense = 0;
    allTransactions.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=financial_report.pdf`);

    doc.pipe(res);

    // Document Header
    doc
      .fillColor('#4f46e5')
      .fontSize(24)
      .text('EXPENSE TRACKER APP', { align: 'center' })
      .moveDown(0.2);
    
    doc
      .fillColor('#374151')
      .fontSize(14)
      .text('Financial Statement & Summary', { align: 'center' })
      .moveDown(1.5);

    // User Details & Summary Boxes
    doc
      .fontSize(10)
      .text(`Report Generated For: ${user.name}`)
      .text(`Email: ${user.email}`)
      .text(`Date: ${new Date().toLocaleDateString()}`)
      .text(`Currency: ${user.currency}`)
      .moveDown(1.5);

    // Summary section
    doc
      .fillColor('#10b981')
      .fontSize(12)
      .text(`Total Income: ${user.currency} ${totalIncome.toFixed(2)}`)
      .fillColor('#ef4444')
      .text(`Total Expenses: ${user.currency} ${totalExpense.toFixed(2)}`)
      .fillColor('#374151')
      .text(`Net Balance: ${user.currency} ${(totalIncome - totalExpense).toFixed(2)}`)
      .moveDown(2);

    // Transactions Table Header
    doc
      .fontSize(12)
      .fillColor('#111827')
      .text('Recent Transactions (Max 100)', { underline: true })
      .moveDown(0.5);

    // Draw Table Headers
    const tableTop = doc.y;
    doc
      .fontSize(10)
      .text('Date', 50, tableTop)
      .text('Type', 130, tableTop)
      .text('Category', 200, tableTop)
      .text('Amount', 320, tableTop)
      .text('Description', 400, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    transactions.forEach((tx) => {
      // Check if page overflow
      if (y > 700) {
        doc.addPage();
        y = 50; // top margin of new page
      }

      const formattedDate = new Date(tx.date).toLocaleDateString();
      const color = tx.type === 'income' ? '#10b981' : '#ef4444';

      doc
        .fillColor('#374151')
        .text(formattedDate, 50, y)
        .fillColor(color)
        .text(tx.type.toUpperCase(), 130, y)
        .fillColor('#374151')
        .text(tx.category, 200, y)
        .text(`${user.currency} ${tx.amount.toFixed(2)}`, 320, y)
        .text(tx.description || '-', 400, y, { width: 150, height: 15 });

      y += 20;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonthlyReport,
  getYearlyReport,
  exportCSV,
  exportPDF,
};
