const Log = require('../models/Log');

const log = async (message, level = 'info') => {
  try {
    await Log.create({ message, level, timestamp: new Date() });
    console.log(`Log (${level}): ${message}`); // Optional: also log to console
  } catch (error) {
    console.error(`Failed to save log: ${error.message}`);
    // Fallback or further error handling if DB logging fails
  }
};

// Middleware function for logging requests (example)
const requestLogger = (req, res, next) => {
  log(`Request: ${req.method} ${req.originalUrl} - IP: ${req.ip}`, 'info');
  next();
};

module.exports = { log, requestLogger };