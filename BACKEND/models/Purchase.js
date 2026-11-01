// const mongoose = require('mongoose');

// const PurchaseSchema = new mongoose.Schema({
//   // New field for purchase type
//   purchaseType: {
//     type: String,
//     enum: ['YARN', 'OTHER'],
//     default: 'YARN',
//     required: true,
//   },
  
//   supplierCompany: { 
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Company',
//     required: true,
//   },
//   supplierDetailsSnapshot: {
//     name: String,
//     address: String,
//     gstNumber: String,
//   },
  
//   // For OTHER purchases - manual company name entry
//   manualCompanyName: {
//     type: String,
//     trim: true,
//   },
  
//   // Common fields
//   purchaseBillNumber: { 
//     type: String,
//     required: [true, 'Bill number is required.'],
//     trim: true,
//   },
//   purchaseBillDate: {
//     type: Date,
//     required: [true, 'Bill date is required.'],
//   },
  
//   // YARN-specific fields (optional for OTHER purchases)
//   challanNumber: {
//     type: String,
//     trim: true,
//   },
//   challanDate: {
//     type: Date,
//   },
//   denier: {
//     type: String,
//     trim: true,
//   },
//   grade: { 
//     type: String,
//     trim: true,
//   },
//   totalGrossWeight: { 
//     type: Number,
//     min: 0,
//   },
//   tareWeight: { 
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   netWeight: { 
//     type: Number,
//     min: 0,
//   },
//   ratePerUnit: { 
//     type: Number,
//     min: 0
//   },
  
//   // OTHER purchase specific fields
//   productType: {
//     type: String,
//     trim: true,
//   },
//   productDescription: {
//     type: String,
//     trim: true,
//   },
  
//   // Common fields
//   amount: { 
//     type: Number,
//     required: [true, 'Purchase amount is required.'],
//     min: 0,
//   },
//   dueDate: { 
//     type: Date,
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['Unpaid', 'Partially Paid', 'Paid'],
//     default: 'Unpaid',
//   },
//   totalPaidAmount: {
//     type: Number,
//     default: 0,
//   },
//   paymentRecords: [{
//     _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
//     paymentDate: { type: Date, required: true },
//     amountPaid: { type: Number, required: true, min: 0.01 },
//     transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true, sparse: true },
//     paymentMethod: String,
//     referenceNumber: String,
//     notes: String,
//   }],
//   notes: { 
//     type: String,
//     trim: true,
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// PurchaseSchema.pre('validate', function(next) {
//   // Validate YARN purchases
//   if (this.purchaseType === 'YARN') {
//     if (!this.totalGrossWeight) {
//       this.invalidate('totalGrossWeight', 'Total gross weight is required for yarn purchases.');
//     }
//     if (!this.ratePerUnit) {
//       this.invalidate('ratePerUnit', 'Rate per unit is required for yarn purchases.');
//     }
//   }
  
//   // Validate OTHER purchases
//   if (this.purchaseType === 'OTHER') {
//     if (!this.productType) {
//       this.invalidate('productType', 'Product type is required for other purchases.');
//     }
//   }
  
//   next();
// });

// PurchaseSchema.pre('save', function(next) {
//   // Calculate total paid amount
//   this.totalPaidAmount = this.paymentRecords.reduce((acc, record) => acc + record.amountPaid, 0);
//   this.totalPaidAmount = parseFloat(this.totalPaidAmount.toFixed(2));

//   // Update payment status
//   if (this.totalPaidAmount >= this.amount) {
//     this.paymentStatus = 'Paid';
//   } else if (this.totalPaidAmount > 0 && this.totalPaidAmount < this.amount) {
//     this.paymentStatus = 'Partially Paid';
//   } else if (this.totalPaidAmount === 0) {
//     this.paymentStatus = 'Unpaid';
//   }

//   // Calculate net weight for YARN purchases only
//   if (this.purchaseType === 'YARN' && this.totalGrossWeight !== undefined && this.tareWeight !== undefined) {
//     this.netWeight = parseFloat((this.totalGrossWeight - this.tareWeight).toFixed(3)); 
//   }

//   // Set due date
//   if (this.isModified('purchaseBillDate') || !this.dueDate) {
//     const dueDate = new Date(this.purchaseBillDate);
//     dueDate.setDate(dueDate.getDate() + 15); 
//     this.dueDate = dueDate;
//   }

//   if (this.isModified()) {
//     this.updatedAt = Date.now();
//   }
  
//   next();
// });

// PurchaseSchema.index({ supplierCompany: 1, purchaseBillNumber: 1 });
// PurchaseSchema.index({ purchaseType: 1 });

// module.exports = mongoose.model('Purchase', PurchaseSchema);

const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  purchaseType: {
    type: String,
    enum: ['YARN', 'OTHER'],
    default: 'YARN',
    required: true,
  },

  supplierCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },

  supplierDetailsSnapshot: {
    name: String,
    address: String,
    gstNumber: String,
  },
financialYear: {
  type: String,
  required: true,
  index: true,
  default: function () {
    const d = new Date(this.purchaseBillDate || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    return month >= 4
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  },
},
  purchaseBillNumber: {
    type: String,
    required: true,
    trim: true,
  },

  purchaseBillDate: {
    type: Date,
    required: true,
  },

  /* =======================
     YARN SPECIFIC FIELDS
  ======================= */
  challanNumber: String,
  challanDate: Date,
  denier: String,
  grade: String,

  totalGrossWeight: Number,
  tareWeight: {
    type: Number,
    default: 0,
  },
  netWeight: Number,
  ratePerUnit: Number,

  subTotal: {
    type: Number,
    default: 0,
  },

  carteageFridgeAmount: {
    type: Number,
    default: 0,
  },

  /* =======================
     OTHER PURCHASE FIELDS
  ======================= */
  productType: String,
  productDescription: String,

  /* =======================
     GST FIELDS (COMMON)
  ======================= */
  cgstPercentage: {
    type: Number,
    default: 2.5,
  },
  sgstPercentage: {
    type: Number,
    default: 2.5,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },

  /* =======================
     FINAL TOTAL AMOUNT
  ======================= */
  amount: {
    type: Number,
    required: true,
  },

  dueDate: Date,

  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid',
  },

  totalPaidAmount: {
    type: Number,
    default: 0,
  },

  paymentRecords: [{
    paymentDate: Date,
    amountPaid: Number,
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  }],

  notes: String,

  createdBy: {
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

const getFinancialYear = (date) => {
  const d = new Date(date || Date.now());
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  // April to March FY
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }

  return `${year - 1}-${String(year).slice(-2)}`;
};

/* =======================
   VALIDATIONS
======================= */
PurchaseSchema.pre('validate', function (next) {
  if (this.purchaseType === 'YARN') {
    if (!this.totalGrossWeight || !this.ratePerUnit) {
      this.invalidate('YARN', 'Gross weight and rate are required for yarn purchase.');
    }
  }

  if (this.purchaseType === 'OTHER') {
    if (!this.productType) {
      this.invalidate('productType', 'Product type is required.');
    }
    if (!this.supplierCompany) {
      this.invalidate('supplierCompany', 'Supplier company is mandatory.');
    }
  }

  next();
});

/* =======================
   AUTO CALCULATIONS
======================= */
// PurchaseSchema.pre('save', function (next) {
//   if (this.purchaseType === 'YARN') {
//     this.netWeight = parseFloat((this.totalGrossWeight - this.tareWeight).toFixed(3));
//     this.subTotal = parseFloat((this.netWeight * this.ratePerUnit).toFixed(2));
//     this.amount = parseFloat((this.subTotal + this.cgst + this.sgst).toFixed(2));
//   }

//   if (this.purchaseType === 'OTHER') {
//     this.amount = parseFloat((this.amount + this.cgst + this.sgst).toFixed(2));
//   }

//   this.totalPaidAmount = this.paymentRecords.reduce(
//     (sum, p) => sum + p.amountPaid, 0
//   );

//   if (this.totalPaidAmount >= this.amount) {
//     this.paymentStatus = 'Paid';
//   } else if (this.totalPaidAmount > 0) {
//     this.paymentStatus = 'Partially Paid';
//   } else {
//     this.paymentStatus = 'Unpaid';
//   }

//   this.updatedAt = Date.now();
//   next();
// });

PurchaseSchema.pre('save', function (next) {
  /* =======================
     CHECK IF RECALCULATION NEEDED
     Only recalculate when amount-related fields change,
     NOT when only payment records are updated
  ======================= */
  const needsRecalc = this.isNew ||
    this.isModified('amount') ||
    this.isModified('cgstPercentage') ||
    this.isModified('sgstPercentage') ||
    this.isModified('subTotal') ||
    this.isModified('carteageFridgeAmount') ||
    this.isModified('totalGrossWeight') ||
    this.isModified('tareWeight') ||
    this.isModified('ratePerUnit');

  if (needsRecalc) {
    /* =======================
       AUTO CALCULATE FOR YARN
    ======================= */
    if (this.purchaseType === 'YARN') {
      this.netWeight = parseFloat(
        (this.totalGrossWeight - this.tareWeight).toFixed(3)
      );

      this.subTotal = parseFloat(
        (this.netWeight * this.ratePerUnit).toFixed(2)
      );

      const baseForGst = this.subTotal + (this.carteageFridgeAmount || 0);

      this.cgst = parseFloat(
        ((baseForGst * (this.cgstPercentage || 0)) / 100).toFixed(2)
      );

      this.sgst = parseFloat(
        ((baseForGst * (this.sgstPercentage || 0)) / 100).toFixed(2)
      );

      this.amount = parseFloat(
        (baseForGst + this.cgst + this.sgst).toFixed(2)
      );
    }

    /* =======================
       AUTO CALCULATE FOR OTHER
    ======================= */
    if (this.purchaseType === 'OTHER') {
      const baseAmount = this.amount || 0;

      this.cgst = parseFloat(
        ((baseAmount * (this.cgstPercentage || 0)) / 100).toFixed(2)
      );

      this.sgst = parseFloat(
        ((baseAmount * (this.sgstPercentage || 0)) / 100).toFixed(2)
      );

      this.amount = parseFloat(
        (baseAmount + this.cgst + this.sgst).toFixed(2)
      );
    }
  }

  /* =======================
     PAYMENT STATUS UPDATE
  ======================= */
  this.totalPaidAmount = this.paymentRecords.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0
  );

  this.totalPaidAmount = parseFloat(this.totalPaidAmount.toFixed(2));

  if (this.totalPaidAmount >= this.amount) {
    this.paymentStatus = 'Paid';
  } else if (this.totalPaidAmount > 0) {
    this.paymentStatus = 'Partially Paid';
  } else {
    this.paymentStatus = 'Unpaid';
  }

  /* =======================
     UPDATED TIME
  ======================= */
  this.updatedAt = Date.now();

  next();
});

module.exports = mongoose.model('Purchase', PurchaseSchema);
