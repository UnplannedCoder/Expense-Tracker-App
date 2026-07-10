const Category = require('../models/Category');

// @desc    Get all categories (default + custom)
// @route   GET /api/v1/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { userId: null }],
    });

    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom category
// @route   POST /api/v1/categories
// @access  Private
const createCategory = async (req, res, next) => {
  try {
    const { name, type, color, icon } = req.body;

    if (!name || !type) {
      res.status(400);
      throw new Error('Please enter category name and type');
    }

    // Check if category name already exists for this user of the same type
    const categoryExists = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
    });

    if (categoryExists) {
      res.status(400);
      throw new Error('Category already exists');
    }

    const category = await Category.create({
      userId: req.user._id,
      name,
      type,
      color: color || '#cbd5e1',
      icon: icon || 'FaTag',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a custom category
// @route   PUT /api/v1/categories/:id
// @access  Private
const updateCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;

    let category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id, // Ensure user can only update their own categories
    });

    if (!category) {
      res.status(404);
      throw new Error('Category not found or unauthorized to edit default categories');
    }

    category.name = name || category.name;
    category.color = color || category.color;
    category.icon = icon || category.icon;

    const updatedCategory = await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a custom category
// @route   DELETE /api/v1/categories/:id
// @access  Private
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id, // Ensure user can only delete their own categories
    });

    if (!category) {
      res.status(404);
      throw new Error('Category not found or unauthorized to delete default categories');
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
