// const Log = require('../models/Log');

// const log = async (message, level = 'info') => {
//   try {
//     await Log.create({ message, level, timestamp: new Date() });
//     console.log(`Log (${level}): ${message}`); // Optional: also log to console
//   } catch (error) {
//     console.error(`Failed to save log: ${error.message}`);
//     // Fallback or further error handling if DB logging fails
//   }
// };

// // Middleware function for logging requests (example)
// const requestLogger = (req, res, next) => {
//   log(`Request: ${req.method} ${req.originalUrl} - IP: ${req.ip}`, 'info');
//   next();
// };

// module.exports = { log, requestLogger };


const Log = require('../models/Log');

const SAVE_TO_DB = process.env.SAVE_LOGS_TO_DB === 'true';

const log = async (message, level = 'info') => {
  if (SAVE_TO_DB) { // ← THIS was missing
    try {
      await Log.create({ message, level, timestamp: new Date() });
    } catch (error) {
      console.error(`Failed to save log: ${error.message}`);
    }
  }
  console.log(`[${new Date().toISOString()}] (${level}): ${message}`);
};

const requestLogger = (req, res, next) => {
  log(`Request: ${req.method} ${req.originalUrl} - IP: ${req.ip}`, 'info');
  next();
};

module.exports = { log, requestLogger };