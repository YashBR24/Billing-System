const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Box = require('../models/Box');
    const Counter = require('../models/Counter');

    const boxes = await Box.find({}).sort({ displayNumber: -1 });
    const grouped = {};
    
    boxes.forEach(box => {
      const key = `${box.descriptionOfGoods}_${box.financialYear}`;
      if (!grouped[key]) {
        grouped[key] = { description: box.descriptionOfGoods, financialYear: box.financialYear, maxDisplay: 0 };
      }
      if (box.displayNumber > grouped[key].maxDisplay) {
        grouped[key].maxDisplay = box.displayNumber;
      }
    });

    console.log('Syncing counters to match existing boxes...\n');
    
    for (const [key, data] of Object.entries(grouped)) {
      const existing = await Counter.findById(key);
      if (existing) {
        if (existing.sequenceValue < data.maxDisplay) {
          existing.sequenceValue = data.maxDisplay;
          await existing.save();
          console.log(`  Updated ${key}: ${existing.sequenceValue} -> ${data.maxDisplay}`);
        } else {
          console.log(`  OK ${key}: counter=${existing.sequenceValue}, maxBox=${data.maxDisplay}`);
        }
      } else {
        await Counter.create({
          _id: key,
          description: data.description,
          financialYear: data.financialYear,
          sequenceValue: data.maxDisplay,
        });
        console.log(`  Created ${key}: seq=${data.maxDisplay}`);
      }
    }

    if (Object.keys(grouped).length === 0) {
      console.log('  No unused boxes found. Counters will start from 1 on next create.');
    }

    const allCounters = await Counter.find();
    console.log('\nFinal counters:');
    allCounters.forEach(c => console.log(`  ${c._id} => seq: ${c.sequenceValue}`));

    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
