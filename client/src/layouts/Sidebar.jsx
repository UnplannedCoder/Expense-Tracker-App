import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaChartPie,
  FaExchangeAlt,
  FaPiggyBank,
  FaFileAlt,
  FaUser,
  FaCog,
  FaChartBar,
} from 'react-icons/fa';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard',    path: '/dashboard',    icon: FaChartPie },
    { name: 'Transactions', path: '/transactions', icon: FaExchangeAlt },
    { name: 'Budgets',      path: '/budgets',      icon: FaPiggyBank },
    { name: 'Analytics',    path: '/analytics',    icon: FaChartBar },
    { name: 'Reports',      path: '/reports',      icon: FaFileAlt },
    { name: 'Profile',      path: '/profile',      icon: FaUser },
    { name: 'Settings',     path: '/settings',     icon: FaCog },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col transition-colors duration-300">
      {/* Sidebar Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          SpendWise v1.0.0
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
