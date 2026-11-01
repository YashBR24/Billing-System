const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Box = require('../models/Box');
    const Counter = require('../models/Counter');

    const boxes = await Box.find().sort({ createdAt: 1 });
    console.log('Existing boxes:');
    boxes.forEach(b => console.log(`  ${b.boxNumber} | ${b.descriptionOfGoods} | displayNum: ${b.displayNumber} | FY: ${b.financialYear}`));

    const counters = await Counter.find();
    console.log('\nExisting counters:');
    counters.forEach(c => console.log(`  ${c._id} => seq: ${c.sequenceValue}`));

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
