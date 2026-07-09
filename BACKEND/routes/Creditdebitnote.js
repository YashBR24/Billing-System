const mongoose = require('mongoose');

// ─── Item Sub-Schema ────────────────────────────────────────────────────────

const NoteItemSchema = new mongoose.Schema(
  {
    description:  { type: String, required: true, trim: true },
    hsnSacCode:   { type: String, required: true, trim: true },
    quantity:     { type: Number, required: true, min: 0 },
    rate:         { type: Number, required: true, min: 0 },
    amount:       { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

// ─── Main Schema ────────────────────────────────────────────────────────────

const CreditDebitNoteSchema = new mongoose.Schema(
  {
    // "credit" = Sales Return  |  "debit" = Purchase Return
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    noteNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    noteDate: {
      type: Date,
      default: Date.now,
    },

    // ── Bill Reference ──────────────────────────────────────────────────────
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
    },
    manualBillNo: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Company (buyer / consignee for sales; supplier for purchases) ───────
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    companySnapshot: {
      name:      { type: String },
      address:   { type: String },
      gstNumber: { type: String },
    },

    // ── Return Reason ───────────────────────────────────────────────────────
    reason: {
      type: String,
      enum: ['Defective', 'Wrong Item', 'Quality Issue', 'Customer Request', 'Other'],
      required: true,
    },
    reasonNotes: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Line Items ──────────────────────────────────────────────────────────
    items: {
      type: [NoteItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one item is required.',
      },
    },

    // ── Amounts ─────────────────────────────────────────────────────────────
    subTotal:          { type: Number, default: 0 },
    discountPercent:   { type: Number, default: 0, min: 0, max: 100 },
    discountAmount:    { type: Number, default: 0 },
    amountAfterDiscount: { type: Number, default: 0 },

    // ── GST ─────────────────────────────────────────────────────────────────
    taxType: {
      type: String,
      enum: ['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'],
      required: true,
    },

    cgst:       { percent: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    sgst:       { percent: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    igst:       { percent: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    jobCgst:    { percent: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    jobSgst:    { percent: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },

    totalTaxAmount: { type: Number, default: 0 },
    totalAmount:    { type: Number, required: true, default: 0 },

    // ── Status ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['Pending', 'Processed', 'Cancelled'],
      default: 'Pending',
    },

    // ── Audit ────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,         // createdAt + updatedAt handled by Mongoose
    versionKey: false,
  }
);

// ─── Compound Indexes ────────────────────────────────────────────────────────

// Prevent duplicate note for the same bill + type combination
CreditDebitNoteSchema.index({ bill: 1, type: 1 }, { unique: true });

// Fast lookups by company or manual bill number
CreditDebitNoteSchema.index({ company: 1, type: 1 });
CreditDebitNoteSchema.index({ manualBillNo: 1 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Re-calculates all monetary fields from the current items array and
 * the bill's discount / tax rates. Call before save.
 */
CreditDebitNoteSchema.methods.recalculate = function (billData) {
  // --- line items ---
  this.subTotal = 0;
  this.items.forEach((item) => {
    item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
    this.subTotal += item.amount;
  });
  this.subTotal = parseFloat(this.subTotal.toFixed(2));

  // --- discount ---
  this.discountPercent   = billData.discountPercentage || 0;
  this.discountAmount    = parseFloat(((this.subTotal * this.discountPercent) / 100).toFixed(2));
  this.amountAfterDiscount = parseFloat((this.subTotal - this.discountAmount).toFixed(2));

  // --- reset ---
  this.cgst.amount = this.sgst.amount = this.igst.amount = 0;
  this.jobCgst.amount = this.jobSgst.amount = 0;

  const base = this.amountAfterDiscount;

  if (this.taxType === 'CGST_SGST') {
    this.cgst.percent  = billData.cgstPercentage  || 0;
    this.sgst.percent  = billData.sgstPercentage  || 0;
    this.cgst.amount   = parseFloat(((base * this.cgst.percent)  / 100).toFixed(2));
    this.sgst.amount   = parseFloat(((base * this.sgst.percent)  / 100).toFixed(2));
  } else if (this.taxType === 'IGST') {
    this.igst.percent  = billData.igstPercentage  || 0;
    this.igst.amount   = parseFloat(((base * this.igst.percent)  / 100).toFixed(2));
  } else if (this.taxType === 'JOBCGST_JOBSGST') {
    this.jobCgst.percent = billData.jobCgstPercentage || 0;
    this.jobSgst.percent = billData.jobSgstPercentage || 0;
    this.jobCgst.amount  = parseFloat(((base * this.jobCgst.percent) / 100).toFixed(2));
    this.jobSgst.amount  = parseFloat(((base * this.jobSgst.percent) / 100).toFixed(2));
  }

  this.totalTaxAmount = parseFloat(
    (this.cgst.amount + this.sgst.amount + this.igst.amount +
     this.jobCgst.amount + this.jobSgst.amount).toFixed(2)
  );

  this.totalAmount = parseFloat((this.amountAfterDiscount + this.totalTaxAmount).toFixed(2));
};

module.exports = mongoose.model('CreditDebitNote', CreditDebitNoteSchema);