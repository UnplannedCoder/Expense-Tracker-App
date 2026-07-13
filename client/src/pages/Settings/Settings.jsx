import React, { useState, useContext, useEffect } from 'react';
import { FaLock, FaSave, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const Settings = () => {
  const { changePassword, error, clearError, loading } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Clear errors/success on load
  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setFormError('');
    clearError();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setSuccessMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Customize application configurations and credentials security
        </p>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">App Preferences</h2>
        <div className="flex justify-between items-center py-3 border-t border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-150">Application Theme</h4>
            <p className="text-xs text-slate-400">Switch between light mode and dark mode layouts</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
          >
            {theme === 'dark' ? (
              <>
                <FaSun size={14} className="text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <FaMoon size={14} className="text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Section (Change Password) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Security Configuration</h2>
        
        {/* Feedback alerts */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm p-3 rounded-xl">
            {successMsg}
          </div>
        )}
        {(formError || error) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">
            {formError || error}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                required
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-indigo-600/10 transition duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FaLock size={13} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
