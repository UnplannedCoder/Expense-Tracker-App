import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaPiggyBank,
  FaPlus,
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import IconHelper from '../../components/common/IconHelper';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    categoryBreakdown: [],
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chart colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#06b6d4'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // 1. Fetch monthly report
        const reportRes = await api.get('/reports/monthly', {
          params: { month, year },
        });
        if (reportRes.data.success) {
          setMetrics(reportRes.data.data);
        }

        // 2. Fetch recent 5 transactions
        const txRes = await api.get('/transactions', {
          params: { limit: 5, sortBy: 'date_desc' },
        });
        if (txRes.data.success) {
          // Limit to 5 items manually just in case
          setRecentTransactions(txRes.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatMoney = (amount) => {
    const symbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
    return `${symbol}${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Prepping trend data for a mini bar chart (e.g. Income vs Expenses)
  const barChartData = [
    {
      name: 'Flows',
      Income: metrics.totalIncome,
      Expense: metrics.totalExpense,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Here is your financial status for this month.
          </p>
        </div>
        <Link
          to="/transactions"
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition duration-200 w-fit"
        >
          <FaPlus size={14} />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Balance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm transition duration-300">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Net Balance
            </span>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FaWallet size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            {formatMoney(metrics.netSavings)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Remaining savings this month
          </p>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm transition duration-300">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Total Income
            </span>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FaArrowUp size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatMoney(metrics.totalIncome)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Earned deposits this month
          </p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm transition duration-300">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <FaArrowDown size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {formatMoney(metrics.totalExpense)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Money spent this month
          </p>
        </div>

        {/* Budget limit card indicator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm transition duration-300">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Savings Ratio
            </span>
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <FaPiggyBank size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            {metrics.totalIncome > 0
              ? `${Math.round((metrics.netSavings / metrics.totalIncome) * 100)}%`
              : '0%'}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Percentage of income saved
          </p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Flows Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">
            Income vs Expense Comparison
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Category Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">
            Expense Distribution
          </h3>
          {metrics.categoryBreakdown.length > 0 ? (
            <div className="h-64 flex flex-col justify-center">
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {metrics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                      }}
                      formatter={(value) => formatMoney(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Pie Legends */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-xs max-h-16 overflow-y-auto">
                {metrics.categoryBreakdown.map((entry, index) => (
                  <div key={entry.category} className="flex items-center space-x-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-slate-500 dark:text-slate-400">
                      {entry.category} ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No expense records to analyze.
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            Recent Transactions
          </h3>
          <Link
            to="/transactions"
            className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-semibold"
          >
            View All
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-xl ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <IconHelper name={tx.type === 'income' ? 'FaArrowUp' : 'FaArrowDown'} size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {tx.category}
                    </h4>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">
                      {new Date(tx.date).toLocaleDateString()} • {tx.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold text-sm ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                  </span>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 truncate max-w-[120px] sm:max-w-[200px]">
                    {tx.description || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
            No recent transactions. Add income or expenses to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
