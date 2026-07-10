import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaSun, FaMoon, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <nav className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center space-x-2">
        <span className="bg-indigo-600 text-white p-2 rounded-lg font-bold text-lg leading-none shadow-md shadow-indigo-600/20">
          $
        </span>
        <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
          SpendWise
        </span>
      </Link>

      {/* Action Items */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
        </button>

        {/* User Card */}
        {user && (
          <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <Link
              to="/profile"
              className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-indigo-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-md shadow-indigo-600/20">
                  {getInitials(user.name)}
                </div>
              )}
              <span className="hidden sm:inline font-medium text-sm">{user.name}</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <FaSignOutAlt size={18} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
