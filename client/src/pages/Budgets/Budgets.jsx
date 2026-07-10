import React, { useState, useEffect, useContext } from 'react';
import { FaPlus, FaEdit, FaTrash, FaPiggyBank } from 'react-icons/fa';
import { BudgetContext } from '../../context/BudgetContext';
import { CategoryContext } from '../../context/CategoryContext';
import { AuthContext } from '../../context/AuthContext';

const Budgets = () => {
  const { user } = useContext(AuthContext);
  const {
    budgets,
    loading,
    fetchBudgets,
    addBudget,
    editBudget,
    removeBudget,
  } = useContext(BudgetContext);

  const { categories, fetchCategories } = useContext(CategoryContext);

  // Month & Year Filter
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editId, setEditId] = useState(null);

  // Form States
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch budgets when month/year changes
  useEffect(() => {
    fetchBudgets(month, year);
    fetchCategories();
  }, [fetchBudgets, month, year, fetchCategories]);

  // Set default category when categories load or modal opens
  useEffect(() => {
    const expenseCats = categories.filter((cat) => cat.type === 'expense');
    if (expenseCats.length > 0 && !category) {
      setCategory(expenseCats[0].name);
    }
  }, [categories, category]);

  const handleOpenAdd = () => {
    setModalMode('add');
    const expenseCats = categories.filter((cat) => cat.type === 'expense');
    setCategory(expenseCats.length > 0 ? expenseCats[0].name : '');
    setLimit('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (budget) => {
    setModalMode('edit');
    setEditId(budget._id);
    setCategory(budget.category);
    setLimit(budget.limit.toString());
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!category || !limit) return;

    let result;
    if (modalMode === 'add') {
      result = await addBudget({
        category,
        limit: parseFloat(limit),
        month,
        year,
      });
    } else {
      result = await editBudget(editId, parseFloat(limit), month, year);
    }

    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      await removeBudget(id, month, year);
    }
  };

  const formatMoney = (amount) => {
    const symbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getProgressColor = (spent, limit) => {
    const ratio = spent / limit;
    if (ratio >= 0.9) return 'bg-rose-500';
    if (ratio >= 0.7) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getProgressText = (spent, limit) => {
    const ratio = spent / limit;
    if (ratio >= 1) return 'Over Budget!';
    if (ratio >= 0.9) return 'Critical Limit!';
    if (ratio >= 0.7) return 'Approaching Limit';
    return 'Within Budget';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Monthly Budgets</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Set and monitor category limits to manage spending
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition duration-200"
        >
          <FaPlus size={14} />
          <span>Set Budget</span>
        </button>
      </div>

      {/* Date filter bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const percentage = Math.min(Math.round((b.spent / b.limit) * 100), 100);
            const ratio = b.spent / b.limit;
            return (
              <div
                key={b._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <FaPiggyBank size={18} />
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                        {b.category}
                      </h3>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Edit Limit"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(b._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
                        title="Remove Budget"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Summary values */}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Spent: {formatMoney(b.spent)}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350">Limit: {formatMoney(b.limit)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                        b.spent,
                        b.limit
                      )}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs mt-3">
                  <span
                    className={`font-semibold ${
                      ratio >= 0.9 ? 'text-rose-600' : ratio >= 0.7 ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    {getProgressText(b.spent, b.limit)}
                  </span>
                  <span className="text-slate-400">{percentage}% used</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-16 rounded-2xl shadow-sm text-center text-slate-400 dark:text-slate-500 text-sm">
          No budget limits defined for this month. Set monthly category limits to prevent overspending.
        </div>
      )}

      {/* Add/Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-fade-in overflow-hidden">
            {/* Modal Title */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {modalMode === 'add' ? 'Set Category Budget' : 'Edit Budget Limit'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
                  disabled={modalMode === 'edit'}
                  required
                >
                  {categories
                    .filter((cat) => cat.type === 'expense')
                    .map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Limit input */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monthly Limit</label>
                <input
                  type="number"
                  min="0"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/10 transition"
                >
                  {modalMode === 'add' ? 'Save Budget' : 'Update Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
