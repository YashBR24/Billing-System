const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  switchOrganization,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUsersByOrganization,
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { superAdminGuard } = require('../middleware/superAdminGuard');

router.post('/signup', signup);
router.post('/login', login);
router.post('/switch-organization', protect, switchOrganization);

router.get('/users', protect, isAdmin, getAllUsers);
router.get('/users/by-org', protect, superAdminGuard, getUsersByOrganization);
router.post('/users', protect, superAdminGuard, createUser);
router.put('/users/:id', protect, superAdminGuard, updateUser);
router.delete('/users/:id', protect, superAdminGuard, deleteUser);

module.exports = router;
