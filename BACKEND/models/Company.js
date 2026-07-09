// const mongoose = require('mongoose');

// const CompanySchema = new mongoose.Schema({
//   organizationId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Organization',
//     required: false,
//     index: true,
//   },
//   name: {
//     type: String,
//     required: [true, 'Please add a company name'],
//     trim: true,
//     unique: false, // Assuming company names should be unique
//   },
//   address: {
//     type: String,
//     required: [true, 'Please add an address'],
//   },
//   gstNumber: {
//     type: String,
//     required: [true, 'Please add a GST number'],
//     trim: false,
//     match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please add a valid GST number'],
//     unique: false,
//   },
//   mobileNumber: {
//     type: String,
//     required: false,
//     // Basic mobile number validation (10 digits)
//     match: [/^\d{10}$/, 'Please add a valid 10-digit mobile number'],
//   },
//   companyType: {
//     type: String,
//     enum: ['Buyer', 'Seller', 'Both'],
//     required: [true, 'Please specify the company type (Buyer, Seller, Both)']
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   }
// });

// // Update `updatedAt` field before saving
// CompanySchema.pre('save', function(next) {
//   if (this.isModified()) {
//     this.updatedAt = Date.now();
//   }
//   next();
// });

// module.exports = mongoose.model('Company', CompanySchema);

const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
    unique: false,
  },
  address: {
    type: String,
    required: [true, 'Please add an address'],
  },
  gstNumber: {
    type: String,
    required: [true, 'Please add a GST number'],
    trim: false,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please add a valid GST number'],
    unique: false,
  },
  mobileNumber: {
    type: String,
    required: false,
    match: [/^\d{10}$/, 'Please add a valid 10-digit mobile number'],
  },
  companyType: {
    type: String,
    enum: ['Buyer', 'Seller', 'Both'],
    required: [true, 'Please specify the company type (Buyer, Seller, Both)']
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

CompanySchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Company', CompanySchema);