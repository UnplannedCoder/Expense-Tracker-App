const dns = require('dns');
const mongoose = require('mongoose');

// Force Node to use public DNS servers for MongoDB SRV lookups.
// This helps when the local DNS resolver is refusing MongoDB queries.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/expense-tracker';

  console.log('Mongo URI:', mongoUri);

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;