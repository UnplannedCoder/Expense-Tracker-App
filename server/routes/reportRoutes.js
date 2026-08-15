const express = require('express');
const router = express.Router();
const {
  getMonthlyReport,
  getDashboardSummary,
  getYearlyReport,
  exportCSV,
  exportPDF,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all report routes

// Dashboard summary — always returns the most recent month that has data
router.get('/dashboard-summary', getDashboardSummary);

router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/export/csv', exportCSV);
router.get('/export/pdf', exportPDF);

module.exports = router;
