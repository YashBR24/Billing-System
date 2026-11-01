const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  sequenceValue: {
    type: Number,
    required: true,
    default: 0,
  },
  description: {
    type: String,
    required: true,
    sparse: true,
  },
  financialYear: {
    type: String,
    required: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

CounterSchema.index({ description: 1, financialYear: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Counter', CounterSchema);
