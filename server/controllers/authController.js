const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please add all required fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      currency: currency || 'USD',
    });

    if (user) {
      // Seed default categories for this user if we want them in database
      // Alternatively, we can let default categories query return global ones.
      // But seeding is also fine. Let's seed default categories.
      const defaultIncomeCategories = [
        { name: 'Salary', type: 'income', color: '#10b981', icon: 'FaWallet' },
        { name: 'Freelance', type: 'income', color: '#3b82f6', icon: 'FaLaptopCode' },
        { name: 'Investment', type: 'income', color: '#8b5cf6', icon: 'FaChartLine' },
        { name: 'Business', type: 'income', color: '#f59e0b', icon: 'FaBriefcase' },
        { name: 'Gift', type: 'income', color: '#ec4899', icon: 'FaGift' },
      ];

      const defaultExpenseCategories = [
        { name: 'Food', type: 'expense', color: '#ef4444', icon: 'FaUtensils' },
        { name: 'Grocery', type: 'expense', color: '#10b981', icon: 'FaShoppingCart' },
        { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'FaShoppingBag' },
        { name: 'Transport', type: 'expense', color: '#3b82f6', icon: 'FaBus' },
        { name: 'Fuel', type: 'expense', color: '#f59e0b', icon: 'FaGasPump' },
        { name: 'Bills', type: 'expense', color: '#eab308', icon: 'FaFileInvoiceDollar' },
        { name: 'Healthcare', type: 'expense', color: '#06b6d4', icon: 'FaHeartbeat' },
        { name: 'Education', type: 'expense', color: '#6366f1', icon: 'FaGraduationCap' },
        { name: 'Entertainment', type: 'expense', color: '#8b5cf6', icon: 'FaFilm' },
        { name: 'Travel', type: 'expense', color: '#14b8a6', icon: 'FaPlane' },
        { name: 'Rent', type: 'expense', color: '#f97316', icon: 'FaHome' },
        { name: 'Subscription', type: 'expense', color: '#a855f7', icon: 'FaTv' },
        { name: 'Others', type: 'expense', color: '#6b7280', icon: 'FaCoins' },
      ];

      const categoriesToCreate = [
        ...defaultIncomeCategories,
        ...defaultExpenseCategories,
      ].map((cat) => ({ ...cat, userId: user._id }));

      await Category.insertMany(categoriesToCreate);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          profileImage: user.profileImage,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          profileImage: user.profileImage,
        },
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.currency = req.body.currency || user.currency;

      if (req.body.profileImage !== undefined) {
        const profileImage = req.body.profileImage;

        if (profileImage.startsWith('data:')) {
          const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          const mime = profileImage.match(/data:([^;]+)/)?.[1];
          if (mime && !allowedMimes.includes(mime)) {
            res.status(400);
            throw new Error('Invalid image format. Use JPEG, PNG, WebP, or GIF.');
          }

          const base64Part = profileImage.split(',')[1];
          if (base64Part) {
            const sizeInBytes = Buffer.byteLength(base64Part, 'base64');
            const maxSize = 2 * 1024 * 1024;
            if (sizeInBytes > maxSize) {
              res.status(400);
              throw new Error('Profile image is too large. Maximum size is 2MB.');
            }
          }
        }

        user.profileImage = profileImage;
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          currency: updatedUser.currency,
          profileImage: updatedUser.profileImage,
          token: generateToken(updatedUser._id),
        },
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/v1/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please enter both current and new password');
    }

    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } else {
      res.status(401);
      throw new Error('Incorrect current password');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
