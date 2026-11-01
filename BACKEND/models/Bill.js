const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hsnSacCode: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: true });

const BillSchema = new mongoose.Schema({
  billNumber: {
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
  billDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  challan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan',
    default: null,
  },
  challans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan',
  }],
  challanNumber: {
    type: String,
    trim: true,
    default: '',
  },
  dueDate: {
    type: Date,
  },
  // Buyer (main company - for all connections and references)
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
  // Consignee (optional - if different from buyer)
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
  items: [BillItemSchema],
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
  roundOffAmount: {
    type: Number,
    default: 0
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
    enum: ['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'],
    default: 'Pending',
  },
  totalPaidAmount: {
    type: Number,
    default: 0,
  },
  paymentRecords: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    paymentDate: { type: Date, required: true },
    amountPaid: { type: Number, required: true, min: 0.01 },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true, sparse: true },
    paymentMethod: String,
    referenceNumber: String,
    notes: String,
  }],
  // New: E-way bill number
  eWayBillNumber: {
    type: String,
    trim: true,
    default: ''
  },
  // New: Payment terms in days (default 30)
  paymentTermsDays: {
    type: Number,
    default: 30,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  debitNote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DebitNote',
    default: null,
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

BillSchema.pre('save', async function(next) {
  const Settings = mongoose.model('Settings');
  const settings = await Settings.getSettings();

    // 1️⃣ Subtotal
    this.subTotalAmount = (this.items || []).reduce(
      (acc, item) => acc + item.amount,
      0
    );
  this.subTotalAmount = Number(this.subTotalAmount.toFixed(2));

  // 2️⃣ Discount
  this.discountAmount = Number(
    ((this.subTotalAmount * this.discountPercentage) / 100).toFixed(2)
  );

  this.amountAfterDiscount = Number(
    (this.subTotalAmount - this.discountAmount).toFixed(2)
  );

  // 3️⃣ Reset taxes
  this.cgstAmount = 0;
  this.sgstAmount = 0;
  this.igstAmount = 0;
  this.jobCgstAmount = 0;
  this.jobSgstAmount = 0;

  // 4️⃣ Apply tax (WITH 2 DECIMAL ROUNDING)
  if (this.taxType === 'CGST_SGST') {

    this.cgstPercentage = settings.cgstPercentage;
    this.sgstPercentage = settings.sgstPercentage;

    this.cgstAmount = Number(
      ((this.amountAfterDiscount * this.cgstPercentage) / 100).toFixed(2)
    );

    this.sgstAmount = Number(
      ((this.amountAfterDiscount * this.sgstPercentage) / 100).toFixed(2)
    );
  }

  if (this.taxType === 'IGST') {

    this.igstPercentage = settings.igstPercentage;

    this.igstAmount = Number(
      ((this.amountAfterDiscount * this.igstPercentage) / 100).toFixed(2)
    );
  }

  if (this.taxType === 'JOBCGST_JOBSGST') {

    this.jobCgstPercentage = settings.jobCgstPercentage;
    this.jobSgstPercentage = settings.jobSgstPercentage;

    this.jobCgstAmount = Number(
      ((this.amountAfterDiscount * this.jobCgstPercentage) / 100).toFixed(2)
    );

    this.jobSgstAmount = Number(
      ((this.amountAfterDiscount * this.jobSgstPercentage) / 100).toFixed(2)
    );
  }

  // 5️⃣ Total Tax
  this.totalTaxAmount = Number(
    (
      this.cgstAmount +
      this.sgstAmount +
      this.igstAmount +
      this.jobCgstAmount +
      this.jobSgstAmount
    ).toFixed(2)
  );

  // 6️⃣ Raw Total
  const rawTotal = Number(
    (this.amountAfterDiscount + this.totalTaxAmount).toFixed(2)
  );

  // 7️⃣ Final Rounded Total (IMPORTANT)
  const roundedTotal = Math.round(rawTotal);

  // 8️⃣ Round Off
  this.roundOffAmount = Number(
    (roundedTotal - rawTotal).toFixed(2)
  );

  this.totalAmount = roundedTotal;

    // 9️⃣ Paid calculation
    this.totalPaidAmount = Number(
      ((this.paymentRecords || []).reduce(
        (acc, r) => acc + r.amountPaid,
        0
      )).toFixed(2)
    );

  if (this.totalPaidAmount >= this.totalAmount) {
    this.status = 'Paid';
  } else if (this.totalPaidAmount > 0) {
    this.status = 'Partially Paid';
  } else if (this.status !== 'Cancelled') {
    this.status = 'Pending';
  }

  // 🔟 Due Date: compute from paymentTermsDays if provided, otherwise default 30
  const terms = (this.paymentTermsDays && Number.isFinite(Number(this.paymentTermsDays))) ? parseInt(this.paymentTermsDays, 10) : 30;
  if (this.isModified('billDate') || !this.dueDate || this.isModified('paymentTermsDays')) {
    const dueDate = new Date(this.billDate);
    dueDate.setDate(dueDate.getDate() + terms);
    this.dueDate = dueDate;
  }

  this.updatedAt = Date.now();

  next();
});

module.exports = mongoose.model('Bill', BillSchema);
