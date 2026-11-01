const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Counter = require('../models/Counter');
    const deleted = await Counter.deleteMany({ description: null });
    console.log(`Cleaned up ${deleted.deletedCount} corrupt counter document(s)`);

    const all = await Counter.find();
    console.log('Remaining counters:');
    all.forEach(c => console.log(`  ${c._id} => seq: ${c.sequenceValue}`));

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
