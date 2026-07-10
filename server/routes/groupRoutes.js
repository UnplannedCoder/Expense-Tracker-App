const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // all group routes require authentication

router.route('/').get(getGroups).post(createGroup);
router.route('/:id').get(getGroupById).put(updateGroup).delete(deleteGroup);
router.route('/:id/members').post(addMember);
router.route('/:id/members/:memberId').delete(removeMember);
router.route('/:id/members/:memberId/settle').put(settleMember);
router.route('/:id/expenses').post(addExpense);
router.route('/:id/expenses/:expenseId').delete(deleteExpense);

module.exports = router;
