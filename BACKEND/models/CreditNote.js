const mongoose = require('mongoose');

const CreditNoteItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hsnSacCode: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: true });

const CreditNoteSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true,
  },
  creditNoteNumber: {
    type: String,
    required: true,
    trim: true,
  },
  creditNoteDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  // Reference to original bill
  originalBill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true,
  },
  originalBillNumber: {
    type: String,
    required: true,
    trim: true,
  },
  // Reference to challan if exists
  challan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan',
    default: null,
  },
  challanNumber: {
    type: String,
    trim: true,
    default: '',
  },
  // Buyer (main company)
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
  // Consignee (if different from buyer)
  isConsigneeDifferent: {
    type: Boolean,
    default: false,
  },
  consignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
  consigneeDetailsSnapshot: {
    name: String,
    address: String,
    gstNumber: String,
    stateCode: String,
  },
  // Return reason
  returnReason: {
    type: String,
    enum: ['Defective', 'Wrong Item', 'Quality Issue', 'Customer Request', 'Other'],
    required: true,
  },
  returnReasonNotes: {
    type: String,
    trim: true,
    default: '',
  },
  items: [CreditNoteItemSchema],
  subTotalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  amountAfterDiscount: {
    type: Number,
    default: 0,
  },
  taxType: {
    type: String,
    enum: ['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'],
    required: true,
  },
  cgstPercentage: {
    type: Number,
    default: 0,
  },
  cgstAmount: {
    type: Number,
    default: 0,
  },
  sgstPercentage: {
    type: Number,
    default: 0,
  },
  sgstAmount: {
    type: Number,
    default: 0,
  },
  igstPercentage: {
    type: Number,
    default: 0,
  },
  igstAmount: {
    type: Number,
    default: 0,
  },
  jobCgstPercentage: {
    type: Number,
    default: 0,
  },
  jobCgstAmount: {
    type: Number,
    default: 0,
  },
  jobSgstPercentage: {
    type: Number,
    default: 0,
  },
  jobSgstAmount: {
    type: Number,
    default: 0,
  },
  totalTaxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  amountInWords: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processed', 'Cancelled'],
    default: 'Pending',
  },
  // Track if stock has been adjusted
  stockAdjusted: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  excelFilePath: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to calculate taxes and amounts
CreditNoteSchema.pre('save', async function(next) {
  const Settings = mongoose.model('Settings');
  const settings = await Settings.getSettings(this.organizationId);

  // Calculate subTotalAmount from items
  this.subTotalAmount = this.items.reduce((acc, item) => acc + item.amount, 0);
  this.subTotalAmount = parseFloat(this.subTotalAmount.toFixed(2));

  // Calculate discount
  this.discountAmount = (this.subTotalAmount * this.discountPercentage) / 100;
  this.discountAmount = parseFloat(this.discountAmount.toFixed(2));
  this.amountAfterDiscount = this.subTotalAmount - this.discountAmount;
  this.amountAfterDiscount = parseFloat(this.amountAfterDiscount.toFixed(2));

  // Reset tax amounts
  this.cgstAmount = 0;
  this.sgstAmount = 0;
  this.igstAmount = 0;
  this.jobCgstAmount = 0;
  this.jobSgstAmount = 0;

  // Apply tax based on taxType
  if (this.taxType === 'CGST_SGST') {
    this.cgstPercentage = this.cgstPercentage || settings.cgstPercentage;
    this.sgstPercentage = this.sgstPercentage || settings.sgstPercentage;
    this.cgstAmount = (this.amountAfterDiscount * this.cgstPercentage) / 100;
    this.sgstAmount = (this.amountAfterDiscount * this.sgstPercentage) / 100;
  } else if (this.taxType === 'IGST') {
    this.igstPercentage = this.igstPercentage || settings.igstPercentage;
    this.igstAmount = (this.amountAfterDiscount * this.igstPercentage) / 100;
  } else if (this.taxType === 'JOBCGST_JOBSGST') {
    this.jobCgstPercentage = this.jobCgstPercentage || settings.jobCgstPercentage;
    this.jobSgstPercentage = this.jobSgstPercentage || settings.jobSgstPercentage;
    this.jobCgstAmount = (this.amountAfterDiscount * this.jobCgstPercentage) / 100;
    this.jobSgstAmount = (this.amountAfterDiscount * this.jobSgstPercentage) / 100;
  }

  // Calculate total tax amount
  this.totalTaxAmount = this.cgstAmount + this.sgstAmount + this.igstAmount + this.jobCgstAmount + this.jobSgstAmount;
  this.totalTaxAmount = parseFloat(this.totalTaxAmount.toFixed(2));

  // Calculate total amount
  this.totalAmount = this.amountAfterDiscount + this.totalTaxAmount;
  this.totalAmount = parseFloat(this.totalAmount.toFixed(2));

  // Update updatedAt
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }

  next();
});

CreditNoteSchema.index({ organizationId: 1, creditNoteNumber: 1 }, { unique: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);