import React, { useState } from 'react';

/**
 * QuickActions
 * Clickable suggestion chips displayed below the welcome message
 * or when the conversation is empty. Clicking a chip sends that
 * message automatically.
 *
 * Two tabs:
 *  - Finance  — personal expense / budget actions (original set)
 *  - Markets  — real-time & historical market data queries
 */

const FINANCE_ACTIONS = [
  { label: '📊 Analyze My Expenses', text: 'Analyze my expenses and give me detailed insights.' },
  { label: '📅 Monthly Summary', text: 'Give me a financial summary for this month.' },
  { label: '💡 Saving Tips', text: 'Give me personalized tips to save more money this month.' },
  { label: '📋 Budget Planner', text: 'Help me create a budget plan based on my spending.' },
  { label: '🏆 Top Spending Category', text: 'Which category am I spending the most on?' },
  { label: '📈 Compare This Month', text: "Compare this month's spending with last month." },
  { label: '❤️ Financial Health Score', text: 'Give me a financial health score and assessment.' },
  { label: '🔍 Where Am I Overspending?', text: 'Where am I overspending and how can I fix it?' },
  { label: '🎯 Save ₹5000 This Month', text: 'How can I save ₹5000 this month?' },
  { label: '📉 Predict My Expenses', text: 'Based on my history, predict my expenses for next month.' },
];

const MARKET_ACTIONS = [
  { label: '🌐 Market Overview', text: 'Give me a live market overview for today including Nifty 50, Sensex, Bitcoin, and USD/INR rate.' },
  { label: '📈 Nifty 50 Today', text: 'What is the current Nifty 50 index level and how is it performing today?' },
  { label: '📊 Sensex Live', text: 'What is the live Sensex value and its change today?' },
  { label: '₿ Bitcoin Price', text: 'What is the current Bitcoin price in INR and USD? Show the 24h change.' },
  { label: '🔷 Ethereum Price', text: 'What is the current Ethereum (ETH) price in INR and USD?' },
  { label: '💱 USD to INR Rate', text: 'What is the current USD to INR exchange rate and other major forex rates?' },
  { label: '🏅 Gold & Oil Prices', text: 'What are the current gold and crude oil prices?' },
  { label: '📉 Nifty 1-Month Chart', text: 'Show me the Nifty 50 historical performance over the last 1 month.' },
  { label: '🔮 Bitcoin 30-Day History', text: 'Show me Bitcoin price history for the last 30 days in INR.' },
  { label: '💼 Reliance Stock', text: 'What is the current price of Reliance Industries stock and how is it performing?' },
  { label: '💻 TCS & Infosys', text: 'What are the current prices of TCS and Infosys stocks?' },
  { label: '🌍 Global Markets', text: 'How are global markets performing today? Show me S&P 500, NASDAQ, and other major indices.' },
  { label: '📊 Crypto Overview', text: 'Give me a live overview of top cryptocurrencies — Bitcoin, Ethereum, BNB, and Solana prices in INR.' },
  { label: '💰 SIP Advice', text: 'Based on my monthly savings, suggest how I can start a SIP in Nifty 50 index funds.' },
  { label: '📆 Yearly Market Trend', text: 'Show me the Nifty 50 performance trend over the last 1 year.' },
];

const TAB_STYLES = {
  active:
    'text-xs px-3 py-1 rounded-full font-semibold transition-all duration-150 bg-indigo-600 text-white dark:bg-indigo-500',
  inactive:
    'text-xs px-3 py-1 rounded-full font-semibold transition-all duration-150 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
};

const CHIP_STYLES = {
  finance:
    'text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-150 font-medium whitespace-nowrap',
  market:
    'text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-150 font-medium whitespace-nowrap',
};

const QuickActions = ({ onSelect }) => {
  const [activeTab, setActiveTab] = useState('finance');

  const actions = activeTab === 'finance' ? FINANCE_ACTIONS : MARKET_ACTIONS;
  const chipStyle = CHIP_STYLES[activeTab];

  return (
    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-2.5">
        <button
          onClick={() => setActiveTab('finance')}
          className={activeTab === 'finance' ? TAB_STYLES.active : TAB_STYLES.inactive}
        >
          💰 Finance
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={activeTab === 'market' ? TAB_STYLES.active : TAB_STYLES.inactive}
        >
          📈 Markets
        </button>
        {activeTab === 'market' && (
          <span className="text-xs text-emerald-500 dark:text-emerald-400 font-medium ml-1">
            • Live
          </span>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.text)}
            className={chipStyle}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
