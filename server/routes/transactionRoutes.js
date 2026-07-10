const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all transaction routes

router.route('/').get(getTransactions).post(createTransaction);
router.route('/:id').get(getTransactionById).put(updateTransaction).delete(deleteTransaction);

module.exports = router;
