import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaChartPie,
  FaExchangeAlt,
  FaPiggyBank,
  FaFileAlt,
  FaUser,
  FaCog,
  FaChartBar,
  FaTimes,
} from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { name: 'Dashboard',    path: '/dashboard',    icon: FaChartPie },
    { name: 'Transactions', path: '/transactions', icon: FaExchangeAlt },
    { name: 'Budgets',      path: '/budgets',      icon: FaPiggyBank },
    { name: 'Analytics',    path: '/analytics',    icon: FaChartBar },
    { name: 'Reports',      path: '/reports',      icon: FaFileAlt },
    { name: 'Profile',      path: '/profile',      icon: FaUser },
    { name: 'Settings',     path: '/settings',     icon: FaCog },
  ];

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const NavItems = () => (
    <nav className="flex-1 px-4 py-6 space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={onClose}
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
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible on lg+) ─────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex-shrink-0 flex-col transition-colors duration-300">
        <NavItems />
        <div className="p-4 border-t border-slate-300 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-400 dark:text-slate-500">SpendWise v1.0.0</span>
        </div>
      </aside>

      {/* ── Mobile drawer backdrop ───────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer panel ─────────────────────────────────────────── */}
      <aside
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-72
          bg-white dark:bg-slate-900
          border-r border-slate-300 dark:border-slate-800
          flex flex-col
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg font-bold text-base leading-none shadow-md shadow-indigo-600/20">
              $
            </span>
            <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              SpendWise
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <NavItems />

        <div className="p-4 border-t border-slate-300 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-400 dark:text-slate-500">SpendWise v1.0.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
