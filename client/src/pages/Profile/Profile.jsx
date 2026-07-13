import React, { useState, useContext, useEffect, useRef } from 'react';
import { FaUser, FaSave, FaCoins, FaUpload, FaCamera, FaTimes, FaLink } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import fileToBase64 from '../../utils/fileToBase64';

const MAX_PROFILE_IMAGE_MB = 2;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const Profile = () => {
  const { user, updateProfile, error, clearError, loading } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [profileImage, setProfileImage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCurrency(user.currency || 'USD');
      setProfileImage(user.profileImage || '');
      setShowUrlInput(Boolean(user.profileImage && !user.profileImage.startsWith('data:')));
    }
  }, [user]);

  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  const handleImageFile = async (file) => {
    if (!file) return;

    setFormError('');
    clearError();

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_MB * 1024 * 1024) {
      setFormError(`Image is too large. Please use a file under ${MAX_PROFILE_IMAGE_MB}MB.`);
      return;
    }

    setImageUploading(true);
    try {
      const dataUrl = await fileToBase64(file);
      setProfileImage(dataUrl);
      setShowUrlInput(false);
    } catch {
      setFormError('Failed to read the image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setProfileImage('');
    setShowUrlInput(false);
    setFormError('');
  };

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Manage your personal details and account configurations
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              className="relative group shrink-0"
              title="Click to change photo"
            >
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
              <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <FaCamera className="text-white" size={20} />
              </span>
            </button>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{name}</h3>
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <p className="text-xs text-slate-500">
                {profileImage ? 'Click avatar to change photo' : 'Upload a photo or use initials'}
              </p>
            </div>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition"
                    required
                  />
                </div>
              </div>

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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Profile Photo
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading || loading}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FaUpload size={14} />
                    )}
                    <span>{imageUploading ? 'Processing...' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={imageUploading || loading}
                    className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    <FaCamera size={14} />
                    <span>Take Photo</span>
                  </button>

                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={loading}
                      className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                    >
                      <FaTimes size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <p className="text-center text-xs text-slate-500">
                  JPEG, PNG, WebP, or GIF — max {MAX_PROFILE_IMAGE_MB}MB
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-indigo-500 transition"
                >
                  <FaLink size={12} />
                  <span>{showUrlInput ? 'Hide image URL' : 'Use image URL instead'}</span>
                </button>

                {showUrlInput && (
                  <input
                    type="url"
                    value={profileImage.startsWith('data:') ? '' : profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                  />
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading || imageUploading}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-indigo-600/10 transition duration-200 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
