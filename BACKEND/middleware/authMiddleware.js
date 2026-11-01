const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('./logger');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        log('Authentication failed: User not found for token.', 'warn');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      log(`Authentication error: ${error.message}`, 'error');
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    log('Authentication failed: No token provided.', 'warn');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    log(`Authorization failed: User ${req.user ? req.user.email : 'Unknown'} is not an admin.`, 'warn');
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, isAdmin };