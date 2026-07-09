const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  shortName: {
    type: String,
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  gstin: {
    type: String,
    trim: true,
  },
  pan: {
    type: String,
    trim: true,
  },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    branch: { type: String, default: '' },
  },
  contact: {
    personName: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  businessType: {
    type: String,
    enum: ['yarn', 'jari'],
    default: 'yarn',
  },
  terminology: {
    copsLabel: { type: String, default: 'Cops' },
    boxesLabel: { type: String, default: 'Boxes' },
  },
  logo: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Organization', OrganizationSchema);
