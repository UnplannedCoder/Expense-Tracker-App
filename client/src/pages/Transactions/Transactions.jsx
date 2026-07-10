import React, { useState, useEffect, useContext } from 'react';
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFilter,
  FaSyncAlt,
  FaReceipt,
} from 'react-icons/fa';
import { TransactionContext } from '../../context/TransactionContext';
import { CategoryContext } from '../../context/CategoryContext';
import { AuthContext } from '../../context/AuthContext';
import IconHelper from '../../components/common/IconHelper';
import ReceiptScanner from '../../components/receipt/ReceiptScanner';

const Transactions = () => {
  const { user } = useContext(AuthContext);
  const {
    transactions,
    loading,
    filters,
    setFilters,
    resetFilters,
    fetchTransactions,
    addTransaction,
    editTransaction,
    removeTransaction,
  } = useContext(TransactionContext);

  const { categories, fetchCategories } = useContext(CategoryContext);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editId, setEditId] = useState(null);

  // Form State
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Load initial data
  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [fetchTransactions, fetchCategories]);

  // Sync category state when type changes or categories load
  useEffect(() => {
    const filteredCats = categories.filter((cat) => cat.type === type);
    if (filteredCats.length > 0) {
      setCategory(filteredCats[0].name);
    } else {
      setCategory('');
    }
  }, [type, categories]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ [name]: value });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleResetFilters = () => {
    resetFilters();
    // Use timeout to let state update before fetching
    setTimeout(() => {
      fetchTransactions({
        type: '',
        category: '',
        search: '',
        filterPreset: 'this_month',
        startDate: '',
        endDate: '',
        sortBy: 'date_desc',
      });
    }, 50);
  };

  const openAddModal = () => {
    setModalMode('add');
    setType('expense');
    setAmount('');
    setPaymentMethod('Cash');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (tx) => {
    setModalMode('edit');
    setEditId(tx._id);
    setType(tx.type);
    setCategory(tx.category);
    setAmount(tx.amount.toString());
    setPaymentMethod(tx.paymentMethod || 'Cash');
    setDescription(tx.description || '');
    setDate(new Date(tx.date).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !category) return;

    const txData = {
      type,
      category,
      amount: parseFloat(amount),
      paymentMethod,
      description,
      date: new Date(date).toISOString(),
    };

    let result;
    if (modalMode === 'add') {
      result = await addTransaction(txData);
    } else {
      result = await editTransaction(editId, txData);
    }

    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await removeTransaction(id);
    }
  };

  const formatMoney = (amount) => {
    const symbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Monitor and manage your monetary ledger
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition duration-200"
        >
          <FaPlus size={14} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <FaSearch size={14} />
              </span>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search description..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition"
              />
            </div>

            {/* Type */}
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            {/* Category */}
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </select>

            {/* Filter Preset */}
            <select
              name="filterPreset"
              value={filters.filterPreset}
              onChange={handleFilterChange}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Selection */}
          {!filters.filterPreset && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Sort & Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sort By</span>
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs outline-none transition"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Amount (High to Low)</option>
                <option value="amount_asc">Amount (Low to High)</option>
              </select>
            </div>
            
            <div className="flex space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <FaSyncAlt size={12} />
                <span>Reset</span>
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
              >
                <FaFilter size={12} />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Transactions Table/List Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-450 text-xs">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            tx.type === 'income'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <IconHelper name={tx.type === 'income' ? 'FaArrowUp' : 'FaArrowDown'} size={12} />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-150">
                          {tx.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {tx.paymentMethod}
                    </td>
                    <td className="px-6 py-4 text-slate-400 dark:text-slate-500 max-w-[200px] truncate">
                      {tx.description || '-'}
                    </td>
                    <td className={`px-6 py-4 text-right whitespace-nowrap font-bold ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                          title="Edit"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
                          title="Delete"
                        >
                          <FaTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            No transactions found. Add a new transaction or modify your filters.
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-fade-in overflow-hidden">
            {/* Modal Title */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {modalMode === 'add' ? 'Add New Transaction' : 'Edit Transaction'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Transaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                    required
                  >
                    {categories
                      .filter((cat) => cat.type === type)
                      .map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rent deposit, coffee run, freelance payment..."
                  rows="3"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                ></textarea>
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
                  {modalMode === 'add' ? 'Save Transaction' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
