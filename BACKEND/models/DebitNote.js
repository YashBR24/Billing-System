const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// Sub-schema: individual line item on the debit note
// ─────────────────────────────────────────────────────────────────────────────
const DebitNoteItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    hsnSacCode:  { type: String, required: true },
    quantity:    { type: Number, required: true, min: 0 },
    rate:        { type: Number, required: true, min: 0 },
    amount:      { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main schema
// ─────────────────────────────────────────────────────────────────────────────
const DebitNoteSchema = new mongoose.Schema({

  // ── Identification ──────────────────────────────────────────────────────────
  debitNoteNumber: {
    type:     String,
    required: true,
    unique:   true,
    trim:     true,
  },
  financialYear: {
    type:     String,
    required: true,
    trim:     true,
    // e.g. "2025-26"
  },
  debitNoteDate: {
    type:     Date,
    required: true,
    default:  Date.now,
  },

  // ── Reference to original purchase bill ─────────────────────────────────────
  originalPurchase: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Purchase',
    required: true,
  },
  originalPurchaseBillNumber: {
    type:     String,
    required: true,
    trim:     true,
  },

  // ── Supplier (the company we bought from) ───────────────────────────────────
  supplierCompany: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Company',
    required: true,
  },
  supplierDetailsSnapshot: {
    name:      String,
    address:   String,
    gstNumber: String,
  },

  // ── Return metadata ──────────────────────────────────────────────────────────
  returnReason: {
    type:     String,
    enum:     ['Defective', 'Wrong Item', 'Quality Issue', 'Supplier Request', 'Other'],
    required: true,
  },
  returnReasonNotes: {
    type:    String,
    trim:    true,
    default: '',
  },

  // ── Line items ───────────────────────────────────────────────────────────────
  items: [DebitNoteItemSchema],

  // ── Financial totals ─────────────────────────────────────────────────────────
  subTotalAmount: {
    type:     Number,
    required: true,
    default:  0,
  },
  discountPercentage: {
    type:    Number,
    default: 0,
    min:     0,
    max:     100,
  },
  discountAmount: {
    type:    Number,
    default: 0,
  },
  amountAfterDiscount: {
    type:    Number,
    default: 0,
  },

  // ── Tax ──────────────────────────────────────────────────────────────────────
  taxType: {
    type:     String,
    enum:     ['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'],
    required: true,
  },
  cgstPercentage:    { type: Number, default: 0 },
  cgstAmount:        { type: Number, default: 0 },
  sgstPercentage:    { type: Number, default: 0 },
  sgstAmount:        { type: Number, default: 0 },
  igstPercentage:    { type: Number, default: 0 },
  igstAmount:        { type: Number, default: 0 },
  jobCgstPercentage: { type: Number, default: 0 },
  jobCgstAmount:     { type: Number, default: 0 },
  jobSgstPercentage: { type: Number, default: 0 },
  jobSgstAmount:     { type: Number, default: 0 },
  totalTaxAmount:    { type: Number, default: 0 },

  totalAmount: {
    type:     Number,
    required: true,
    default:  0,
  },
  amountInWords: {
    type: String,
    trim: true,
  },

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['Pending', 'Processed', 'Cancelled'],
    default: 'Pending',
  },
  stockAdjusted: {
    type:    Boolean,
    default: false,
  },

  // ── Audit ─────────────────────────────────────────────────────────────────────
  createdBy: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────
DebitNoteSchema.index({ financialYear: 1 });
DebitNoteSchema.index({ supplierCompany: 1, financialYear: 1 });
DebitNoteSchema.index({ debitNoteDate: -1 });
DebitNoteSchema.index({ status: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save: recalculate all financial totals from raw inputs
// Mirrors the same hook in CreditNote.js so the DB is always consistent
// even if someone calls .save() directly without going through the controller.
// ─────────────────────────────────────────────────────────────────────────────
DebitNoteSchema.pre('save', async function (next) {
  const Settings = mongoose.model('Settings');
  const settings = await Settings.getSettings();

  // Sub-total from items
  this.subTotalAmount = parseFloat(
    this.items.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );

  // Discount
  this.discountAmount = parseFloat(
    ((this.subTotalAmount * this.discountPercentage) / 100).toFixed(2)
  );
  this.amountAfterDiscount = parseFloat(
    (this.subTotalAmount - this.discountAmount).toFixed(2)
  );

  // Reset tax buckets
  this.cgstAmount    = 0;
  this.sgstAmount    = 0;
  this.igstAmount    = 0;
  this.jobCgstAmount = 0;
  this.jobSgstAmount = 0;

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

  this.totalTaxAmount = parseFloat(
    (this.cgstAmount + this.sgstAmount + this.igstAmount + this.jobCgstAmount + this.jobSgstAmount).toFixed(2)
  );
  this.totalAmount = parseFloat(
    (this.amountAfterDiscount + this.totalTaxAmount).toFixed(2)
  );

  if (this.isModified()) {
    this.updatedAt = Date.now();
  }

  next();
});

module.exports = mongoose.model('DebitNote', DebitNoteSchema);