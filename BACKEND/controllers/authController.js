const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { log } = require('../middleware/logger');

const generateToken = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const signup = async (req, res) => {
  const { username, email, password, role, organizationId } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      log(`Signup attempt failed: Email already exists - ${email}`, 'warn');
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'admin',
      organizationId: organizationId || null,
    });

    if (user) {
      log(`User registered successfully: ${user.email} with role ${user.role}`, 'info');
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken({ id: user._id, role: user.role }, '30d'),
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

const login = async (req, res) => {
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

    if (user.role === 'superadmin') {
      const limitedToken = generateToken(
        {
          id: user._id,
          role: 'superadmin',
          organizationId: null,
          contextSet: false,
        },
        '1h'
      );

      log(`Super admin logged in: ${user.email}`, 'info');
      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: limitedToken,
        needsOrgSelection: true,
      });
    }

    if (!user.organizationId) {
      log(`Login attempt failed: User not assigned to organization - ${email}`, 'warn');
      return res.status(403).json({ message: 'User not assigned to any organization' });
    }

    const org = await Organization.findById(user.organizationId);
    if (!org || !org.isActive) {
      log(`Login attempt failed: Organization not active - ${email}`, 'warn');
      return res.status(403).json({ message: 'Your organization is not active. Contact admin.' });
    }

    const fullToken = generateToken(
      {
        id: user._id,
        role: user.role,
        organizationId: org._id,
        organizationName: org.name,
        organizationShortName: org.shortName,
        terminology: org.terminology,
        businessType: org.businessType,
        logo: org.logo,
        contextSet: true,
      },
      '8h'
    );

    log(`User logged in: ${user.email} -> ${org.name}`, 'info');
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: fullToken,
      organization: {
        id: org._id,
        name: org.name,
        shortName: org.shortName,
        terminology: org.terminology,
        businessType: org.businessType,
        logo: org.logo,
      },
      needsOrgSelection: false,
    });
  } catch (error) {
    log(`Login error: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error during login' });
  }
};

const switchOrganization = async (req, res) => {
  const { organizationId } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }
    if (!org.isActive) {
      return res.status(400).json({ message: 'Organization is not active.' });
    }

    const scopedToken = generateToken(
      {
        id: user._id,
        role: 'admin',
        organizationId: org._id,
        organizationName: org.name,
        organizationShortName: org.shortName,
        terminology: org.terminology,
        businessType: org.businessType,
        logo: org.logo,
        contextSet: true,
        isSuperAdminContext: true,
      },
      '8h'
    );

    log(`Super admin ${user.email} switched to ${org.name}`, 'info');
    res.json({
      token: scopedToken,
      organization: {
        id: org._id,
        name: org.name,
        shortName: org.shortName,
        terminology: org.terminology,
        businessType: org.businessType,
        logo: org.logo,
      },
    });
  } catch (error) {
    log(`Switch organization error: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while switching organization.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    log(`Admin ${req.user.email} fetched all users.`, 'info');
    res.json(users);
  } catch (error) {
    log(`Error fetching all users: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role, organizationId } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'user',
      organizationId: organizationId || null,
    });

    const userObj = await User.findById(user._id).select('-password').populate('organizationId', 'name');
    res.status(201).json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating user' });
  }
};

const updateUser = async (req, res) => {
  const { role, organizationId, username } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (role) user.role = role;
    if (organizationId !== undefined) {
      if (organizationId) {
        const org = await Organization.findById(organizationId);
        if (!org) {
          return res.status(404).json({ message: 'Organization not found' });
        }
      }
      user.organizationId = organizationId || null;
    }

    const updatedUser = await user.save();
    const userObj = await User.findById(updatedUser._id).select('-password').populate('organizationId', 'name');
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

const getUsersByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const query = {};
    if (organizationId) query.organizationId = organizationId;

    const users = await User.find(query).select('-password').populate('organizationId', 'name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

module.exports = {
  signup,
  login,
  switchOrganization,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUsersByOrganization,
};
