// const mongoose = require('mongoose');

// const PurchaseSchema = new mongoose.Schema({
//   organizationId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Organization',
//     required: false,
//     index: true,
//   },
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
// financialYear: {
//   type: String,
//   required: true,
//   index: true,
//   default: function () {
//     const d = new Date(this.purchaseBillDate || Date.now());
//     const year = d.getFullYear();
//     const month = d.getMonth() + 1;

//     return month >= 4
//       ? `${year}-${String(year + 1).slice(-2)}`
//       : `${year - 1}-${String(year).slice(-2)}`;
//   },
// },
//   purchaseBillNumber: {
//     type: String,
//     required: true,
//     trim: true,
//   },

//   purchaseBillDate: {
//     type: Date,
//     required: true,
//   },

//   /* =======================
//      YARN SPECIFIC FIELDS
//   ======================= */
//   challanNumber: String,
//   challanDate: Date,
//   denier: String,
//   grade: String,

//   totalGrossWeight: Number,
//   tareWeight: {
//     type: Number,
//     default: 0,
//   },
//   netWeight: Number,
//   ratePerUnit: Number,

//   subTotal: {
//     type: Number,
//     default: 0,
//   },

//   carteageFridgeAmount: {
//     type: Number,
//     default: 0,
//   },

//   /* =======================
//      OTHER PURCHASE FIELDS
//   ======================= */
//   productType: String,
//   productDescription: String,

//   /* =======================
//      GST FIELDS (COMMON)
//   ======================= */
//   cgstPercentage: {
//     type: Number,
//     default: 2.5,
//   },
//   sgstPercentage: {
//     type: Number,
//     default: 2.5,
//   },
//   cgst: {
//     type: Number,
//     default: 0,
//   },
//   sgst: {
//     type: Number,
//     default: 0,
//   },

//   /* =======================
//      FINAL TOTAL AMOUNT
//   ======================= */
//   amount: {
//     type: Number,
//     required: true,
//   },

//   dueDate: Date,

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
//     paymentDate: Date,
//     amountPaid: Number,
//     transactionId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Transaction',
//     },
//   }],

//   notes: String,

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

// const getFinancialYear = (date) => {
//   const d = new Date(date || Date.now());
//   const year = d.getFullYear();
//   const month = d.getMonth() + 1;

//   // April to March FY
//   if (month >= 4) {
//     return `${year}-${String(year + 1).slice(-2)}`;
//   }

//   return `${year - 1}-${String(year).slice(-2)}`;
// };

// /* =======================
//    VALIDATIONS
// ======================= */
// PurchaseSchema.pre('validate', function (next) {
//   if (this.purchaseType === 'YARN') {
//     if (!this.totalGrossWeight || !this.ratePerUnit) {
//       this.invalidate('YARN', 'Gross weight and rate are required for yarn purchase.');
//     }
//   }

//   if (this.purchaseType === 'OTHER') {
//     if (!this.productType) {
//       this.invalidate('productType', 'Product type is required.');
//     }
//     if (!this.supplierCompany) {
//       this.invalidate('supplierCompany', 'Supplier company is mandatory.');
//     }
//   }

//   next();
// });

// /* =======================
//    AUTO CALCULATIONS
// ======================= */
// // PurchaseSchema.pre('save', function (next) {
// //   if (this.purchaseType === 'YARN') {
// //     this.netWeight = parseFloat((this.totalGrossWeight - this.tareWeight).toFixed(3));
// //     this.subTotal = parseFloat((this.netWeight * this.ratePerUnit).toFixed(2));
// //     this.amount = parseFloat((this.subTotal + this.cgst + this.sgst).toFixed(2));
// //   }

// //   if (this.purchaseType === 'OTHER') {
// //     this.amount = parseFloat((this.amount + this.cgst + this.sgst).toFixed(2));
// //   }

// //   this.totalPaidAmount = this.paymentRecords.reduce(
// //     (sum, p) => sum + p.amountPaid, 0
// //   );

// //   if (this.totalPaidAmount >= this.amount) {
// //     this.paymentStatus = 'Paid';
// //   } else if (this.totalPaidAmount > 0) {
// //     this.paymentStatus = 'Partially Paid';
// //   } else {
// //     this.paymentStatus = 'Unpaid';
// //   }

// //   this.updatedAt = Date.now();
// //   next();
// // });

// PurchaseSchema.pre('save', function (next) {
//   /* =======================
//      CHECK IF RECALCULATION NEEDED
//      Only recalculate when amount-related fields change,
//      NOT when only payment records are updated
//   ======================= */
//   const needsRecalc = this.isNew ||
//     this.isModified('amount') ||
//     this.isModified('cgstPercentage') ||
//     this.isModified('sgstPercentage') ||
//     this.isModified('subTotal') ||
//     this.isModified('carteageFridgeAmount') ||
//     this.isModified('totalGrossWeight') ||
//     this.isModified('tareWeight') ||
//     this.isModified('ratePerUnit');

//   if (needsRecalc) {
//     /* =======================
//        AUTO CALCULATE FOR YARN
//     ======================= */
//     if (this.purchaseType === 'YARN') {
//       this.netWeight = parseFloat(
//         (this.totalGrossWeight - this.tareWeight).toFixed(3)
//       );

//       this.subTotal = parseFloat(
//         (this.netWeight * this.ratePerUnit).toFixed(2)
//       );

//       const baseForGst = this.subTotal + (this.carteageFridgeAmount || 0);

//       this.cgst = parseFloat(
//         ((baseForGst * (this.cgstPercentage || 0)) / 100).toFixed(2)
//       );

//       this.sgst = parseFloat(
//         ((baseForGst * (this.sgstPercentage || 0)) / 100).toFixed(2)
//       );

//       this.amount = Math.round(baseForGst + this.cgst + this.sgst);
//     }

//     /* =======================
//        AUTO CALCULATE FOR OTHER
//     ======================= */
//     if (this.purchaseType === 'OTHER') {
//       const baseAmount = this.isModified('amount')
//         ? (this.amount || 0)
//         : ((this.amount || 0) - (this.cgst || 0) - (this.sgst || 0));

//       this.cgst = parseFloat(
//         ((baseAmount * (this.cgstPercentage || 0)) / 100).toFixed(2)
//       );

//       this.sgst = parseFloat(
//         ((baseAmount * (this.sgstPercentage || 0)) / 100).toFixed(2)
//       );

//       this.amount = Math.round(baseAmount + this.cgst + this.sgst);
//     }
//   }

//   /* =======================
//      PAYMENT STATUS UPDATE
//   ======================= */
//   this.totalPaidAmount = this.paymentRecords.reduce(
//     (sum, payment) => sum + payment.amountPaid,
//     0
//   );

//   this.totalPaidAmount = parseFloat(this.totalPaidAmount.toFixed(2));

//   if (this.totalPaidAmount >= this.amount) {
//     this.paymentStatus = 'Paid';
//   } else if (this.totalPaidAmount > 0) {
//     this.paymentStatus = 'Partially Paid';
//   } else {
//     this.paymentStatus = 'Unpaid';
//   }

//   /* =======================
//      UPDATED TIME
//   ======================= */
//   this.updatedAt = Date.now();

//   next();
// });

// PurchaseSchema.index({ organizationId: 1, purchaseBillNumber: 1 }, { unique: true });

// module.exports = mongoose.model('Purchase', PurchaseSchema);


const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true,
  },
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

      this.amount = Math.round(baseForGst + this.cgst + this.sgst);
    }

    /* =======================
       AUTO CALCULATE FOR OTHER
    ======================= */
  //   if (this.purchaseType === 'OTHER') {
  //     // Only recalculate if cgst/sgst are not already explicitly set
  //     if (!this.isModified('cgst') && !this.isModified('sgst')) {
  //       const baseAmount = (this.amount || 0) - (this.cgst || 0) - (this.sgst || 0);

  //       this.cgst = parseFloat(
  //         ((baseAmount * (this.cgstPercentage || 0)) / 100).toFixed(2)
  //       );

  //       this.sgst = parseFloat(
  //         ((baseAmount * (this.sgstPercentage || 0)) / 100).toFixed(2)
  //       );

  //       this.amount = Math.round(baseAmount + this.cgst + this.sgst);
  //     }
  //   }
  // }

      /* =======================
       AUTO CALCULATE FOR OTHER
    ======================= */
    if (this.purchaseType === 'OTHER') {
      // Only recalculate if cgst/sgst are not already explicitly set
      if (!this.isModified('cgst') && !this.isModified('sgst') && !this.isModified('amount')) {
        const baseAmount = (this.amount || 0) - (this.cgst || 0) - (this.sgst || 0);

        this.cgst = parseFloat(
          ((baseAmount * (this.cgstPercentage || 0)) / 100).toFixed(2)
        );

        this.sgst = parseFloat(
          ((baseAmount * (this.sgstPercentage || 0)) / 100).toFixed(2)
        );

        this.amount = Math.round(baseAmount + this.cgst + this.sgst);
      }
    }}
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

PurchaseSchema.index({ organizationId: 1, purchaseBillNumber: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);  