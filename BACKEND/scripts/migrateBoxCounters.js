const mongoose = require('mongoose');
const Box = require('./models/Box');
const Counter = require('./models/Counter');

require('dotenv').config();

const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

async function migrateExistingBoxes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MBS');
    console.log('Connected successfully');

    const boxes = await Box.find({}).sort({ createdAt: 1 });
    console.log(`Found ${boxes.length} existing boxes to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const box of boxes) {
      const fy = box.financialYear || getFinancialYear(box.createdAt);
      const desc = box.descriptionOfGoods;
      const counterId = `${desc}_${fy}`;

      let counter = await Counter.findById(counterId);
      if (!counter) {
        counter = new Counter({
          _id: counterId,
          sequenceValue: 0,
          description: desc,
          financialYear: fy,
        });
        await counter.save();
        console.log(`Created counter: ${counterId}`);
      }

      counter.sequenceValue += 1;
      await counter.save();

      const displayNumber = counter.sequenceValue;

      if (box.financialYear !== fy || box.displayNumber !== displayNumber) {
        box.financialYear = fy;
        box.displayNumber = displayNumber;
        await box.save();
        console.log(`Migrated box ${box.boxNumber}: FY=${fy}, displayNumber=${displayNumber}`);
        migrated++;
      } else {
        skipped++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped (already correct): ${skipped}`);

    const counters = await Counter.find({}).sort({ _id: 1 });
    console.log('\nCounter summary:');
    counters.forEach(c => {
      console.log(`  ${c._id} -> sequenceValue: ${c.sequenceValue}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateExistingBoxes();
