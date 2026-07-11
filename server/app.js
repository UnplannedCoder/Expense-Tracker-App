const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const imageRoutes = require('./routes/imageRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '10mb' })); // 10mb for base64 image uploads

// Enable CORS for frontend client
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    database: 'Connected',
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/image', imageRoutes);

// Error Handler Middleware
app.use(errorHandler);

module.exports = app;
