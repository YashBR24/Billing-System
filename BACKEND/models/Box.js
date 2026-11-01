const mongoose = require('mongoose');
const Settings = require('./Settings');

const BoxSchema = new mongoose.Schema({
  boxNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayNumber: {
    type: Number,
    required: true,
    default: 1,
  },
  descriptionOfGoods: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: async function(value) {
        const settings = await Settings.getSettings();
        return settings.itemConfigurations.some(
          item => item.description === value
        );
      },
      message: 'Description must be from predefined settings'
    }
  },
  grossWeight: {
    type: Number,
    required: true,
    min: 0,
  },
  tareWeight: {
    type: Number,
    required: true,
    min: 0,
  },
  netWeight: {
    type: Number,
    required: true,
    min: 0,
  },
  cops: {
    type: Number,
    required: true,
    min: 0,
  },
  copsWeight: {
    type: Number,
    min: 0,
    default: 0,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  financialYear: {
    type: String,
    index: true,
  },
});

function computeFYLabel(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) {
    const nextYY = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYY}`;
  } else {
    const prev = year - 1;
    const nextYY = String(year % 100).padStart(2, '0');
    return `${prev}-${nextYY}`;
  }
}

BoxSchema.pre('save', function(next) {
  this.netWeight = this.grossWeight - this.tareWeight;
  this.netWeight = parseFloat(this.netWeight.toFixed(2));
  this.updatedAt = Date.now();
  if (!this.financialYear) {
    this.financialYear = computeFYLabel(this.createdAt || new Date());
  }
  next();
});

BoxSchema.index({ descriptionOfGoods: 1, isUsed: 1 });
BoxSchema.index({ boxNumber: 1 }, { unique: true });
BoxSchema.index({ financialYear: 1, descriptionOfGoods: 1, displayNumber: 1 });
BoxSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Box', BoxSchema);
