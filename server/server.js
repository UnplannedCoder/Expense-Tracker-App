require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const normalizePort = (value) => {
  const rawValue = String(value || '').trim();
  const parsed = rawValue.match(/(\d{1,5})/);
  return parsed ? Number(parsed[1]) : 5000;
};

const PORT = normalizePort(process.env.PORT);

// Connect to MongoDB Database
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the conflicting process and try again.`);
      process.exit(1);
    }

    console.error('Server startup error:', error);
    process.exit(1);
  });
});
