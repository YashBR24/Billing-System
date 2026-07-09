require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const u = await User.findOne({ role: 'superadmin' }).select('+password');
  if (!u) {
    console.log('No superadmin found. Creating one...');
    const hash = await bcrypt.hash('SuperAdmin@123', 10);
    await User.create({
      username: 'superadmin',
      email: 'superadmin@billing.com',
      password: hash,
      role: 'superadmin',
      organizationId: null,
    });
    console.log('Superadmin created with password: SuperAdmin@123');
  } else {
    console.log('Superadmin found:', u.email);
    const match = await u.matchPassword('SuperAdmin@123');
    console.log('Password match:', match);
    if (!match) {
      const newHash = await bcrypt.hash('SuperAdmin@123', 10);
      u.password = newHash;
      await u.save();
      console.log('Password reset to: SuperAdmin@123');
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

resetPassword().catch(err => { console.error(err); process.exit(1); });
