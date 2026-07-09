const InterestNote = require('../models/InterestNote');
const Bill         = require('../models/Bill');
const Company      = require('../models/Company');
const Settings     = require('../models/Settings');
const { log }      = require('../middleware/logger');
const fsPromises   = require('fs').promises;
const fs           = require('fs');
const path         = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const { getOrgDetails } = require('../utils/orgDetails');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Determine financial year string from a date
// e.g. April 2025 → March 2026  →  "2025-26"
// ─────────────────────────────────────────────────────────────────────────────
const getFinancialYear = (date = new Date()) => {
  const d     = new Date(date);
  const month = d.getMonth(); // 0-indexed; April = 3
  const year  = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate next interest note number for a given financial year
// Format: 2025-26/IN/01  (IN prefix distinguishes from credit notes)
// Resets to /IN/01 each new financial year
// ─────────────────────────────────────────────────────────────────────────────
const generateInterestNoteNumber = async (financialYear, organizationId) => {
  const prefix   = `${financialYear}/IN/`;
  const escaped  = prefix.replace(/-/g, '\\-').replace('/', '\\/').replace('/', '\\/');
  const lastNote = await InterestNote.findOne({
    interestNoteNumber: { $regex: `^${escaped}` },
    organizationId,
  }).sort({ interestNoteNumber: -1 });

  let nextSeq = 1;
  if (lastNote) {
    const parts   = lastNote.interestNoteNumber.split('/');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Calculate interest + GST totals for a set of interest line items
//
//  interestAmount  – pre-calculated interest (perDayRate × lateDays)
//  taxType         – 'CGST_SGST' | 'IGST' | 'JOBCGST_JOBSGST'
//  percentages     – { cgst, sgst, igst, jobCgst, jobSgst }
// ─────────────────────────────────────────────────────────────────────────────
const calculateInterestNoteTotals = (interestAmount, taxType, percentages = {}) => {
  const subtotal = parseFloat(parseFloat(interestAmount).toFixed(2));

  let cgstPercentage    = 0, cgstAmount    = 0;
  let sgstPercentage    = 0, sgstAmount    = 0;
  let igstPercentage    = 0, igstAmount    = 0;
  let jobCgstPercentage = 0, jobCgstAmount = 0;
  let jobSgstPercentage = 0, jobSgstAmount = 0;
  let totalTaxAmount    = 0;

  if (taxType === 'CGST_SGST') {
    cgstPercentage = parseFloat(percentages.cgst) || 0;
    sgstPercentage = parseFloat(percentages.sgst) || 0;
    cgstAmount     = parseFloat((subtotal * (cgstPercentage / 100)).toFixed(2));
    sgstAmount     = parseFloat((subtotal * (sgstPercentage / 100)).toFixed(2));
    totalTaxAmount = cgstAmount + sgstAmount;
  } else if (taxType === 'IGST') {
    igstPercentage = parseFloat(percentages.igst) || 0;
    igstAmount     = parseFloat((subtotal * (igstPercentage / 100)).toFixed(2));
    totalTaxAmount = igstAmount;
  } else if (taxType === 'JOBCGST_JOBSGST') {
    jobCgstPercentage = parseFloat(percentages.jobCgst) || 0;
    jobSgstPercentage = parseFloat(percentages.jobSgst) || 0;
    jobCgstAmount     = parseFloat((subtotal * (jobCgstPercentage / 100)).toFixed(2));
    jobSgstAmount     = parseFloat((subtotal * (jobSgstPercentage / 100)).toFixed(2));
    totalTaxAmount    = jobCgstAmount + jobSgstAmount;
  }

  totalTaxAmount   = parseFloat(totalTaxAmount.toFixed(2));
  const totalAmount = parseFloat((subtotal + totalTaxAmount).toFixed(2));

  return {
    subtotal,
    cgstPercentage, cgstAmount,
    sgstPercentage, sgstAmount,
    igstPercentage, igstAmount,
    jobCgstPercentage, jobCgstAmount,
    jobSgstPercentage, jobSgstAmount,
    totalTaxAmount,
    totalAmount,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Amount to words (Indian numbering system)
// ─────────────────────────────────────────────────────────────────────────────
const amountToWords = (number) => {
  if (number === null || number === undefined || isNaN(parseInt(number, 10))) return '';
  let num = parseInt(number, 10);
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const tens = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

  let mainNum = num;
  let str = '';
  const crore    = Math.floor(mainNum / 10000000); mainNum %= 10000000;
  const lakh     = Math.floor(mainNum / 100000);   mainNum %= 100000;
  const thousand = Math.floor(mainNum / 1000);      mainNum %= 1000;
  const hundred  = Math.floor(mainNum / 100);       mainNum %= 100;

  if (crore    > 0) str += (crore    > 19 ? tens[Math.floor(crore    / 10)] + ones[crore    % 10] : ones[crore])    + 'Crore ';
  if (lakh     > 0) str += (lakh     > 19 ? tens[Math.floor(lakh     / 10)] + ones[lakh     % 10] : ones[lakh])     + 'Lakh ';
  if (thousand > 0) str += (thousand > 19 ? tens[Math.floor(thousand / 10)] + ones[thousand % 10] : ones[thousand]) + 'Thousand ';
  if (hundred  > 0) str += (hundred  > 19 ? tens[Math.floor(hundred  / 10)] + ones[hundred  % 10] : ones[hundred])  + 'Hundred ';
  if (mainNum  > 0) str += (str !== '' && mainNum < 100 ? 'and ' : '') + (mainNum > 19 ? tens[Math.floor(mainNum / 10)] + ones[mainNum % 10] : ones[mainNum]);

  const finalStr = (str.trim() + ' Rupees Only').trim();
  return finalStr.length > 'Rupees Only'.length ? finalStr : 'Zero Rupees Only';
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Calculate late days between dueDate and paymentDate (whole days)
// ─────────────────────────────────────────────────────────────────────────────
const calcLateDays = (dueDate, paymentDate) => {
  const due  = new Date(dueDate);
  const paid = new Date(paymentDate);
  due.setHours(0, 0, 0, 0);
  paid.setHours(0, 0, 0, 0);
  const diff = paid - due;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get next interest note number preview (for UI auto-fill)
// @route  GET /api/interest-notes/next-number?financialYear=2025-26
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getNextInterestNoteNumber = async (req, res) => {
  try {
    const financialYear = req.query.financialYear || getFinancialYear();
    const nextNumber    = await generateInterestNoteNumber(financialYear, req.organizationId);
    log(`Next interest note number requested: ${nextNumber}`, 'info');
    res.json({ interestNoteNumber: nextNumber, financialYear });
  } catch (error) {
    log(`Error fetching next interest note number: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching next interest note number.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Fetch ONLY paid bills where paymentDate > dueDate for a company
// @route  GET /api/interest-notes/late-paid-bills?companyId=xxx&financialYear=2025-26
// @access Private/Admin
//
// Returns each qualifying bill enriched with:
//   lateDays, perDayRate, suggestedInterest (at 0% rate — FE fills in monthly rate)
// ─────────────────────────────────────────────────────────────────────────────
// const getLatePaidBillsByCompany = async (req, res) => {
//   const { companyId, financialYear } = req.query;

//   if (!companyId) {
//     return res.status(400).json({ message: 'companyId is required.' });
//   }

//   try {
//     const query = {
//       company: companyId,
//       // Bill must be fully paid
//       status: 'Paid',
//       // paymentDate must exist and be later than dueDate
//       paymentDate: { $exists: true, $ne: null },
//       dueDate:     { $exists: true, $ne: null },
//     };

//     if (financialYear) {
//       query.financialYear = financialYear;
//     }

//     const bills = await Bill.find(query)
//       .select('billNumber billDate dueDate paymentDate totalAmount financialYear company status')
//       .populate('company', 'name gstNumber')
//       .sort({ billDate: -1 });

//     // ── Filter: paymentDate strictly after dueDate ────────────────────────────
//     const lateBills = bills.filter(b => {
//       if (!b.paymentDate || !b.dueDate) return false;
//       return new Date(b.paymentDate) > new Date(b.dueDate);
//     });

//     // ── Enrich each bill with lateDays & perDayRate ───────────────────────────
//     const enriched = lateBills.map(b => {
//       const lateDays  = calcLateDays(b.dueDate, b.paymentDate);
//       const perDayRate = parseFloat((b.totalAmount / 30).toFixed(4)); // base calculation; monthly rate applied on FE/create
//       return {
//         _id:          b._id,
//         billNumber:   b.billNumber,
//         billDate:     b.billDate,
//         dueDate:      b.dueDate,
//         paymentDate:  b.paymentDate,
//         totalAmount:  b.totalAmount,
//         financialYear: b.financialYear,
//         company:      b.company,
//         status:       b.status,
//         lateDays,
//         perDayRate,    // at monthly rate = 1%; actual = perDayRate * (monthlyRate / 100)
//       };
//     });

//     log(`Fetched ${enriched.length} late-paid bills for company ${companyId} FY ${financialYear || 'all'}`, 'info');
//     res.json(enriched);
//   } catch (error) {
//     log(`Error fetching late-paid bills: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching late-paid bills.' });
//   }
// };

const getLatePaidBillsByCompany = async (req, res) => {
  const { companyId, financialYear } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required.' });
  }

  try {
    const query = {
      company: companyId,
      organizationId: req.organizationId,
      status: 'Paid',
      dueDate: { $exists: true, $ne: null },
      paymentRecords: { $exists: true, $ne: [] },
    };

    if (financialYear) {
      query.financialYear = financialYear;
    }

    const bills = await Bill.find(query)
      .select(
        'billNumber billDate dueDate totalAmount financialYear company status paymentRecords'
      )
      .populate('company', 'name gstNumber')
      .sort({ billDate: -1 });

    const lateBills = bills
      .map((bill) => {
        const lastPayment =
          bill.paymentRecords?.[bill.paymentRecords.length - 1];

        if (!lastPayment?.paymentDate || !bill.dueDate) {
          return null;
        }

        const paymentDate = new Date(lastPayment.paymentDate);
        const dueDate = new Date(bill.dueDate);

        if (paymentDate <= dueDate) {
          return null;
        }

        const lateDays = calcLateDays(dueDate, paymentDate);

        const perDayRate = parseFloat(
          (bill.totalAmount / 30).toFixed(4)
        );

        return {
          _id: bill._id,
          billNumber: bill.billNumber,
          billDate: bill.billDate,
          dueDate: bill.dueDate,
          paymentDate,
          totalAmount: bill.totalAmount,
          financialYear: bill.financialYear,
          company: bill.company,
          status: bill.status,
          lateDays,
          perDayRate,
        };
      })
      .filter(Boolean);

    log(
      `Fetched ${lateBills.length} late-paid bills for company ${companyId} FY ${
        financialYear || 'all'
      }`,
      'info'
    );

    res.json(lateBills);
  } catch (error) {
    log(
      `Error fetching late-paid bills: ${error.message} - Stack: ${error.stack}`,
      'error'
    );
    res.status(500).json({
      message: 'Server error while fetching late-paid bills.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Create a new interest note
// @route  POST /api/interest-notes
// @access Private/Admin
//
// Body:
//   companyId          – required; must match bill's company
//   billId             – required; the late-paid bill
//   financialYear      – e.g. "2025-26" (auto-resolved from bill if omitted)
//   interestNoteNumber – optional; auto-generated if omitted
//   interestNoteDate   – ISO date (defaults to today)
//   monthlyInterestRate – e.g. 18 (percent per month)
//   taxType            – 'CGST_SGST' | 'IGST' | 'JOBCGST_JOBSGST' (defaults to bill's taxType)
//   cgstPercentage, sgstPercentage, igstPercentage, jobCgstPercentage, jobSgstPercentage
// ─────────────────────────────────────────────────────────────────────────────
// const createInterestNote = async (req, res) => {
//   let {
//     companyId,
//     billId,
//     financialYear,
//     interestNoteNumber,
//     interestNoteDate,
//     monthlyInterestRate,
//     taxType,
//     cgstPercentage,
//     sgstPercentage,
//     igstPercentage,
//     jobCgstPercentage,
//     jobSgstPercentage,
//   } = req.body;

//   // ── Required field validation ─────────────────────────────────────────────
//   if (!companyId) {
//     return res.status(400).json({ message: 'companyId is required. Please select a company first.' });
//   }
//   if (!billId) {
//     return res.status(400).json({ message: 'billId is required. Please select a late-paid bill.' });
//   }
//   if (monthlyInterestRate === undefined || monthlyInterestRate === null || monthlyInterestRate === '') {
//     return res.status(400).json({ message: 'monthlyInterestRate is required.' });
//   }
//   const parsedMonthlyRate = parseFloat(monthlyInterestRate);
//   if (isNaN(parsedMonthlyRate) || parsedMonthlyRate <= 0) {
//     return res.status(400).json({ message: 'monthlyInterestRate must be a positive number.' });
//   }

//   try {
//     // ── Verify company ────────────────────────────────────────────────────────
//     const company = await Company.findById(companyId);
//     if (!company) {
//       return res.status(404).json({ message: 'Company not found.' });
//     }

//     // ── Fetch original bill ───────────────────────────────────────────────────
//     const bill = await Bill.findById(billId).populate('company');
//     if (!bill) {
//       log(`Interest note creation failed: Bill not found - ID: ${billId}`, 'warn');
//       return res.status(404).json({ message: 'Original bill not found.' });
//     }

//     // ── Company ownership check ───────────────────────────────────────────────
//     if (String(bill.company._id) !== String(companyId)) {
//       return res.status(400).json({ message: 'The selected bill does not belong to the selected company.' });
//     }

//     // ── Bill must be fully paid ───────────────────────────────────────────────
//     if (bill.status !== 'Paid') {
//       return res.status(400).json({
//         message: `Interest notes can only be raised on fully Paid bills. This bill status is "${bill.status}".`,
//       });
//     }

//     // ── Must have paymentDate and dueDate ─────────────────────────────────────
//     if (!bill.dueDate || !bill.paymentDate) {
//       return res.status(400).json({ message: 'Bill must have both dueDate and paymentDate set.' });
//     }

//     // ── Payment must actually be late ─────────────────────────────────────────
//     const lateDays = calcLateDays(bill.dueDate, bill.paymentDate);
//     if (lateDays <= 0) {
//       return res.status(400).json({
//         message: `Payment was not late for bill ${bill.billNumber}. Interest note cannot be created.`,
//       });
//     }

//     // ── Resolve financial year ────────────────────────────────────────────────
//     const resolvedDate = interestNoteDate ? new Date(interestNoteDate) : new Date();
//     const resolvedFY   = financialYear || bill.financialYear || getFinancialYear(bill.billDate);

//     // ── Duplicate prevention: only one interest note per bill ─────────────────
//     const existing = await InterestNote.findOne({ originalBill: billId });
//     if (existing) {
//       return res.status(400).json({
//         message: `An interest note (${existing.interestNoteNumber}) already exists for bill ${bill.billNumber}.`,
//       });
//     }

//     // ── Auto-generate interest note number if not provided ────────────────────
//     if (!interestNoteNumber) {
//       interestNoteNumber = await generateInterestNoteNumber(resolvedFY);
//     } else {
//       // Validate format: must start with correct FY/IN/ prefix
//       const expectedPrefix = `${resolvedFY}/IN/`;
//       if (!interestNoteNumber.startsWith(expectedPrefix)) {
//         return res.status(400).json({
//           message: `interestNoteNumber must follow the format "${expectedPrefix}XX" for financial year ${resolvedFY}.`,
//         });
//       }
//     }

//     // ── Fetch tax settings (fallback) ─────────────────────────────────────────
//     const settings       = await Settings.getSettings();
//     const resolvedTaxType = taxType || bill.taxType || 'CGST_SGST';

//     const percentages = {
//       cgst:    cgstPercentage    ?? bill.cgstPercentage    ?? settings.cgstPercentage    ?? 0,
//       sgst:    sgstPercentage    ?? bill.sgstPercentage    ?? settings.sgstPercentage    ?? 0,
//       igst:    igstPercentage    ?? bill.igstPercentage    ?? settings.igstPercentage    ?? 0,
//       jobCgst: jobCgstPercentage ?? bill.jobCgstPercentage ?? settings.jobCgstPercentage ?? 0,
//       jobSgst: jobSgstPercentage ?? bill.jobSgstPercentage ?? settings.jobSgstPercentage ?? 0,
//     };

//     // ── Core interest calculation ─────────────────────────────────────────────
//     // perDayRate = (totalBillAmount × monthlyRate%) / 30
//     const perDayRate      = parseFloat(((bill.totalAmount * (parsedMonthlyRate / 100)) / 30).toFixed(4));
//     const interestAmount  = parseFloat((perDayRate * lateDays).toFixed(2));

//     if (interestAmount <= 0) {
//       return res.status(400).json({ message: 'Calculated interest amount is zero or negative. Check rate and late days.' });
//     }

//     // ── Tax calculations ──────────────────────────────────────────────────────
//     const calculated = calculateInterestNoteTotals(interestAmount, resolvedTaxType, percentages);

//     // ── Build company snapshot ────────────────────────────────────────────────
//     const companyDetailsSnapshot = bill.companyDetailsSnapshot || {
//       name:      bill.company.name,
//       address:   bill.company.address,
//       gstNumber: bill.company.gstNumber,
//     };

//     // ── Persist interest note ─────────────────────────────────────────────────
//     const newInterestNote = new InterestNote({
//       interestNoteNumber,
//       financialYear:       resolvedFY,
//       interestNoteDate:    resolvedDate,
//       originalBill:        bill._id,
//       originalBillNumber:  bill.billNumber,
//       originalBillDate:    bill.billDate,
//       company:             bill.company._id,
//       companyDetailsSnapshot,

//       // Interest calculation fields
//       monthlyInterestRate: parsedMonthlyRate,
//       perDayRate,
//       lateDays,
//       dueDate:             bill.dueDate,
//       paymentDate:         bill.paymentDate,
//       billTotalAmount:     bill.totalAmount,

//       // Financials
//       subtotal:            calculated.subtotal,
//       taxType:             resolvedTaxType,

//       cgstPercentage:      resolvedTaxType === 'CGST_SGST'        ? calculated.cgstPercentage    : 0,
//       cgstAmount:          resolvedTaxType === 'CGST_SGST'        ? calculated.cgstAmount        : 0,
//       sgstPercentage:      resolvedTaxType === 'CGST_SGST'        ? calculated.sgstPercentage    : 0,
//       sgstAmount:          resolvedTaxType === 'CGST_SGST'        ? calculated.sgstAmount        : 0,

//       igstPercentage:      resolvedTaxType === 'IGST'             ? calculated.igstPercentage    : 0,
//       igstAmount:          resolvedTaxType === 'IGST'             ? calculated.igstAmount        : 0,

//       jobCgstPercentage:   resolvedTaxType === 'JOBCGST_JOBSGST'  ? calculated.jobCgstPercentage : 0,
//       jobCgstAmount:       resolvedTaxType === 'JOBCGST_JOBSGST'  ? calculated.jobCgstAmount     : 0,
//       jobSgstPercentage:   resolvedTaxType === 'JOBCGST_JOBSGST'  ? calculated.jobSgstPercentage : 0,
//       jobSgstAmount:       resolvedTaxType === 'JOBCGST_JOBSGST'  ? calculated.jobSgstAmount     : 0,

//       totalTaxAmount:      calculated.totalTaxAmount,
//       totalAmount:         calculated.totalAmount,
//       amountInWords:       amountToWords(calculated.totalAmount) || '',
//       status:              'Pending',
//       createdBy:           req.user._id,
//     });

//     const savedNote = await newInterestNote.save();

//     // ── Link back to bill ─────────────────────────────────────────────────────
//     bill.interestNote = savedNote._id;
//     await bill.save();

//     log(
//       `Interest note created: ${savedNote.interestNoteNumber} (FY ${resolvedFY}) for bill ${bill.billNumber} ` +
//       `| Late days: ${lateDays} | Rate: ${parsedMonthlyRate}%/month | Amount: ${calculated.totalAmount} ` +
//       `by ${req.user.email}`,
//       'info'
//     );

//     res.status(201).json(savedNote);
//   } catch (error) {
//     log(`Error creating interest note: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (error.code === 11000) {
//       return res.status(400).json({
//         message: `Interest note number '${interestNoteNumber}' already exists. Please refresh and try again.`,
//       });
//     }
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server error while creating interest note.' });
//   }
// };

const createInterestNote = async (req, res) => {
  let {
    companyId,
    billId,
    financialYear,
    interestNoteNumber,
    interestNoteDate,
    monthlyInterestRate,
    taxType,
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    jobCgstPercentage,
    jobSgstPercentage,
  } = req.body;

  // ── Required validation ──────────────────────────────────────────────────
  if (!companyId) {
    return res.status(400).json({
      message: 'companyId is required. Please select a company first.',
    });
  }

  if (!billId) {
    return res.status(400).json({
      message: 'billId is required. Please select a late-paid bill.',
    });
  }

  if (
    monthlyInterestRate === undefined ||
    monthlyInterestRate === null ||
    monthlyInterestRate === ''
  ) {
    return res.status(400).json({
      message: 'monthlyInterestRate is required.',
    });
  }

  const parsedMonthlyRate = parseFloat(monthlyInterestRate);

  if (isNaN(parsedMonthlyRate) || parsedMonthlyRate <= 0) {
    return res.status(400).json({
      message: 'monthlyInterestRate must be a positive number.',
    });
  }

  try {
    // ── Verify company ──────────────────────────────────────────────────────
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        message: 'Company not found.',
      });
    }

    // ── Fetch original bill ────────────────────────────────────────────────
    const bill = await Bill.findById(billId)
      .populate('company')
      .select(
        'paymentRecords dueDate totalAmount billDate billNumber financialYear taxType cgstPercentage sgstPercentage igstPercentage jobCgstPercentage jobSgstPercentage company companyDetailsSnapshot status'
      );

    if (!bill) {
      return res.status(404).json({
        message: 'Original bill not found.',
      });
    }

    // ── Company validation ────────────────────────────────────────────────
    if (String(bill.company._id) !== String(companyId)) {
      return res.status(400).json({
        message:
          'The selected bill does not belong to the selected company.',
      });
    }

    // ── Paid validation ───────────────────────────────────────────────────
    if (bill.status !== 'Paid') {
      return res.status(400).json({
        message: `Interest notes can only be raised on fully Paid bills. Current status is "${bill.status}".`,
      });
    }

    // ── Latest payment date from paymentRecords ───────────────────────────
    const lastPayment =
      bill.paymentRecords?.[bill.paymentRecords.length - 1];

    if (!bill.dueDate || !lastPayment?.paymentDate) {
      return res.status(400).json({
        message:
          'Bill must have both dueDate and paymentRecords.paymentDate set.',
      });
    }

    const paymentDate = new Date(lastPayment.paymentDate);

    // ── Late days ─────────────────────────────────────────────────────────
    const lateDays = calcLateDays(bill.dueDate, paymentDate);

    if (lateDays <= 0) {
      return res.status(400).json({
        message: `Payment was not late for bill ${bill.billNumber}.`,
      });
    }

    // ── Financial year (from note date, not bill) ───────────────────────────
    const resolvedDate = interestNoteDate
      ? new Date(interestNoteDate)
      : new Date();

    const resolvedFY = getFinancialYear(resolvedDate);

    // ── Prevent duplicate note ────────────────────────────────────────────
    const existing = await InterestNote.findOne({
      originalBill: billId,
    });

    if (existing) {
      return res.status(400).json({
        message: `Interest note (${existing.interestNoteNumber}) already exists for this bill.`,
      });
    }

    // ── Auto generate note number ─────────────────────────────────────────
    if (!interestNoteNumber) {
      interestNoteNumber =
        await generateInterestNoteNumber(resolvedFY, req.organizationId);
    } else {
      const expectedPrefix = `${resolvedFY}/IN/`;

      if (!interestNoteNumber.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: `interestNoteNumber must start with "${expectedPrefix}"`,
        });
      }
    }

    // ── Tax settings ──────────────────────────────────────────────────────
    const settings = await Settings.getSettings(req.organizationId);

    const resolvedTaxType =
      taxType || bill.taxType || 'CGST_SGST';

    const percentages = {
      cgst:
        cgstPercentage ??
        bill.cgstPercentage ??
        settings.cgstPercentage ??
        0,
      sgst:
        sgstPercentage ??
        bill.sgstPercentage ??
        settings.sgstPercentage ??
        0,
      igst:
        igstPercentage ??
        bill.igstPercentage ??
        settings.igstPercentage ??
        0,
      jobCgst:
        jobCgstPercentage ??
        bill.jobCgstPercentage ??
        settings.jobCgstPercentage ??
        0,
      jobSgst:
        jobSgstPercentage ??
        bill.jobSgstPercentage ??
        settings.jobSgstPercentage ??
        0,
    };

    // ── Interest calculation ──────────────────────────────────────────────
    const perDayRate = parseFloat(
      (
        (bill.totalAmount * (parsedMonthlyRate / 100)) /
        30
      ).toFixed(4)
    );

    const interestAmount = parseFloat(
      (perDayRate * lateDays).toFixed(2)
    );

    if (interestAmount <= 0) {
      return res.status(400).json({
        message:
          'Calculated interest amount is zero or negative.',
      });
    }

    // ── Tax totals ────────────────────────────────────────────────────────
    const calculated = calculateInterestNoteTotals(
      interestAmount,
      resolvedTaxType,
      percentages
    );

    // ── Company snapshot ──────────────────────────────────────────────────
    const companyDetailsSnapshot =
      bill.companyDetailsSnapshot || {
        name: bill.company.name,
        address: bill.company.address,
        gstNumber: bill.company.gstNumber,
      };

    // ── Create note ───────────────────────────────────────────────────────
    const newInterestNote = new InterestNote({
      interestNoteNumber,
      financialYear: resolvedFY,
      interestNoteDate: resolvedDate,

      originalBill: bill._id,
      originalBillNumber: bill.billNumber,
      originalBillDate: bill.billDate,

      company: bill.company._id,
      companyDetailsSnapshot,

      monthlyInterestRate: parsedMonthlyRate,
      perDayRate,
      lateDays,
      dueDate: bill.dueDate,
      paymentDate,
      billTotalAmount: bill.totalAmount,

      subtotal: calculated.subtotal,
      taxType: resolvedTaxType,

      cgstPercentage:
        resolvedTaxType === 'CGST_SGST'
          ? calculated.cgstPercentage
          : 0,
      cgstAmount:
        resolvedTaxType === 'CGST_SGST'
          ? calculated.cgstAmount
          : 0,

      sgstPercentage:
        resolvedTaxType === 'CGST_SGST'
          ? calculated.sgstPercentage
          : 0,
      sgstAmount:
        resolvedTaxType === 'CGST_SGST'
          ? calculated.sgstAmount
          : 0,

      igstPercentage:
        resolvedTaxType === 'IGST'
          ? calculated.igstPercentage
          : 0,
      igstAmount:
        resolvedTaxType === 'IGST'
          ? calculated.igstAmount
          : 0,

      jobCgstPercentage:
        resolvedTaxType === 'JOBCGST_JOBSGST'
          ? calculated.jobCgstPercentage
          : 0,
      jobCgstAmount:
        resolvedTaxType === 'JOBCGST_JOBSGST'
          ? calculated.jobCgstAmount
          : 0,

      jobSgstPercentage:
        resolvedTaxType === 'JOBCGST_JOBSGST'
          ? calculated.jobSgstPercentage
          : 0,
      jobSgstAmount:
        resolvedTaxType === 'JOBCGST_JOBSGST'
          ? calculated.jobSgstAmount
          : 0,

      totalTaxAmount: calculated.totalTaxAmount,
      totalAmount: calculated.totalAmount,
      amountInWords:
        amountToWords(calculated.totalAmount) || '',

      status: 'Pending',
      createdBy: req.user._id,
      organizationId: req.organizationId,
    });

    const savedNote = await newInterestNote.save();

    // ✅ SAFE BILL UPDATE (NO PRE-SAVE CRASH)
    await Bill.findByIdAndUpdate(
      bill._id,
      {
        $set: {
          interestNote: savedNote._id,
        },
      },
      { new: true }
    );

    log(
      `Interest note created: ${savedNote.interestNoteNumber} for bill ${bill.billNumber}`,
      'info'
    );

    res.status(201).json(savedNote);
  } catch (error) {
    log(
      `Error creating interest note: ${error.message} - Stack: ${error.stack}`,
      'error'
    );

    if (error.code === 11000) {
      return res.status(400).json({
        message: `Interest note number '${interestNoteNumber}' already exists.`,
      });
    }

    res.status(500).json({
      message: 'Server error while creating interest note.',
    });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get all interest notes (with optional filters)
// @route  GET /api/interest-notes
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getInterestNotes = async (req, res) => {
  const { companyId, startDate, endDate, status, financialYear } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId)     query.company       = companyId;
  if (status)        query.status        = status;
  if (financialYear) query.financialYear = financialYear;

  if (startDate && endDate) {
    query.interestNoteDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.interestNoteDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.interestNoteDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const notes = await InterestNote.find(query)
      .populate('company',      'name gstNumber')
      .populate('originalBill', 'billNumber billDate')
      .populate('createdBy',    'username email')
      .sort({ interestNoteDate: -1, createdAt: -1 });

    log(`Fetched ${notes.length} interest notes | query: ${JSON.stringify(query)} by ${req.user.email}`, 'info');
    res.json(notes);
  } catch (error) {
    log(`Error fetching interest notes: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching interest notes.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get a single interest note by ID
// @route  GET /api/interest-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getInterestNoteById = async (req, res) => {
  try {
    const note = await InterestNote.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('company',      'name address gstNumber mobileNumber')
      .populate('originalBill', 'billNumber billDate')
      .populate('createdBy',    'username email');

    if (!note) {
      log(`Interest note not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Interest note not found.' });
    }

    log(`Fetched interest note: ${note.interestNoteNumber} by ${req.user.email}`, 'info');
    res.json(note);
  } catch (error) {
    log(`Error fetching interest note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching interest note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Update interest note status
// @route  PUT /api/interest-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const updateInterestNote = async (req, res) => {
  const noteId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Paid', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` });
  }

  try {
    const note = await InterestNote.findById(noteId);
    if (!note) {
      log(`Interest note update failed: Not found - ID: ${noteId}`, 'warn');
      return res.status(404).json({ message: 'Interest note not found.' });
    }

    if (note.organizationId && String(note.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    if (status !== undefined) note.status = status;

    const updatedNote = await note.save();
    log(`Interest note updated: ${updatedNote.interestNoteNumber} → status: ${updatedNote.status} by ${req.user.email}`, 'info');
    res.json(updatedNote);
  } catch (error) {
    log(`Error updating interest note ID ${noteId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating interest note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Delete an interest note
// @route  DELETE /api/interest-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const deleteInterestNote = async (req, res) => {
  try {
    const note = await InterestNote.findById(req.params.id);
    if (!note) {
      log(`Interest note deletion failed: Not found - ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Interest note not found.' });
    }

    if (note.organizationId && String(note.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    // Unlink from bill
    if (note.originalBill) {
      await Bill.findByIdAndUpdate(note.originalBill, { $unset: { interestNote: 1 } });
    }

    await note.deleteOne();
    log(`Interest note deleted: ${note.interestNoteNumber} by ${req.user.email}`, 'info');
    res.json({ message: 'Interest note removed successfully.' });
  } catch (error) {
    log(`Error deleting interest note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting interest note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Generate and stream PDF for an interest note
// @route  GET /api/interest-notes/:id/pdf
// @access Private/Admin
//
// PDF Layout mirrors credit note layout:
//  - Company header (name, address, GSTIN)
//  - Left: Buyer details      Right: Interest Note No, Date, FY, Original Bill No
//  - Item table: Sr | Description | Rate (per day) | Late Days | Amount
//  - Tax summary, Amount in words
//  - Bank details + Declaration + Footer
// ─────────────────────────────────────────────────────────────────────────────
const generateInterestNotePdf = async (req, res) => {
  const noteId = req.params.id;

  try {
    const org = await getOrgDetails(req.organizationId);
    const note = await InterestNote.findOne({ _id: noteId, organizationId: req.organizationId })
      .populate('company')
      .populate('originalBill', 'billNumber billDate');

    if (!note) {
      log(`PDF generation failed: Interest note not found - ID: ${noteId}`, 'warn');
      return res.status(404).json({ message: 'Interest note not found.' });
    }

    // ── PDF setup ─────────────────────────────────────────────────────────────
    const pdfDoc   = await PDFDocument.create();
    let   page     = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const leftMargin   = 40;
    const rightMargin  = width - 40;
    const contentWidth = rightMargin - leftMargin;
    let   y            = height - 40;

    const lineSpacing = 18;
    const smallLineSpacing = 12;
    const itemLineSpacing = 16;

    // ── Utility: draw text and return consumed height ─────────────────────────
    const drawText = (text, xPos, currentY, options = {}) => {
      const str         = String(text ?? '').replace(/₹/g, 'INR ');
      const usedFont    = options.font      || font;
      const size        = options.size      || 10;
      const color       = options.color     || rgb(0, 0, 0);
      const lineHeight  = options.lineHeight || size * 1.3;
      const maxWidth    = options.maxWidth;
      const spacingAfter = options.spacingAfter !== undefined ? options.spacingAfter : 3;
      const align       = options.align || 'left';

      let drawX = xPos;
      if (align === 'center') {
        const tw = usedFont.widthOfTextAtSize(str, size);
        drawX = leftMargin + (contentWidth - tw) / 2;
      } else if (align === 'right' && maxWidth) {
        const tw = usedFont.widthOfTextAtSize(str, size);
        drawX = xPos + maxWidth - tw;
      }

      page.drawText(str, { x: drawX, y: currentY, font: usedFont, size, color, lineHeight, maxWidth, wordBreaks: [' ', '-', '/'] });

      let numLines = str.split('\n').length;
      if (maxWidth && usedFont.widthOfTextAtSize(str.replace(/\n/g, ' '), size) > maxWidth) {
        numLines = 0;
        str.split('\n').forEach(seg => {
          if (!seg.trim()) { numLines++; return; }
          let cur = '', lines = 1;
          seg.split(' ').forEach(word => {
            const test = cur ? `${cur} ${word}` : word;
            if (usedFont.widthOfTextAtSize(test, size) > maxWidth) { lines++; cur = word; }
            else cur = test;
          });
          numLines += lines;
        });
      }
      const textHeight = str.trim() === '' ? 0 : numLines * lineHeight;
      return textHeight + spacingAfter;
    };

    // ── HEADER ────────────────────────────────────────────────────────────────
    let currentY = y;

    const topHeaderTextY = currentY;
    const shreeGaneshText = 'SHREE GANESHAY NAMAH';
    const shreeGaneshFontSize = 10;
    const shreeGaneshOptions = {
      font: boldFont,
      size: shreeGaneshFontSize,
      align: 'center',
      color: rgb(0.2, 0.2, 0.2),
      spacingAfter: 0,
    };
    const shreeGaneshHeight = drawText(shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);

    const interestNoteText = 'INTEREST NOTE';
    const interestNoteFontSize = 14;
    const interestNoteWidth = boldFont.widthOfTextAtSize(interestNoteText, interestNoteFontSize);
    const interestNoteOptions = {
      font: boldFont,
      size: interestNoteFontSize,
      color: rgb(0.7, 0.15, 0.1),
      spacingAfter: 0,
    };
    const interestNoteHeight = drawText(
      interestNoteText,
      rightMargin - interestNoteWidth,
      topHeaderTextY,
      interestNoteOptions
    );

    currentY -= Math.max(shreeGaneshHeight, interestNoteHeight) + 18;

    const companyNameText = org.name;
    const companyNameFontSize = 25;
    currentY -= drawText(companyNameText, leftMargin, currentY, {
      font: boldFont,
      size: companyNameFontSize,
      align: 'center',
      color: rgb(0.1, 0.3, 0.5),
    });

    const addressText = org.address;
    currentY -= drawText(addressText, leftMargin, currentY + 14, {
      size: 9,
      align: 'center',
      maxWidth: contentWidth,
      spacingAfter: 4,
    });

    const companyGSTIN = org.gstin;
    const companyStateCode = companyGSTIN.substring(0, 2);
    const gstinWithStateText = `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`;
    currentY -= drawText(gstinWithStateText, leftMargin, currentY + 14, {
      size: 10,
      align: 'center',
      spacingAfter: 15,
    });

    y = currentY;

    // ── BUYER + RIGHT DETAIL PANELS ───────────────────────────────────────────
    const buyerName    = note.companyDetailsSnapshot?.name      || note.company?.name      || 'N/A';
    const buyerAddress = note.companyDetailsSnapshot?.address   || note.company?.address   || 'N/A';
    const buyerGstin   = note.companyDetailsSnapshot?.gstNumber || note.company?.gstNumber || 'N/A';
    const buyerStateCode = buyerGstin !== 'N/A' && buyerGstin.length >= 2 ? buyerGstin.substring(0, 2) : 'N/A';

    let yLeft  = y;
    let yRight = y;

    const detailsMaxWidth      = contentWidth / 2 - 20;
    const rightColWidth        = 180;
    const rightColX            = rightMargin - rightColWidth;
    const rightColMaxWidth     = rightColWidth - 10;

    // Panel backgrounds (matching bill PDF)
    page.drawRectangle({
      x: leftMargin,
      y: yLeft - 84,
      width: detailsMaxWidth + 20,
      height: 100,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    page.drawRectangle({
      x: rightColX - 5,
      y: yRight - 64,
      width: rightColWidth,
      height: 80,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    // Left: Buyer info
    yLeft -= drawText('Buyer:', leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
    yLeft -= drawText(buyerName,    leftMargin + 5, yLeft, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth });
    yLeft -= drawText(buyerAddress, leftMargin + 5, yLeft, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
    yLeft -= drawText(`GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`, leftMargin + 5, yLeft, {
      font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth,
    });

    // Right: Interest note meta (matching bill PDF style)
    yRight -= drawText(`Date : ${new Date(note.interestNoteDate).toLocaleDateString('en-IN')}`, rightColX, yRight, {
      size: 10, spacingAfter: 4, maxWidth: rightColMaxWidth,
    });
    yRight -= drawText(`Interest Note No : ${note.interestNoteNumber || 'N/A'}`, rightColX, yRight, {
      size: 10, spacingAfter: 4, maxWidth: rightColMaxWidth,
    });
    yRight -= drawText(`Original Bill No : ${note.originalBillNumber || 'N/A'}`, rightColX, yRight, {
      size: 10, spacingAfter: 4, maxWidth: rightColMaxWidth,
    });

    y = Math.min(yLeft, yRight) - lineSpacing;

    // ── HORIZONTAL RULE ───────────────────────────────────────────────────────
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    // ── ITEM TABLE HEADER ─────────────────────────────────────────────────────
    page.drawRectangle({
      x: leftMargin,
      y: y - 22,
      width: contentWidth,
      height: 20,
      color: rgb(0.1, 0.3, 0.5),
      opacity: 0.1,
    });
    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= smallLineSpacing;

    // Col positions matching bill PDF style
    const colPositions = {
      srNo: leftMargin + 10,
      desc: leftMargin + 50,
      rate: leftMargin + 340,
      days: leftMargin + 410,
      amount: rightMargin - 80,
    };

    const headerOptions = { font: boldFont, size: 10, spacingAfter: 0, color: rgb(0.1, 0.1, 0.1) };
    drawText('Sr No.', colPositions.srNo, y, headerOptions);
    drawText('Description', colPositions.desc, y, {
      ...headerOptions,
      maxWidth: colPositions.rate - colPositions.desc - 15,
    });
    drawText('Rate/Day', colPositions.rate, y, headerOptions);
    drawText('Late Days', colPositions.days, y, headerOptions);
    const amountHeaderText = 'Amount';
    const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeaderText, 10);
    drawText(amountHeaderText, rightMargin - amountHeaderWidth - 10, y, headerOptions);

    y -= smallLineSpacing;
    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= itemLineSpacing;

    // ── ITEM TABLE ROW ────────────────────────────────────────────────────────
    // Single interest line item
    const itemRowOptions = { size: 9, spacingAfter: 0 };
    let maxHeightThisRow = 0;

    page.drawRectangle({
      x: leftMargin,
      y: y - 5,
      width: contentWidth,
      height: 16,
      color: rgb(0.98, 0.98, 0.98),
      opacity: 0.5,
    });

    maxHeightThisRow = Math.max(maxHeightThisRow, drawText('1', colPositions.srNo, y, itemRowOptions));
    maxHeightThisRow = Math.max(maxHeightThisRow, drawText('INTEREST ON LATE PAYMENT RECEIVED', colPositions.desc, y, {
      ...itemRowOptions,
      maxWidth: colPositions.rate - colPositions.desc - 15,
    }));
    maxHeightThisRow = Math.max(maxHeightThisRow, drawText(`INR ${note.perDayRate.toFixed(4)}`, colPositions.rate, y, {
      ...itemRowOptions,
      maxWidth: colPositions.days - colPositions.rate - 10,
    }));
    maxHeightThisRow = Math.max(maxHeightThisRow, drawText(`${note.lateDays}`, colPositions.days, y, {
      ...itemRowOptions,
      maxWidth: colPositions.amount - colPositions.days - 10,
    }));
    const amtStr = `INR ${note.subtotal.toFixed(2)}`;
    const amtW = font.widthOfTextAtSize(amtStr, 9);
    maxHeightThisRow = Math.max(maxHeightThisRow, drawText(amtStr, rightMargin - amtW - 10, y, itemRowOptions));

    y -= maxHeightThisRow + itemLineSpacing / 2;

    // Minimum rows for consistent layout
    const minItemRows = 7;
    for (let i = 1; i < minItemRows; i++) {
      y -= itemLineSpacing;
    }

    // ── TABLE FOOTER RULE ─────────────────────────────────────────────────────
    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= smallLineSpacing + 1;

    // ── TAX SUMMARY (right-aligned block matching bill PDF) ───────────────────
    const totalsLabelX = rightMargin - 230;
    const totalsValueX = rightMargin - 100;

    const drawTotalRow = (label, valueStr, isBold = false) => {
      const commonOpt = { size: 10, font: isBold ? boldFont : font, spacingAfter: 2 };
      const labelMaxWidth = totalsValueX - totalsLabelX - 15;
      const valueMaxWidth = rightMargin - totalsValueX - 10;

      const hLabel = drawText(label, totalsLabelX, y, { ...commonOpt, maxWidth: labelMaxWidth });
      const valWidth = (isBold ? boldFont : font).widthOfTextAtSize(valueStr, commonOpt.size);
      const valXPos = rightMargin - valWidth - 10;
      const hValue = drawText(valueStr, valXPos, y, { ...commonOpt, maxWidth: valueMaxWidth });

      y -= Math.max(hLabel, hValue) + smallLineSpacing - commonOpt.spacingAfter;
    };

    page.drawRectangle({
      x: totalsLabelX - 10,
      y: y - 114,
      width: rightMargin - totalsLabelX + 15,
      height: 124,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    drawTotalRow('Subtotal (Interest):', `INR ${note.subtotal.toFixed(2)}`);

    if (note.taxType === 'CGST_SGST') {
      drawTotalRow(`CGST @ ${note.cgstPercentage}%:`, `+ INR ${note.cgstAmount.toFixed(2)}`);
      drawTotalRow(`SGST @ ${note.sgstPercentage}%:`, `+ INR ${note.sgstAmount.toFixed(2)}`);
    } else if (note.taxType === 'IGST') {
      drawTotalRow(`IGST @ ${note.igstPercentage}%:`, `+ INR ${note.igstAmount.toFixed(2)}`);
    } else if (note.taxType === 'JOBCGST_JOBSGST') {
      drawTotalRow(`Job CGST @ ${note.jobCgstPercentage}%:`, `+ INR ${note.jobCgstAmount.toFixed(2)}`);
      drawTotalRow(`Job SGST @ ${note.jobSgstPercentage}%:`, `+ INR ${note.jobSgstAmount.toFixed(2)}`);
    }

    y -= 5;
    page.drawLine({
      start: { x: totalsLabelX - 10, y: y + smallLineSpacing / 2 },
      end: { x: rightMargin, y: y + smallLineSpacing / 2 },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 3;

    drawTotalRow('TOTAL AMOUNT:', `INR ${note.totalAmount.toFixed(2)}`, true);

    // ── AMOUNT IN WORDS ───────────────────────────────────────────────────────
    y -= 8;
    if (note.amountInWords) {
      y -= drawText(`Amount in Words: ${note.amountInWords}`, leftMargin, y, {
        font: boldFont,
        size: 10,
        spacingAfter: 8,
        maxWidth: contentWidth,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    y -= 2;
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    // ── INTEREST CALCULATION DETAIL ───────────────────────────────────────────
    page.drawRectangle({
      x: leftMargin,
      y: y - 36,
      width: contentWidth,
      height: 48,
      color: rgb(0.96, 0.97, 1),
      opacity: 0.8,
    });
    drawText('Interest Calculation Details:', leftMargin + 4, y, {
      font: boldFont, size: 9, spacingAfter: 3, color: rgb(0.1, 0.3, 0.5),
    });
    y -= 14;
    const calcLine = `Bill Amount: INR ${note.billTotalAmount.toFixed(2)}  |  Monthly Rate: ${note.monthlyInterestRate}%  |  Per Day Rate: INR ${note.perDayRate.toFixed(4)}  |  Late Days: ${note.lateDays}  |  Due Date: ${new Date(note.dueDate).toLocaleDateString('en-IN')}  |  Payment Date: ${new Date(note.paymentDate).toLocaleDateString('en-IN')}`;
    drawText(calcLine, leftMargin + 4, y, {
      size: 8, maxWidth: contentWidth - 8, color: rgb(0.25, 0.25, 0.25),
    });
    y -= 32;

    // ── DIVIDER ───────────────────────────────────────────────────────────────
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    // ── BANK DETAILS (left) + SIGNATORY (right) ───────────────────────────────
    const bankMaxWidth = contentWidth * 0.5;

    y -= drawText('Bank Details:', leftMargin, y, { font: boldFont, size: 12, spacingAfter: 4 });
    y -= drawText(`Bank Name: ${org.bankName}`,         leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawText(`Account Name: ${org.accountName}`,        leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawText(`Account No.: ${org.accountNo}`,            leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawText(`IFSC Code: ${org.ifsc}`,                 leftMargin, y, { size: 10, spacingAfter: 10, maxWidth: bankMaxWidth });

    const forCoText = `For ${org.name}`;
    const forCoSize = 11;
    const forCoW    = boldFont.widthOfTextAtSize(forCoText, forCoSize);
    let   declY     = y;

    const declTitleH = drawText('Declaration:', leftMargin, declY, { font: boldFont, size: 12, spacingAfter: 4 });
    drawText(forCoText, rightMargin - forCoW, declY, { font: boldFont, size: forCoSize, spacingAfter: 3 });
    declY -= declTitleH;

    const declarations = [
      'This interest note is issued on account of delayed payment received.',
      'Interest is calculated as per agreed terms / applicable rate.',
      'Subject to Surat jurisdiction.',
    ];

    let lastDeclLineY = declY;
    declarations.forEach((line, i) => {
      const h = drawText(line, leftMargin, declY, { size: 9, spacingAfter: 3, maxWidth: contentWidth * 0.6 });
      declY -= h;
      if (i === declarations.length - 1) lastDeclLineY = declY + h - 3;
    });

    const authText = 'Authorised Signatory';
    const authW    = font.widthOfTextAtSize(authText, 9);
    drawText(authText, rightMargin - authW, lastDeclLineY, { size: 9, spacingAfter: 0 });

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footerY = 30;
    page.drawRectangle({ x: leftMargin, y: footerY - 8, width: contentWidth, height: 20, color: rgb(0.1, 0.3, 0.5), opacity: 0.1 });
    const contactText = `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
    const contactW    = font.widthOfTextAtSize(contactText, 9);
    drawText(contactText, leftMargin + (contentWidth - contactW) / 2, footerY, {
      size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3),
    });

    // ── STREAM PDF ────────────────────────────────────────────────────────────
    const pdfBytes  = await pdfDoc.save();
    const pdfFileName = `InterestNote-${note.interestNoteNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    log(`PDF generated for interest note ${note.interestNoteNumber}`, 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    log(`Error generating PDF for interest note ID ${noteId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating interest note PDF.' });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // Route handlers
  getNextInterestNoteNumber,
  getLatePaidBillsByCompany,
  createInterestNote,
  getInterestNotes,
  getInterestNoteById,
  updateInterestNote,
  deleteInterestNote,
  generateInterestNotePdf,

  // Shared helpers (useful for unit tests / other modules)
  getFinancialYear,
  generateInterestNoteNumber,
  calculateInterestNoteTotals,
  calcLateDays,
  amountToWords,
};