const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');

async function seedSuperAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
      console.log('Super admin user already exists:');
      console.log(`  Username: ${existing.username}`);
      console.log(`  Email: ${existing.email}`);
      console.log('\nNo new user created.');
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);

    const superAdmin = await User.create({
      username: 'Yash24',
      email: 'yashradadiya1610@gmail.com',
      password: hashedPassword,
      role: 'Y@sh2411',
      organizationId: null,
    });

    console.log('=== Super Admin Created ===');
    console.log(`Username: Yash24`);
    console.log(`Email: yashradadiya1610@gmail.com`);
    console.log(`Password: Yash@2411`);
    console.log(`\nIMPORTANT: Change this password immediately after first login!`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
