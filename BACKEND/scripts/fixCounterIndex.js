const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;

    const countersIndexes = await db.collection('counters').indexes();
    console.log('Current counters indexes:');
    countersIndexes.forEach(idx => console.log(`  ${JSON.stringify(idx.key)} (unique: ${idx.unique}, sparse: ${idx.sparse})`));

    await db.collection('counters').dropIndex('description_1_financialYear_1');
    console.log('Dropped old counters index');

    await db.collection('counters').createIndex({ description: 1, financialYear: 1 }, { unique: true, sparse: true });
    console.log('Created new sparse counters index');

    const deleted = await db.collection('counters').deleteMany({ description: null });
    console.log(`Cleaned ${deleted.deletedCount} corrupt counter document(s)`);

    const boxesIndexes = await db.collection('boxes').indexes();
    console.log('\nCurrent boxes indexes:');
    boxesIndexes.forEach(idx => console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`));

    const allCounters = await db.collection('counters').find().toArray();
    console.log('\nRemaining counters:');
    allCounters.forEach(c => console.log(`  ${c._id} => seq: ${c.sequenceValue}`));

    console.log('\nDone! Restart your server.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
