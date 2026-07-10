import React, { useState, useEffect, useContext } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FaChartLine, FaArrowUp, FaArrowDown, FaFire, FaTrophy } from 'react-icons/fa';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { formatMoney } from '../../utils/formatMoney';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#06b6d4'];
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── tooltip ─────────────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-lg text-xs min-w-[130px]">
      {label && <p className="text-slate-300 font-semibold mb-1.5">{label}</p>}
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color}} className="font-medium">{p.name}: {formatMoney(p.value,currency)}</p>
      ))}
    </div>
  );
};

/* ─── stat card ───────────────────────────────────────────────────────────── */
const Card = ({ label, value, sub, Icon, bg, color }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`p-2.5 rounded-xl ${bg}`}><Icon size={15} className={color}/></div>
    </div>
    <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
    {sub&&<p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

const Analytics = () => {
  const { user } = useContext(AuthContext);
  const currency = user?.currency || 'INR';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [yearly, setYearly]   = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selYear,  setSelYear]  = useState(currentYear);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [yr, mo] = await Promise.all([
          api.get('/reports/yearly',  { params: { year: selYear } }),
          api.get('/reports/monthly', { params: { month: selMonth, year: selYear } }),
        ]);
        if (yr.data.success)  setYearly(yr.data.data);
        if (mo.data.success) setMonthly(mo.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [selMonth, selYear]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"/>
    </div>
  );

  /* ── derived data ──────────────────────────────────────────────────────── */
  const areaData = (yearly?.monthlyData || []).map(d => ({
    name: MONTHS[d.month - 1], income: d.income, expense: d.expense,
    savings: d.income - d.expense,
  }));

  const topCats = [...(monthly?.categoryBreakdown || [])]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const savingsRate = monthly?.totalIncome > 0
    ? Math.round((monthly.netSavings / monthly.totalIncome) * 100) : 0;

  const highestMonth = areaData.reduce(
    (best, d) => d.expense > (best?.expense || 0) ? d : best, null
  );
  const bestSavingsMonth = areaData.reduce(
    (best, d) => d.savings > (best?.savings || -Infinity) ? d : best, null
  );

  return (
    <div className="space-y-6">
      {/* ── header + filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Deep insights into your spending patterns</p>
        </div>
        <div className="flex gap-3">
          <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition">
            {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition">
            {[currentYear, currentYear-1, currentYear-2].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Monthly Income"   value={formatMoney(monthly?.totalIncome||0,currency)}  sub={`${MONTHS[selMonth-1]} ${selYear}`} Icon={FaArrowUp}   bg="bg-emerald-500/10" color="text-emerald-600 dark:text-emerald-400"/>
        <Card label="Monthly Expense"  value={formatMoney(monthly?.totalExpense||0,currency)} sub={`${MONTHS[selMonth-1]} ${selYear}`} Icon={FaArrowDown}  bg="bg-rose-500/10"    color="text-rose-600 dark:text-rose-400"/>
        <Card label="Savings Rate"     value={`${savingsRate}%`}  sub="of income saved this month"  Icon={FaTrophy} bg="bg-indigo-500/10"  color="text-indigo-600 dark:text-indigo-400"/>
        <Card label="Yearly Expenses"  value={formatMoney(yearly?.totalExpense||0,currency)} sub={`Full year ${selYear}`} Icon={FaFire} bg="bg-amber-500/10" color="text-amber-600 dark:text-amber-400"/>
      </div>

      {/* ── yearly trend area chart ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <FaChartLine size={16} className="text-indigo-500"/>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Income vs Expense Trend ({selYear})</h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{top:5,right:10,left:0,bottom:0}}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800"/>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize:12}}/>
              <YAxis stroke="#94a3b8" tick={{fontSize:12}} width={60}
                tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <Tooltip content={<Tip currency={currency}/>}/>
              <Legend wrapperStyle={{fontSize:'12px'}}/>
              <Area type="monotone" dataKey="income"  name="Income"  stroke="#10b981" fill="url(#gIncome)"  strokeWidth={2}/>
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#gExpense)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── monthly category breakdown + bar chart ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* category pie */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-5">
            Spending by Category — {MONTHS[selMonth-1]}
          </h3>
          {topCats.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expense data for this month.</div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topCats} dataKey="amount" nameKey="category"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {topCats.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>formatMoney(v,currency)}
                      contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',borderRadius:'12px',border:'none',color:'#fff',fontSize:'12px'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {topCats.map((c,i)=>(
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:COLORS[i%COLORS.length]}}/>
                      <span className="text-slate-500 dark:text-slate-400">{c.category}</span>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatMoney(c.amount,currency)} <span className="font-normal text-slate-400">({c.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* monthly bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-5">Monthly Comparison ({selYear})</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} margin={{top:5,right:5,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800"/>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize:11}}/>
                <YAxis stroke="#94a3b8" tick={{fontSize:11}} width={55}
                  tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <Tooltip content={<Tip currency={currency}/>}/>
                <Legend wrapperStyle={{fontSize:'12px'}}/>
                <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── insights cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Yearly Net Savings</p>
          <p className={`text-xl font-extrabold ${(yearly?.netSavings||0)>=0?'text-indigo-600 dark:text-indigo-400':'text-rose-600'}`}>
            {formatMoney(yearly?.netSavings||0, currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Income minus all expenses for {selYear}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">Highest Spending Month</p>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{highestMonth?.name || '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{highestMonth ? formatMoney(highestMonth.expense, currency) : 'No data'}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Best Savings Month</p>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{bestSavingsMonth?.name || '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{bestSavingsMonth ? formatMoney(bestSavingsMonth.savings, currency) : 'No data'}</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
