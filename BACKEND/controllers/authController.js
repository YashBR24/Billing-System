const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { log } = require('../middleware/logger');

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (can be restricted to admin creation later)
// @route   POST /api/auth/signup
// @access  Public (for initial admin setup, then restrict)
const    signup = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // For initial setup, allow creating an admin user.
    // In a production scenario, you might have a separate script or a first-user-is-admin logic.
    const userExists = await User.findOne({ email });

    if (userExists) {
      log(`Signup attempt failed: Email already exists - ${email}`, 'warn');
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'admin', // Default to admin for now, or pass 'admin' in request
    });

    if (user) {
      log(`User registered successfully: ${user.email} with role ${user.role}`, 'info');
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      log('Signup failed: Invalid user data', 'error');
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    log(`Signup error: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// @desc    Authenticate user & get token (Admin Login)
// @route   POST /api/auth/login
// @access  Public
const    login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      log(`Login attempt failed: User not found - ${email}`, 'warn');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      log(`Login attempt failed: Incorrect password for - ${email}`, 'warn');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      log(`Login attempt failed: Non-admin user tried to login - ${email}`, 'warn');
      return res.status(403).json({ message: 'Access denied. Only admins can login.' });
    }

    log(`Admin user logged in successfully: ${user.email}`, 'info');
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });

  } catch (error) {
    log(`Login error: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const    getAllUsers = async (req, res) => {
  try {
    // Ensure only admin can access this - this should be enforced by middleware on the route
    const users = await User.find({}).select('-password'); // Exclude passwords
    log(`Admin ${req.user.email} fetched all users.`, 'info');
    res.json(users);
  } catch (error) {
    log(`Error fetching all users: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers
};