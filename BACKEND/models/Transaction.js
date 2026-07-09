const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true,
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required.'],
    default: Date.now,
  },
  type: { // 'IN' for income/payment received, 'OUT' for expense/payment made
    type: String,
    enum: ['IN', 'OUT'],
    required: [true, 'Transaction type (IN/OUT) is required.'],
  },
  company: { // Optional: Company related to this transaction
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
  },
  worker: { // Optional: Worker related to this transaction (for salary payments)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
  },
  category: {
    type: String,
    enum: [
      'BillPayment',      // Payment received for a sales bill
      'PurchasePayment',  // Payment made for a purchase bill
      'InterestNotePayment', // Payment received for interest note
      'Salary',           // Salary paid to a worker
      'MiscellaneousIncome',// Other income (e.g., selling scrap)
      'MiscellaneousExpense', // Other expenses (e.g., office supplies)
      'Other'             // General catch-all
    ],
    required: [true, 'Transaction category is required.'],
    default: 'Other',
  },
  // For linking to specific sales bills or purchase bills
  relatedBills: [{ // Array to support linking to multiple bills (e.g., a single payment covering multiple invoices)
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    billNumber: String, // Denormalized for quick display
  }],
  relatedPurchases: [{ // Array to support linking to multiple purchase bills
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseBillNumber: String, // Denormalized
  }],
  relatedInterestNotes: [{
    interestNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterestNote' },
    interestNoteNumber: String,
  }],
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required.'],
    min: [0.01, 'Amount must be greater than 0.'],
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Other'],
    required: [true, 'Payment method is required.'],
  },
  referenceNumber: { // Optional: Cheque number, transaction ID, etc.
    type: String,
    trim: true,
  },
  description: { // Auto-generated for bill payments, or manual for other transactions
    type: String,
    trim: true,
    required: [true, 'A description for the transaction is required.']
  },
  notes: { // Optional additional notes
    type: String,
    trim: true,
  },
  recordedBy: {
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
});

TransactionSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Index for querying by date, type
TransactionSchema.index({ paymentDate: -1, type: 1 });
TransactionSchema.index({ company: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);