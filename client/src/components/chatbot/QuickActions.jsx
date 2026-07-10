import React from 'react';

/**
 * QuickActions
 * Clickable suggestion chips displayed below the welcome message
 * or when the conversation is empty. Clicking a chip sends that
 * message automatically.
 */

const QUICK_ACTIONS = [
  { label: '📊 Analyze My Expenses', text: 'Analyze my expenses and give me detailed insights.' },
  { label: '📅 Monthly Summary', text: 'Give me a financial summary for this month.' },
  { label: '💡 Saving Tips', text: 'Give me personalized tips to save more money this month.' },
  { label: '📋 Budget Planner', text: 'Help me create a budget plan based on my spending.' },
  { label: '🏆 Top Spending Category', text: 'Which category am I spending the most on?' },
  { label: '📈 Compare This Month', text: 'Compare this month\'s spending with last month.' },
  { label: '❤️ Financial Health Score', text: 'Give me a financial health score and assessment.' },
  { label: '🔍 Where Am I Overspending?', text: 'Where am I overspending and how can I fix it?' },
  { label: '🎯 Save ₹5000 This Month', text: 'How can I save ₹5000 this month?' },
  { label: '📉 Predict My Expenses', text: 'Based on my history, predict my expenses for next month.' },
];

const QuickActions = ({ onSelect }) => {
  return (
    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium uppercase tracking-wide">
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.text)}
            className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-150 font-medium whitespace-nowrap"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
