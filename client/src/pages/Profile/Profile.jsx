import React, { useState, useContext, useEffect } from 'react';
import { FaUser, FaSave, FaCoins } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, error, clearError, loading } = useContext(AuthContext);
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [profileImage, setProfileImage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCurrency(user.currency || 'USD');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  // Clear errors/success on load
  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setFormError('');
    clearError();

    if (!name) {
      setFormError('Name cannot be empty');
      return;
    }

    const result = await updateProfile({ name, currency, profileImage });
    if (result.success) {
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    return n
      .split(' ')
      .map((i) => i[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Manage your personal details and account configurations
        </p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Avatar Area */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            {profileImage ? (
              <img
                src={profileImage}
                alt={name}
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-600 shadow-md shadow-indigo-600/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-600/20">
                {getInitials(name)}
              </div>
            )}
            <div className="text-center sm:text-left space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{name}</h3>
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <p className="text-xs text-slate-500">Avatar seeded from initials by default</p>
            </div>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FaUser size={14} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Currency
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FaCoins size={14} />
                  </span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Profile Image URL Mockup */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Profile Image URL (Optional)
              </label>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-indigo-600/10 transition duration-200 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FaSave size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
