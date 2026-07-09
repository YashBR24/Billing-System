

const mongoose = require('mongoose');

// Sub-schema for Description, HSN/SAC, and Rate combinations
const ItemConfigSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  hsnSacCode: {
    type: String,
    required: true,
    trim: true,
  },
  defaultRate: { // Optional: if you want a default rate associated with this HSN/SAC
    type: Number,
    default: 0,
  }
}, {_id: true}); // Ensure _id is created for subdocuments for easier management

const SettingsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
  },
  sgstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  cgstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  igstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  jobCgstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  jobSgstPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  itemConfigurations: [ItemConfigSchema], // Array for multiple description/HSN combinations
  // Add other global settings here if needed in the future
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure `updatedAt` is set on update
SettingsSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Method to get or create the settings document
SettingsSchema.statics.getSettings = async function(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required to get settings');
  }
  let settings = await this.findOne({ organizationId });
  if (!settings) {
    settings = await this.create({
      organizationId,
      sgstPercentage: 6,
      cgstPercentage: 6,
      igstPercentage: 12,
      jobCgstPercentage: 2.5,
      jobSgstPercentage: 2.5,
      itemConfigurations: []
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);