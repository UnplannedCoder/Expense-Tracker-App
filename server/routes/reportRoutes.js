const express = require('express');
const router = express.Router();
const {
  getMonthlyReport,
  getYearlyReport,
  exportCSV,
  exportPDF,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all report routes

router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/export/csv', exportCSV);
router.get('/export/pdf', exportPDF);

module.exports = router;
