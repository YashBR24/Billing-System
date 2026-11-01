const mongoose = require('mongoose');

const BoxDetailSchema = new mongoose.Schema({
  boxNumber: { type: String, required: true, trim: true },
  netWeight: { type: Number, required: true, min: 0 },
  cops: { type: Number, required: true, min: 0 },
}, { _id: true });

const ChallanSchema = new mongoose.Schema({
  challanNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  financialYear: {
  type: String,
  required: true,
  index: true
},
  challanDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  companyDetailsSnapshot: {
    name: String,
    address: String,
    gstNumber: String,
  },
  descriptionOfGoods: {
    type: String,
    required: true,
    trim: true,
  },
  broker: {
    type: String,
    trim: true,
    default: 'direct',
  },
  withCops: {
    type: Boolean,
    default: true,
  },
  boxDetails: [BoxDetailSchema],
  totalNetWeight: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCops: {
    type: Number,
    required: true,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    default: null,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to calculate totals, set isUsed, and update updatedAt
ChallanSchema.pre('save', function(next) {
  this.totalNetWeight = this.boxDetails.reduce((acc, box) => acc + box.netWeight, 0);
  this.totalNetWeight = parseFloat(this.totalNetWeight.toFixed(2));
  this.totalCops = this.boxDetails.reduce((acc, box) => acc + box.cops, 0);
  this.isUsed = !!this.bill; // Set isUsed based on whether bill is set
  this.updatedAt = Date.now();
  next();
});


module.exports = mongoose.model('Challan', ChallanSchema);