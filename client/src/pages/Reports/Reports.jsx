import React, { useState, useEffect, useContext } from 'react';
import { FaFileCsv, FaFilePdf, FaCalendarAlt } from 'react-icons/fa';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    monthlyData: [],
    categoryBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState({ csv: false, pdf: false });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#06b6d4'];

  const formatMoney = (amount) => {
    const symbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Custom Tooltip Component for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {user ? formatMoney(entry.value) : `$${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip Component for Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-semibold">{entry.name}</p>
          <p className="text-emerald-400 text-sm font-medium">
            {user ? formatMoney(entry.value) : `$${entry.value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports/yearly', { params: { year } });
        if (res.data.success) {
          // Format monthlyData with month names
          const formattedMonthly = res.data.data.monthlyData.map((d) => ({
            ...d,
            name: monthNames[d.month - 1],
          }));
          setData({ ...res.data.data, monthlyData: formattedMonthly });
        }
      } catch (err) {
        console.error('Failed to fetch yearly report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [year]);

  const handleExport = async (format) => {
    setExportLoading((prev) => ({ ...prev, [format]: true }));
    try {
      const response = await api.get(`/reports/export/${format}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${year}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(`Failed to export ${format}:`, err);
      alert(`Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setExportLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Financial Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Analyze historical spending trends and download Statements
          </p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading.csv}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50 text-sm"
          >
            <FaFileCsv size={16} />
            <span>{exportLoading.csv ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportLoading.pdf}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/10 transition disabled:opacity-50 text-sm"
          >
            <FaFilePdf size={16} />
            <span>{exportLoading.pdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Year Selection bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FaCalendarAlt size={18} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Select Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold outline-none transition"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Summary values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                Yearly Income
              </span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(data.totalIncome)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                Yearly Expense
              </span>
              <h3 className="text-2xl font-bold text-rose-600">
                {formatMoney(data.totalExpense)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                Yearly Savings
              </span>
              <h3 className={`text-2xl font-bold ${data.netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                {formatMoney(data.netSavings)}
              </h3>
            </div>
          </div>

          {/* Yearly Chart Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">
                Monthly Trend (Income vs Expense)
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">
                Category Breakdown
              </h3>
              {data.categoryBreakdown.length > 0 ? (
                <div className="h-80 flex flex-col justify-between">
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {data.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend lists */}
                  <div className="overflow-y-auto max-h-28 pr-2 space-y-2 mt-4">
                    {data.categoryBreakdown.map((entry, index) => (
                      <div key={entry.category} className="flex justify-between text-xs">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {entry.category}
                          </span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatMoney(entry.amount)} ({entry.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  No expense records to analyze.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
