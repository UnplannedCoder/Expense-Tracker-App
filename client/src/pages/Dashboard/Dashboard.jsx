import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { Link } from "react-router-dom";
import {
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaPiggyBank,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
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
} from "recharts";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import IconHelper from "../../components/common/IconHelper";

// ImageAnalyzer pulls in pdfjs-dist — lazy-load so it doesn't bloat the dashboard chunk
const ImageAnalyzer = lazy(() => import("../../components/ImageAnalyzer"));

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#06b6d4",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── helpers ──────────────────────────────────────────────────────────────────

const clampToNow = (month, year) => {
  const now = new Date();
  if (year > now.getFullYear())
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  if (year === now.getFullYear() && month > now.getMonth() + 1)
    return { month: now.getMonth() + 1, year };
  return { month, year };
};

// ── component ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  // selectedMonth/Year drive the picker; null means "use the auto-detected month"
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    categoryBreakdown: [],
    month: null,
    year: null,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const [reportRes, txRes] = await Promise.all([
        // If month/year are provided use the monthly endpoint, otherwise use
        // dashboard-summary which auto-detects the most recent active month
        month && year
          ? api.get("/reports/monthly", { params: { month, year } })
          : api.get("/reports/dashboard-summary"),
        api.get("/transactions", { params: { limit: 5, sortBy: "date_desc" } }),
      ]);

      if (reportRes.data.success) {
        const data = reportRes.data.data;
        setMetrics(data);
        // On the first load (no picker selection yet) lock the picker to
        // whatever month the server auto-detected so the arrows work correctly
        if (!month && !year) {
          setSelectedMonth(data.month);
          setSelectedYear(data.year);
        }
      }
      if (txRes.data.success) {
        setRecentTransactions(txRes.data.data.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — auto-detect the most recent active month
  useEffect(() => {
    fetchDashboardData(null, null);
  }, [fetchDashboardData]);

  // ── month picker navigation ───────────────────────────────────────────────

  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    fetchDashboardData(m, y);
  };

  const handleNextMonth = () => {
    const clamped = clampToNow(selectedMonth + 1, selectedYear);
    // Don't allow navigating past the current real month
    const now = new Date();
    if (
      selectedYear > now.getFullYear() ||
      (selectedYear === now.getFullYear() &&
        selectedMonth >= now.getMonth() + 1)
    )
      return;
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const safe = clampToNow(m, y);
    setSelectedMonth(safe.month);
    setSelectedYear(safe.year);
    fetchDashboardData(safe.month, safe.year);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()
    );
  };

  // ── formatting ────────────────────────────────────────────────────────────

  const formatMoney = (amount) => {
    const symbol =
      user?.currency === "INR"
        ? "₹"
        : user?.currency === "EUR"
          ? "€"
          : user?.currency === "GBP"
            ? "£"
            : "$";
    return `${symbol}${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // ── skeleton / loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        {/* header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 w-40 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        {/* cards skeleton */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
        {/* charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const barChartData = [
    {
      name: "Month",
      Income: metrics.totalIncome,
      Expense: metrics.totalExpense,
    },
  ];
  const periodLabel =
    selectedMonth && selectedYear
      ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      : "this month";

  return (
    <div className="space-y-5">
      {/* ── Welcome heading ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Financial summary for{" "}
            <span className="font-semibold text-indigo-500">{periodLabel}</span>
          </p>
        </div>
        <Link
          to="/transactions"
          className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition text-sm w-full sm:w-auto flex-shrink-0 whitespace-nowrap"
        >
          <FaPlus size={13} />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* ── Month picker ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 self-start">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition"
          aria-label="Previous month"
        >
          <FaChevronLeft size={12} />
        </button>
        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
          {periodLabel}
        </span>
        <button
          onClick={handleNextMonth}
          disabled={isCurrentMonth()}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <FaChevronRight size={12} />
        </button>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Net Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider leading-tight">
              Net Balance
            </span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
              <FaWallet size={13} />
            </div>
          </div>
          <h3
            className={`font-extrabold leading-tight truncate ${metrics.netSavings >= 0 ? "text-slate-800 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"}`}
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.75rem)" }}
          >
            {metrics.netSavings < 0 ? "−" : ""}
            {formatMoney(metrics.netSavings)}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">Income minus expenses</p>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider leading-tight">
              Total Income
            </span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
              <FaArrowUp size={13} />
            </div>
          </div>
          <h3
            className="font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight truncate"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.75rem)" }}
          >
            {formatMoney(metrics.totalIncome)}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">Earned this period</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider leading-tight">
              Total Expenses
            </span>
            <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex-shrink-0">
              <FaArrowDown size={13} />
            </div>
          </div>
          <h3
            className="font-extrabold text-rose-600 dark:text-rose-400 leading-tight truncate"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.75rem)" }}
          >
            {formatMoney(metrics.totalExpense)}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">Spent this period</p>
        </div>

        {/* Savings Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-2xl shadow-sm min-w-0 overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider leading-tight">
              Savings Ratio
            </span>
            <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex-shrink-0">
              <FaPiggyBank size={13} />
            </div>
          </div>
          <h3
            className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.75rem)" }}
          >
            {metrics.totalIncome > 0
              ? `${Math.round((metrics.netSavings / metrics.totalIncome) * 100)}%`
              : "—"}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">
            Percentage of income saved
          </p>
        </div>
      </div>

      {/* ── Smart Expense Analyzer ───────────────────────────────────────── */}
      <Suspense
        fallback={
          <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        }
      >
        <ImageAnalyzer />
      </Suspense>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg mb-1">
            Income vs Expense
          </h3>
          <p className="text-xs text-slate-400 mb-5">{periodLabel}</p>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                  className="dark:stroke-slate-800"
                />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.95)",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [formatMoney(value), name]}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg mb-1">
            Expense Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-5">{periodLabel}</p>
          {metrics.categoryBreakdown.length > 0 ? (
            <div className="flex flex-col">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {metrics.categoryBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        borderRadius: "12px",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(value) => formatMoney(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 text-xs max-h-20 overflow-y-auto">
                {metrics.categoryBreakdown.map((entry, index) => (
                  <div
                    key={entry.category}
                    className="flex items-center space-x-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
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
            <div className="h-52 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm text-center px-4">
              No expense records for {periodLabel}.
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
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
              <div
                key={tx._id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                  >
                    <IconHelper
                      name={tx.type === "income" ? "FaArrowUp" : "FaArrowDown"}
                      size={13}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                      {tx.category}
                    </h4>
                    <p className="text-slate-400 dark:text-slate-500 text-xs truncate">
                      {new Date(tx.date).toLocaleDateString()} ·{" "}
                      {tx.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`font-bold text-sm ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </span>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 truncate max-w-[100px] sm:max-w-[180px]">
                    {tx.description || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
            No transactions yet. Add your first income or expense to get
            started.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
