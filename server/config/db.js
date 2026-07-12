const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense-tracker';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }

    console.warn('Continuing without MongoDB connection for development startup.');
  }
};

module.exports = connectDB;
