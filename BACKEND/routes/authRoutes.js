const express = require('express');
const router = express.Router();
const { signup, login, getAllUsers } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/auth/signup
// @desc    Register a new user (admin)
// @access  Public
router.post('/signup', signup);

// @route   POST /api/auth/login
// @desc    Authenticate admin user & get token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, isAdmin, getAllUsers);

module.exports = router;