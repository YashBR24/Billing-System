const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─────────────────────────────────────────────────────────────────────────────
// InterestNote Schema
//
// Business rule: one interest note per bill (enforced by unique index on
// originalBill field + duplicate check in controller).
//
// Interest formula:
//   perDayRate      = (billTotalAmount × monthlyInterestRate%) / 30
//   interestAmount  = perDayRate × lateDays
//   (stored as `subtotal`)
// ─────────────────────────────────────────────────────────────────────────────
const interestNoteSchema = new Schema(
  {
    // ── Identification ──────────────────────────────────────────────────────
    interestNoteNumber: {
      type:     String,
      required: [true, 'Interest note number is required.'],
      unique:   true,
      trim:     true,
      // e.g. "2025-26/IN/01"
      match: [
        /^\d{4}-\d{2}\/IN\/\d{2,}$/,
        'Interest note number must follow format YYYY-YY/IN/NN (e.g. 2025-26/IN/01)',
      ],
    },
    financialYear: {
      type:     String,
      required: [true, 'Financial year is required.'],
      trim:     true,
      // e.g. "2025-26"
      match: [/^\d{4}-\d{2}$/, 'Financial year must follow format YYYY-YY'],
    },
    interestNoteDate: {
      type:    Date,
      default: Date.now,
    },
    status: {
      type:    String,
      enum:    ['Pending', 'Paid', 'Cancelled'],
      default: 'Pending',
    },

    // ── Links to originating bill ───────────────────────────────────────────
    originalBill: {
      type:     Schema.Types.ObjectId,
      ref:      'Bill',
      required: [true, 'Original bill reference is required.'],
      // Not unique at schema level — controller prevents duplicates;
      // keeping it non-unique allows admin override if needed.
    },
    originalBillNumber: {
      type:  String,
      trim:  true,
    },
    originalBillDate: {
      type: Date,
    },

    // ── Company ─────────────────────────────────────────────────────────────
    company: {
      type:     Schema.Types.ObjectId,
      ref:      'Company',
      required: [true, 'Company is required.'],
    },
    /**
     * Snapshot of company details at the time of note creation.
     * Prevents retrospective changes to company data from altering historical notes.
     */
    companyDetailsSnapshot: {
      name:      { type: String },
      address:   { type: String },
      gstNumber: { type: String },
      stateCode: { type: String },
    },

    // ── Interest Calculation Inputs ──────────────────────────────────────────
    billTotalAmount: {
      type:     Number,
      required: [true, 'Bill total amount is required for interest calculation.'],
      min:      [0, 'Bill total amount cannot be negative.'],
    },
    dueDate: {
      type:     Date,
      required: [true, 'Due date is required.'],
    },
    paymentDate: {
      type:     Date,
      required: [true, 'Payment date is required.'],
    },
    lateDays: {
      type:     Number,
      required: [true, 'Late days count is required.'],
      min:      [1, 'Late days must be at least 1.'],
    },
    monthlyInterestRate: {
      type:     Number,
      required: [true, 'Monthly interest rate (%) is required.'],
      min:      [0.01, 'Monthly interest rate must be greater than 0.'],
    },
    /**
     * perDayRate = (billTotalAmount × monthlyInterestRate%) / 30
     * Stored for PDF display and audit trail.
     */
    perDayRate: {
      type:     Number,
      required: [true, 'Per day rate is required.'],
      min:      [0, 'Per day rate cannot be negative.'],
    },

    // ── Financial Summary ────────────────────────────────────────────────────
    /** subtotal = perDayRate × lateDays (interest before tax) */
    subtotal: {
      type:     Number,
      required: [true, 'Subtotal is required.'],
      min:      [0, 'Subtotal cannot be negative.'],
    },
    taxType: {
      type:    String,
      enum:    ['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'],
      default: 'CGST_SGST',
    },

    // CGST / SGST
    cgstPercentage: { type: Number, default: 0, min: 0 },
    cgstAmount:     { type: Number, default: 0, min: 0 },
    sgstPercentage: { type: Number, default: 0, min: 0 },
    sgstAmount:     { type: Number, default: 0, min: 0 },

    // IGST
    igstPercentage: { type: Number, default: 0, min: 0 },
    igstAmount:     { type: Number, default: 0, min: 0 },

    // Job Work GST
    jobCgstPercentage: { type: Number, default: 0, min: 0 },
    jobCgstAmount:     { type: Number, default: 0, min: 0 },
    jobSgstPercentage: { type: Number, default: 0, min: 0 },
    jobSgstAmount:     { type: Number, default: 0, min: 0 },

    totalTaxAmount: { type: Number, default: 0, min: 0 },
    totalAmount:    {
      type:     Number,
      required: [true, 'Total amount is required.'],
      min:      [0, 'Total amount cannot be negative.'],
    },
    amountInWords: { type: String, default: '' },

    // ── Audit ────────────────────────────────────────────────────────────────
    createdBy: {
      type: Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────
interestNoteSchema.index({ interestNoteNumber: 1 }, { unique: true });
interestNoteSchema.index({ company: 1, financialYear: 1 });
interestNoteSchema.index({ originalBill: 1 }, { unique: true, sparse: true });
interestNoteSchema.index({ status: 1 });
interestNoteSchema.index({ interestNoteDate: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL: formatted interest note identifier for display
// ─────────────────────────────────────────────────────────────────────────────
interestNoteSchema.virtual('displayId').get(function () {
  return `${this.interestNoteNumber} (${this.financialYear})`;
});

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SAVE VALIDATION: paymentDate must be after dueDate
// ─────────────────────────────────────────────────────────────────────────────
interestNoteSchema.pre('save', function (next) {
  if (this.paymentDate && this.dueDate) {
    if (new Date(this.paymentDate) <= new Date(this.dueDate)) {
      return next(new Error('paymentDate must be strictly after dueDate for an interest note.'));
    }
  }
  if (this.lateDays !== undefined && this.lateDays < 1) {
    return next(new Error('lateDays must be at least 1.'));
  }
  next();
});

module.exports = mongoose.models.InterestNote || mongoose.model('InterestNote', interestNoteSchema);