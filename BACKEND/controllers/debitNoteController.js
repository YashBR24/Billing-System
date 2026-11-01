const DebitNote  = require('../models/DebitNote');
const Purchase   = require('../models/Purchase');
const Company    = require('../models/Company');
const Settings   = require('../models/Settings');
const { log }    = require('../middleware/logger');
const fsPromises = require('fs').promises;
const fs         = require('fs');
const path       = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

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
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate next debit note number for a given financial year
// Format: 2025-26/DN01, 2025-26/DN02 … resets every financial year
// ─────────────────────────────────────────────────────────────────────────────
const generateDebitNoteNumber = async (financialYear) => {
  const prefix   = `${financialYear}/DN`;
  const escaped  = prefix.replace(/-/g, '\\-').replace(/\//g, '\\/');
  const lastNote = await DebitNote.findOne({
    debitNoteNumber: { $regex: `^${escaped}` },
  }).sort({ debitNoteNumber: -1 });

  let nextSeq = 1;
  if (lastNote) {
    // Strip the prefix then parse the trailing digits
    const seq = lastNote.debitNoteNumber.replace(`${financialYear}/DN`, '');
    const num = parseInt(seq, 10);
    if (!isNaN(num)) nextSeq = num + 1;
  }
  return `${financialYear}/DN${String(nextSeq).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Calculate totals from raw item array + tax config
// ─────────────────────────────────────────────────────────────────────────────
const calculateDebitNoteTotals = (
  items,
  discountPercentage,
  taxType,
  cgstPercentage,
  sgstPercentage,
  igstPercentage,
  jobCgstPercentage,
  jobSgstPercentage
) => {
  let subTotalAmount = 0;

  const calculatedItems = items.map(item => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate     = parseFloat(item.rate)     || 0;
    const amount   = parseFloat((quantity * rate).toFixed(2));
    subTotalAmount += amount;
    return {
      description: item.description,
      hsnSacCode:  item.hsnSacCode,
      quantity,
      rate,
      amount,
    };
  });

  subTotalAmount = parseFloat(subTotalAmount.toFixed(2));

  const discountAmount    = parseFloat((subTotalAmount * (parseFloat(discountPercentage) / 100)).toFixed(2)) || 0;
  const amountAfterDiscount = parseFloat((subTotalAmount - discountAmount).toFixed(2));

  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, jobCgstAmount = 0, jobSgstAmount = 0;

  if (taxType === 'CGST_SGST') {
    cgstAmount = parseFloat((amountAfterDiscount * (parseFloat(cgstPercentage) / 100)).toFixed(2)) || 0;
    sgstAmount = parseFloat((amountAfterDiscount * (parseFloat(sgstPercentage) / 100)).toFixed(2)) || 0;
  } else if (taxType === 'IGST') {
    igstAmount = parseFloat((amountAfterDiscount * (parseFloat(igstPercentage) / 100)).toFixed(2)) || 0;
  } else if (taxType === 'JOBCGST_JOBSGST') {
    jobCgstAmount = parseFloat((amountAfterDiscount * (parseFloat(jobCgstPercentage) / 100)).toFixed(2)) || 0;
    jobSgstAmount = parseFloat((amountAfterDiscount * (parseFloat(jobSgstPercentage) / 100)).toFixed(2)) || 0;
  }

  const totalTaxAmount = parseFloat((cgstAmount + sgstAmount + igstAmount + jobCgstAmount + jobSgstAmount).toFixed(2));
  const totalAmount    = parseFloat((amountAfterDiscount + totalTaxAmount).toFixed(2));

  return {
    items: calculatedItems,
    subTotalAmount,
    discountAmount,
    amountAfterDiscount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    jobCgstAmount,
    jobSgstAmount,
    totalTaxAmount,
    totalAmount,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Amount to words (Indian numbering system)
// ─────────────────────────────────────────────────────────────────────────────
const amountToWords = number => {
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
  const thousand = Math.floor(mainNum / 1000);     mainNum %= 1000;
  const hundred  = Math.floor(mainNum / 100);      mainNum %= 100;

  if (crore    > 0) str += (crore    > 19 ? tens[Math.floor(crore    / 10)] + ones[crore    % 10] : ones[crore])    + 'Crore ';
  if (lakh     > 0) str += (lakh     > 19 ? tens[Math.floor(lakh     / 10)] + ones[lakh     % 10] : ones[lakh])     + 'Lakh ';
  if (thousand > 0) str += (thousand > 19 ? tens[Math.floor(thousand / 10)] + ones[thousand % 10] : ones[thousand]) + 'Thousand ';
  if (hundred  > 0) str += (hundred  > 19 ? tens[Math.floor(hundred  / 10)] + ones[hundred  % 10] : ones[hundred])  + 'Hundred ';
  if (mainNum  > 0) str += (str !== '' && mainNum < 100 ? 'and ' : '') + (mainNum > 19 ? tens[Math.floor(mainNum / 10)] + ones[mainNum % 10] : ones[mainNum]);

  const finalStr = (str.trim() + ' Rupees Only').trim();
  return finalStr.length > 'Rupees Only'.length ? finalStr : 'Zero Rupees Only';
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get next debit note number preview (for UI auto-fill)
// @route  GET /api/debit-notes/next-number?financialYear=2025-26
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getNextDebitNoteNumber = async (req, res) => {
  try {
    const financialYear = req.query.financialYear || getFinancialYear();
    const nextNumber    = await generateDebitNoteNumber(financialYear);
    log(`Next debit note number preview: ${nextNumber} (FY ${financialYear})`, 'info');
    res.json({ debitNoteNumber: nextNumber, financialYear });
  } catch (error) {
    log(`Error fetching next debit note number: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching next debit note number.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get unpaid / partially-paid purchase bills for a supplier company
//         filtered by financialYear; excludes bills already linked to a debit note
// @route  GET /api/debit-notes/unpaid-purchases?companyId=xxx&financialYear=2025-26
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getUnpaidPurchasesByCompany = async (req, res) => {
  const { companyId, financialYear } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required.' });
  }

  try {
    const query = {
      supplierCompany: companyId,
      // Only purchases that still owe money
      paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
      // Exclude purchases already linked to a debit note
      $or: [
        { debitNote: { $exists: false } },
        { debitNote: null },
      ],
    };

    // Filter by financial year if provided (uses stored field, falls back to date range)
    if (financialYear) {
      // Prefer direct FY field on Purchase if it exists; otherwise date-range fallback
      const fyQuery = { financialYear };
      const testCount = await Purchase.countDocuments({ ...query, ...fyQuery });
      if (testCount > 0) {
        Object.assign(query, fyQuery);
      } else {
        // Date-range fallback for purchases that don't store financialYear directly
        const [startYearStr] = financialYear.split('-');
        const startYear = parseInt(startYearStr, 10);
        const endYear   = startYear + 1;
        query.purchaseBillDate = {
          $gte: new Date(`${startYear}-04-01T00:00:00.000Z`),
          $lte: new Date(`${endYear}-03-31T23:59:59.999Z`),
        };
      }
    }

    const purchases = await Purchase.find(query)
      .select('purchaseBillNumber purchaseBillDate amount paymentStatus supplierCompany financialYear purchaseType')
      .populate('supplierCompany', 'name')
      .sort({ purchaseBillDate: -1 });

    log(
      `Fetched ${purchases.length} unpaid purchases for company ${companyId} FY ${financialYear || 'all'}`,
      'info'
    );
    res.json(purchases);
  } catch (error) {
    log(`Error fetching unpaid purchases: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching unpaid purchases.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Create a new debit note (purchase return)
// @route  POST /api/debit-notes
// @access Private/Admin
//
// FLOW:
//  1. Frontend selects supplier company
//  2. Frontend selects financial year  →  calls GET /api/debit-notes/next-number
//  3. Frontend selects unpaid purchase  →  calls GET /api/debit-notes/unpaid-purchases
//  4. Frontend fills items + reason and POSTs here
//
// Body:
//   companyId          – supplier company (REQUIRED before purchase selection)
//   financialYear      – e.g. "2025-26"  (auto-detected from debitNoteDate if omitted)
//   debitNoteNumber    – can be omitted; auto-generated from financialYear
//   debitNoteDate      – ISO date string
//   purchaseId         – selected unpaid purchase bill
//   returnReason       – enum value
//   returnReasonNotes  – free text
//   items              – array of { description, hsnSacCode, quantity, rate }
// ─────────────────────────────────────────────────────────────────────────────
const createDebitNote = async (req, res) => {
  let {
    companyId,
    financialYear,
    debitNoteNumber,
    debitNoteDate,
    purchaseId,
    returnReason,
    returnReasonNotes,
    items,
  } = req.body;

  // ── Required field validation ──────────────────────────────────────────────
  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required. Please select a supplier company first.' });
  }
  if (!purchaseId) {
    return res.status(400).json({ message: 'purchaseId is required. Please select an unpaid purchase bill.' });
  }
  if (!returnReason) {
    return res.status(400).json({ message: 'returnReason is required.' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required.' });
  }

  try {
    // ── Verify supplier company ───────────────────────────────────────────────
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Supplier company not found.' });
    }

    // ── Resolve date + financial year ─────────────────────────────────────────
    const resolvedDate = debitNoteDate ? new Date(debitNoteDate) : new Date();
    const resolvedFY   = financialYear || getFinancialYear(resolvedDate);

    // ── Auto-generate or validate debit note number ───────────────────────────
    if (!debitNoteNumber) {
      debitNoteNumber = await generateDebitNoteNumber(resolvedFY);
    } else {
      const expectedPrefix = `${resolvedFY}/DN`;
      if (!debitNoteNumber.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: `debitNoteNumber must follow the format "${expectedPrefix}XX" for financial year ${resolvedFY}.`,
        });
      }
    }

    // ── Fetch original purchase bill ──────────────────────────────────────────
    const purchase = await Purchase.findById(purchaseId).populate('supplierCompany');
    if (!purchase) {
      log(`Debit note creation failed: Purchase not found - ID: ${purchaseId}`, 'warn');
      return res.status(404).json({ message: 'Original purchase bill not found.' });
    }

    // ── Validate purchase belongs to selected supplier ────────────────────────
    const purchaseSupplierId = String(
      purchase.supplierCompany?._id || purchase.supplierCompany
    );
    if (purchaseSupplierId !== String(companyId)) {
      return res.status(400).json({
        message: 'The selected purchase bill does not belong to the selected supplier company.',
      });
    }

    // ── Validate purchase status (must be unpaid / partially paid) ────────────
    const purchaseStatus = purchase.paymentStatus;
    if (!['Unpaid', 'Partially Paid'].includes(purchaseStatus)) {
      return res.status(400).json({
        message: `Cannot create debit note for a purchase with status "${purchaseStatus}". Only Unpaid or Partially Paid purchases are allowed.`,
      });
    }

    // ── Validate purchase belongs to selected financial year ──────────────────
    const purchaseFY =
      purchase.financialYear || getFinancialYear(purchase.purchaseBillDate);

    if (purchaseFY !== resolvedFY) {
      return res.status(400).json({
        message: `The selected purchase belongs to FY ${purchaseFY}, but the debit note is for FY ${resolvedFY}. Please select a matching financial year.`,
      });
    }

    // ── Prevent duplicate debit note on the same purchase ────────────────────
    if (purchase.debitNote) {
      return res.status(400).json({
        message: 'A debit note already exists for this purchase bill.',
      });
    }

    // ── Validate returned items against original purchase ─────────────────────
    // NOTE: Purchase model may store items differently depending on type.
    // We validate by matching description + hsnSacCode when items array exists,
    // and skip per-item quantity check for weight-based YARN purchases.
    if (purchase.items && Array.isArray(purchase.items) && purchase.items.length > 0) {
      for (const item of items) {
        const purchaseItem = purchase.items.find(
          pi =>
            pi.description === item.description &&
            pi.hsnSacCode  === item.hsnSacCode
        );

        if (!purchaseItem) {
          return res.status(400).json({
            message: `Item "${item.description}" (HSN: ${item.hsnSacCode}) was not found in the original purchase bill.`,
          });
        }

        if (parseFloat(item.quantity) > parseFloat(purchaseItem.quantity)) {
          return res.status(400).json({
            message: `Return quantity for "${item.description}" (${item.quantity}) exceeds purchased quantity (${purchaseItem.quantity}).`,
          });
        }
      }
    }
    // If the Purchase model doesn't carry a structured items array (e.g. YARN
    // purchases only store netWeight + rate), we skip item-level matching and
    // trust the front-end to send sensible data.  The controller still validates
    // all numeric fields below.

    // ── Validate item amounts ─────────────────────────────────────────────────
    for (const item of items) {
      if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) {
        return res.status(400).json({ message: `Item "${item.description}" has an invalid quantity.` });
      }
      if (isNaN(parseFloat(item.rate)) || parseFloat(item.rate) < 0) {
        return res.status(400).json({ message: `Item "${item.description}" has an invalid rate.` });
      }
    }

    // ── Supplier snapshot ─────────────────────────────────────────────────────
    const supplierDetailsSnapshot =
      purchase.supplierDetailsSnapshot || {
        name:      company.name,
        address:   company.address,
        gstNumber: company.gstNumber,
      };

    // ── Derive tax config from original purchase ──────────────────────────────
    // Purchase model uses simple cgst/sgst flat amounts, not percentages.
    // We derive the tax TYPE from Settings defaults; the percentages come from
    // either the purchase fields (if they exist) or Settings.
    const settings = await Settings.getSettings();

    // Determine taxType: if purchase stores taxType field use it, else default CGST_SGST
    const taxType = purchase.taxType || 'CGST_SGST';

    const cgstRate    = purchase.cgstPercentage    || settings.cgstPercentage    || 0;
    const sgstRate    = purchase.sgstPercentage    || settings.sgstPercentage    || 0;
    const igstRate    = purchase.igstPercentage    || settings.igstPercentage    || 0;
    const jobCgstRate = purchase.jobCgstPercentage || settings.jobCgstPercentage || 0;
    const jobSgstRate = purchase.jobSgstPercentage || settings.jobSgstPercentage || 0;

    // ── Calculate totals ──────────────────────────────────────────────────────
    const calculated = calculateDebitNoteTotals(
      items,
      purchase.discountPercentage || 0,
      taxType,
      cgstRate,
      sgstRate,
      igstRate,
      jobCgstRate,
      jobSgstRate
    );

    // ── Build and persist debit note ──────────────────────────────────────────
    const newDebitNote = new DebitNote({
      debitNoteNumber,
      financialYear:              resolvedFY,
      debitNoteDate:              resolvedDate,
      originalPurchase:           purchase._id,
      originalPurchaseBillNumber: purchase.purchaseBillNumber,
      supplierCompany:            companyId,
      supplierDetailsSnapshot,
      returnReason,
      returnReasonNotes:          returnReasonNotes || '',
      items:                      calculated.items,
      subTotalAmount:             calculated.subTotalAmount,
      discountPercentage:         purchase.discountPercentage || 0,
      discountAmount:             calculated.discountAmount,
      amountAfterDiscount:        calculated.amountAfterDiscount,
      taxType,
      cgstPercentage:    taxType === 'CGST_SGST'       ? cgstRate    : 0,
      cgstAmount:        calculated.cgstAmount,
      sgstPercentage:    taxType === 'CGST_SGST'       ? sgstRate    : 0,
      sgstAmount:        calculated.sgstAmount,
      igstPercentage:    taxType === 'IGST'            ? igstRate    : 0,
      igstAmount:        calculated.igstAmount,
      jobCgstPercentage: taxType === 'JOBCGST_JOBSGST' ? jobCgstRate : 0,
      jobCgstAmount:     calculated.jobCgstAmount,
      jobSgstPercentage: taxType === 'JOBCGST_JOBSGST' ? jobSgstRate : 0,
      jobSgstAmount:     calculated.jobSgstAmount,
      totalTaxAmount:    calculated.totalTaxAmount,
      totalAmount:       calculated.totalAmount,
      amountInWords:     amountToWords(calculated.totalAmount) || '',
      status:            'Pending',
      stockAdjusted:     false,
      createdBy:         req.user._id,
    });

    const savedDebitNote = await newDebitNote.save();

    // ── Back-link debit note on the purchase record ───────────────────────────
    purchase.debitNote = savedDebitNote._id;
    await purchase.save();

    log(
      `Debit note created: ${savedDebitNote.debitNoteNumber} (FY ${resolvedFY}) for purchase ${purchase.purchaseBillNumber} by ${req.user.email}`,
      'info'
    );

    res.status(201).json(savedDebitNote);
  } catch (error) {
    log(`Error creating debit note: ${error.message} - Stack: ${error.stack}`, 'error');

    if (error.code === 11000) {
      return res.status(400).json({
        message: `Debit note number '${debitNoteNumber}' already exists. Please refresh and try again.`,
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error while creating debit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get all debit notes (with filtering)
// @route  GET /api/debit-notes
// @access Private/Admin
//
// Query params: companyId, startDate, endDate, status, financialYear
// ─────────────────────────────────────────────────────────────────────────────
const getDebitNotes = async (req, res) => {
  const { companyId, startDate, endDate, status, financialYear } = req.query;
  const query = {};

  if (companyId)     query.supplierCompany = companyId;
  if (status)        query.status          = status;
  if (financialYear) query.financialYear   = financialYear;

  if (startDate && endDate) {
    query.debitNoteDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.debitNoteDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.debitNoteDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const debitNotes = await DebitNote.find(query)
      .populate('supplierCompany',   'name gstNumber')
      .populate('originalPurchase',  'purchaseBillNumber purchaseBillDate')
      .populate('createdBy',         'username email')
      .sort({ debitNoteDate: -1, createdAt: -1 });

    log(
      `Fetched ${debitNotes.length} debit notes with query ${JSON.stringify(query)} by ${req.user.email}`,
      'info'
    );
    res.json(debitNotes);
  } catch (error) {
    log(`Error fetching debit notes: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching debit notes.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get a single debit note by ID
// @route  GET /api/debit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getDebitNoteById = async (req, res) => {
  try {
    const debitNote = await DebitNote.findById(req.params.id)
      .populate('supplierCompany',  'name address gstNumber mobileNumber')
      .populate('originalPurchase', 'purchaseBillNumber purchaseBillDate amount purchaseType')
      .populate('createdBy',        'username email');

    if (!debitNote) {
      log(`Debit note not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Debit note not found.' });
    }

    log(`Fetched debit note: ${debitNote.debitNoteNumber} by ${req.user.email}`, 'info');
    res.json(debitNote);
  } catch (error) {
    log(`Error fetching debit note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching debit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Update debit note status / stockAdjusted flag
// @route  PUT /api/debit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const updateDebitNote = async (req, res) => {
  const debitNoteId                = req.params.id;
  const { status, stockAdjusted } = req.body;

  try {
    const debitNote = await DebitNote.findById(debitNoteId);
    if (!debitNote) {
      log(`Debit note update failed: Not found with ID: ${debitNoteId}`, 'warn');
      return res.status(404).json({ message: 'Debit note not found.' });
    }

    if (status        !== undefined) debitNote.status        = status;
    if (stockAdjusted !== undefined) debitNote.stockAdjusted = stockAdjusted;

    const updatedDebitNote = await debitNote.save();

    log(`Debit note updated: ${updatedDebitNote.debitNoteNumber} by ${req.user.email}`, 'info');
    res.json(updatedDebitNote);
  } catch (error) {
    log(
      `Error updating debit note ID ${debitNoteId}: ${error.message} - Stack: ${error.stack}`,
      'error'
    );
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating debit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Delete a debit note and unlink it from the purchase record
// @route  DELETE /api/debit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const deleteDebitNote = async (req, res) => {
  try {
    const debitNote = await DebitNote.findById(req.params.id);
    if (!debitNote) {
      log(`Debit note deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Debit note not found.' });
    }

    // Remove back-link from the original purchase
    if (debitNote.originalPurchase) {
      await Purchase.findByIdAndUpdate(
        debitNote.originalPurchase,
        { $unset: { debitNote: 1 } }
      );
    }

    await debitNote.deleteOne();

    log(`Debit note deleted: ${debitNote.debitNoteNumber} by ${req.user.email}`, 'info');
    res.json({ message: 'Debit note removed successfully.' });
  } catch (error) {
    log(`Error deleting debit note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting debit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Generate and stream PDF for a debit note
// @route  GET /api/debit-notes/:id/pdf
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const generateDebitNotePdf = async (req, res) => {
  const debitNoteId = req.params.id;
  try {
    const debitNote = await DebitNote.findById(debitNoteId)
      .populate('supplierCompany',  'name address gstNumber mobileNumber')
      .populate('originalPurchase', 'purchaseBillNumber purchaseBillDate');

    if (!debitNote) {
      log(`PDF generation failed: Debit note not found - ID: ${debitNoteId}`, 'warn');
      return res.status(404).json({ message: 'Debit note not found.' });
    }

    const pdfDoc  = await PDFDocument.create();
    let   page    = pdfDoc.addPage([595, 842]); // A4 portrait
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

    // ── Utility: draw text and return consumed vertical space ─────────────────
    const drawTextAndMeasureHeight = (textToDraw, xPos, currentY, options = {}) => {
      const textToProcess = String(textToDraw ?? '').replace(/₹/g, 'INR ');
      const FONT_TO_USE   = options.font        || font;
      const SIZE          = options.size        || 10;
      const COLOR         = options.color       || rgb(0, 0, 0);
      const LINE_HEIGHT   = options.lineHeight  || SIZE * 1.3;
      const MAX_WIDTH     = options.maxWidth;
      const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 3;
      const ALIGN         = options.align       || 'left';

      let actualXPos = xPos;
      if (ALIGN === 'center') {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
        actualXPos = MAX_WIDTH
          ? xPos + (MAX_WIDTH - textWidth) / 2
          : leftMargin + (contentWidth - textWidth) / 2;
      } else if (ALIGN === 'right') {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
        actualXPos = MAX_WIDTH ? xPos + MAX_WIDTH - textWidth : xPos;
      }

      page.drawText(textToProcess, {
        x:          actualXPos,
        y:          currentY,
        font:       FONT_TO_USE,
        size:       SIZE,
        color:      COLOR,
        lineHeight: LINE_HEIGHT,
        maxWidth:   MAX_WIDTH,
        wordBreaks: [' ', '-', '/'],
      });

      // Estimate height consumed
      let numLines = 1;
      if (MAX_WIDTH && FONT_TO_USE.widthOfTextAtSize(textToProcess.replace(/\n/g, ' '), SIZE) > MAX_WIDTH) {
        numLines = 0;
        textToProcess.split('\n').forEach(seg => {
          if (!seg.trim()) { numLines++; return; }
          let cur = '', lines = 1;
          seg.split(' ').forEach(word => {
            const test = cur ? `${cur} ${word}` : word;
            if (FONT_TO_USE.widthOfTextAtSize(test, SIZE) > MAX_WIDTH) { lines++; cur = word; }
            else cur = test;
          });
          numLines += lines;
        });
        if (numLines === 0 && textToProcess.trim()) numLines = 1;
      } else {
        numLines = textToProcess.split('\n').length || 1;
      }

      return numLines * LINE_HEIGHT + SPACING_AFTER;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // DOCUMENT HEADER
    // ─────────────────────────────────────────────────────────────────────────
    const ganeshText  = 'SHREE GANESHAY NAMAH';
    const ganeshH     = drawTextAndMeasureHeight(ganeshText, leftMargin, y, {
      font: boldFont, size: 10, align: 'center', color: rgb(0.2, 0.2, 0.2), spacingAfter: 0,
    });

    const debitInvText  = 'DEBIT INVOICE';
    const debitInvSize  = 14;
    const debitInvWidth = boldFont.widthOfTextAtSize(debitInvText, debitInvSize);
    const debitInvH     = drawTextAndMeasureHeight(debitInvText, rightMargin - debitInvWidth, y, {
      font: boldFont, size: debitInvSize, color: rgb(0.1, 0.5, 0.1), spacingAfter: 0,
    });

    y -= Math.max(ganeshH, debitInvH) + 18;

    y -= drawTextAndMeasureHeight('MAHADEV FILAMENTS', leftMargin, y, {
      font: boldFont, size: 25, align: 'center', color: rgb(0.1, 0.3, 0.5),
    });

    y -= drawTextAndMeasureHeight(
      'BLOCK NO - 15, 1ST FLOOR, AMBIKA VIBHAG - 2, NEAR NAVJIVAN CIRCLE, U.M. ROAD, SURAT - 395007',
      leftMargin, y + 14,
      { size: 9, align: 'center', maxWidth: contentWidth, spacingAfter: 4 }
    );

    const companyGSTIN    = '24ABEFM9966E1ZZ';
    const companyStateCode = companyGSTIN.substring(0, 2);
    y -= drawTextAndMeasureHeight(
      `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`,
      leftMargin, y + 14,
      { size: 10, align: 'center', spacingAfter: 15 }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SUPPLIER / DEBIT NOTE INFO BLOCK
    // ─────────────────────────────────────────────────────────────────────────
    const supplierName    = debitNote.supplierDetailsSnapshot?.name    || debitNote.supplierCompany?.name    || 'N/A';
    const supplierAddress = debitNote.supplierDetailsSnapshot?.address || debitNote.supplierCompany?.address || 'N/A';
    const supplierGstin   = debitNote.supplierDetailsSnapshot?.gstNumber || debitNote.supplierCompany?.gstNumber || 'N/A';
    const supplierStateCode = supplierGstin !== 'N/A' && supplierGstin.length >= 2 ? supplierGstin.substring(0, 2) : 'N/A';

    let yLeft  = y;
    let yRight = y;

    const detailsMaxWidth      = contentWidth / 2 - 20;
    const noteDetailsColWidth  = 180;
    const noteDetailsX         = rightMargin - noteDetailsColWidth;
    const noteDetailsMaxWidth  = noteDetailsColWidth - 10;

    const formatDate = (d) =>
      d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

    // Left column: supplier details
    page.drawRectangle({
      x: leftMargin,
      y: yLeft - 84,
      width: detailsMaxWidth + 20,
      height: 100,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    page.drawRectangle({
      x: noteDetailsX - 5,
      y: yRight - 64,
      width: noteDetailsColWidth,
      height: 80,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    yLeft -= drawTextAndMeasureHeight('Supplier:', leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
    yLeft -= drawTextAndMeasureHeight(supplierName,    leftMargin + 5, yLeft, { font: boldFont, size: 10, maxWidth: detailsMaxWidth, spacingAfter: 4 });
    yLeft -= drawTextAndMeasureHeight(supplierAddress, leftMargin + 5, yLeft, { size: 9,  maxWidth: detailsMaxWidth, spacingAfter: 4 });
    yLeft -= drawTextAndMeasureHeight(`GSTIN: ${supplierGstin}     STATE CODE: ${supplierStateCode}`, leftMargin + 5, yLeft, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });

    // Right column: debit note meta
    yRight -= drawTextAndMeasureHeight(`Date : ${formatDate(debitNote.debitNoteDate)}`, noteDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: noteDetailsMaxWidth });
    yRight -= drawTextAndMeasureHeight(`Debit Note No : ${debitNote.debitNoteNumber}`, noteDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: noteDetailsMaxWidth });
    yRight -= drawTextAndMeasureHeight(`Orig. Purchase : ${debitNote.originalPurchaseBillNumber}`, noteDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: noteDetailsMaxWidth });

    y = Math.min(yLeft, yRight) - lineSpacing;

    // ─────────────────────────────────────────────────────────────────────────
    // ITEMS TABLE HEADER
    // ─────────────────────────────────────────────────────────────────────────
    page.drawRectangle({ x: leftMargin, y: y - 22, width: contentWidth, height: 20, color: rgb(0.1, 0.3, 0.5), opacity: 0.1 });
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    const cols = {
      srNo:        leftMargin + 10,
      description: leftMargin + 50,
      hsn:         leftMargin + 260,
      qty:         leftMargin + 340,
      rate:        leftMargin + 410,
      amount:      rightMargin - 80,
    };

    const headerOpts = { font: boldFont, size: 10, spacingAfter: 0, color: rgb(0.1, 0.1, 0.1) };
    drawTextAndMeasureHeight('Sr No.',        cols.srNo,        y, headerOpts);
    drawTextAndMeasureHeight('Description of Goods', cols.description, y, { ...headerOpts, maxWidth: cols.hsn - cols.description - 15 });
    drawTextAndMeasureHeight('HSN/SAC',    cols.hsn,         y, headerOpts);
    drawTextAndMeasureHeight('Quantity',        cols.qty,         y, headerOpts);
    drawTextAndMeasureHeight('Rate/Kgs',       cols.rate,        y, headerOpts);
    const amtHdrW = boldFont.widthOfTextAtSize('Amount', 10);
    drawTextAndMeasureHeight('Amount', rightMargin - amtHdrW - 10, y, headerOpts);

    y -= smallLineSpacing;
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= itemLineSpacing;

    // ─────────────────────────────────────────────────────────────────────────
    // ITEMS TABLE ROWS
    // ─────────────────────────────────────────────────────────────────────────
    debitNote.items.forEach((item, idx) => {
      const itemRowOptions = { size: 9, spacingAfter: 0 };
      let maxHeightThisRow = 0;

      if (idx % 2 === 0) {
        page.drawRectangle({ x: leftMargin, y: y - 5, width: contentWidth, height: 16, color: rgb(0.98, 0.98, 0.98), opacity: 0.5 });
      }
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(idx + 1), cols.srNo, y, itemRowOptions));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.description, cols.description, y, { ...itemRowOptions, maxWidth: cols.hsn - cols.description - 15 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.hsnSacCode, cols.hsn, y, { ...itemRowOptions, maxWidth: cols.qty - cols.hsn - 10 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.quantity), cols.qty, y, { ...itemRowOptions, maxWidth: cols.rate - cols.qty - 10 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.rate.toFixed(2)), cols.rate, y, { ...itemRowOptions, maxWidth: cols.amount - cols.rate - 10 }));
      const amtStr = item.amount.toFixed(2);
      const amtW   = font.widthOfTextAtSize(amtStr, 9);
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(amtStr, rightMargin - amtW - 10, y, itemRowOptions));

      y -= maxHeightThisRow + itemLineSpacing / 2;
    });

    const minItemRows = 7;
    if (debitNote.items.length < minItemRows) {
      for (let i = debitNote.items.length; i < minItemRows; i++) {
        y -= itemLineSpacing;
      }
    }

    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing + 1;

    // ─────────────────────────────────────────────────────────────────────────
    // TOTALS SECTION
    // ─────────────────────────────────────────────────────────────────────────
    const totalsLabelX = rightMargin - 230;
    const totalsValueX = rightMargin - 100;

    const drawTotalRow = (label, valueStr, isBold = false) => {
      const commonOpt = { size: 10, font: isBold ? boldFont : font, spacingAfter: 2 };
      const labelMaxWidth = totalsValueX - totalsLabelX - 15;
      const valueMaxWidth = rightMargin - totalsValueX - 10;

      const hLabel = drawTextAndMeasureHeight(label, totalsLabelX, y, { ...commonOpt, maxWidth: labelMaxWidth });
      const valWidth = (isBold ? boldFont : font).widthOfTextAtSize(valueStr, commonOpt.size);
      const valXPos = rightMargin - valWidth - 10;
      const hValue = drawTextAndMeasureHeight(valueStr, valXPos, y, { ...commonOpt, maxWidth: valueMaxWidth });

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

    drawTotalRow('Sub Total:', debitNote.subTotalAmount.toFixed(2));
    if (debitNote.discountPercentage > 0) {
      drawTotalRow(`Discount (${debitNote.discountPercentage}%):`, `- ${debitNote.discountAmount.toFixed(2)}`);
      drawTotalRow('After Discount:', debitNote.amountAfterDiscount.toFixed(2));
    }
    if (debitNote.taxType === 'CGST_SGST') {
      drawTotalRow(`CGST (${debitNote.cgstPercentage}%):`, `+ ${debitNote.cgstAmount.toFixed(2)}`);
      drawTotalRow(`SGST (${debitNote.sgstPercentage}%):`, `+ ${debitNote.sgstAmount.toFixed(2)}`);
    } else if (debitNote.taxType === 'IGST') {
      drawTotalRow(`IGST (${debitNote.igstPercentage}%):`, `+ ${debitNote.igstAmount.toFixed(2)}`);
    } else if (debitNote.taxType === 'JOBCGST_JOBSGST') {
      drawTotalRow(`Job CGST (${debitNote.jobCgstPercentage}%):`, `+ ${debitNote.jobCgstAmount.toFixed(2)}`);
      drawTotalRow(`Job SGST (${debitNote.jobSgstPercentage}%):`, `+ ${debitNote.jobSgstAmount.toFixed(2)}`);
    }

    y -= 5;
    page.drawLine({ start: { x: totalsLabelX - 10, y: y + smallLineSpacing / 2 }, end: { x: rightMargin, y: y + smallLineSpacing / 2 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= 3;

    drawTotalRow('TOTAL AMOUNT:', debitNote.totalAmount.toFixed(2), true);

    y -= 8;
    if (debitNote.amountInWords) {
      y -= drawTextAndMeasureHeight(
        `Amount in Words: ${debitNote.amountInWords}`,
        leftMargin, y,
        { font: boldFont, size: 10, maxWidth: contentWidth, spacingAfter: 8, color: rgb(0.1, 0.1, 0.1) }
      );
    }

    y -= 2;
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightMargin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    // ─────────────────────────────────────────────────────────────────────────
    // BANK DETAILS + DECLARATION
    // ─────────────────────────────────────────────────────────────────────────
    const bankMaxWidth = contentWidth * 0.5;

    y -= drawTextAndMeasureHeight('Bank Details:', leftMargin, y, { font: boldFont, size: 12, spacingAfter: 4 });
    y -= drawTextAndMeasureHeight('Bank Name: Prime Bank of India',     leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawTextAndMeasureHeight('Account Name: Mahadev Filaments',    leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawTextAndMeasureHeight('Account No.: 10062001003372',        leftMargin, y, { size: 10, spacingAfter: 3, maxWidth: bankMaxWidth });
    y -= drawTextAndMeasureHeight('IFSC Code: PMEC0100607',             leftMargin, y, { size: 10, spacingAfter: 10, maxWidth: bankMaxWidth });

    const forCoText = 'For MAHADEV FILAMENTS';
    const forCoSize = 11;
    const forCoW    = boldFont.widthOfTextAtSize(forCoText, forCoSize);
    let   declY     = y;

    const declTitleH = drawTextAndMeasureHeight('Declaration:', leftMargin, declY, { font: boldFont, size: 12, spacingAfter: 4 });
    drawTextAndMeasureHeight(forCoText, rightMargin - forCoW, declY, { font: boldFont, size: forCoSize, spacingAfter: 3 });
    declY  -= declTitleH;

    const declarationLines = [
      'This debit note is issued against returned purchased goods.',
      'All returned items will be added back to purchase stock.',
      'Credit adjustment will be processed as per company policy.',
      'Subject to Surat jurisdiction.',
    ];

    let lastDeclLineY = declY;
    declarationLines.forEach((line, i) => {
      const h = drawTextAndMeasureHeight(line, leftMargin, declY, { size: 9, spacingAfter: 3, maxWidth: contentWidth * 0.6 });
      declY -= h;
      if (i === declarationLines.length - 1) lastDeclLineY = declY + h - 3;
    });

    const authText = 'Authorised Signatory';
    const authW    = font.widthOfTextAtSize(authText, 9);
    drawTextAndMeasureHeight(authText, rightMargin - authW, lastDeclLineY, { size: 9, spacingAfter: 0 });

    // ─────────────────────────────────────────────────────────────────────────
    // FOOTER
    // ─────────────────────────────────────────────────────────────────────────
    const footerY = 30;
    page.drawRectangle({ x: leftMargin, y: footerY - 8, width: contentWidth, height: 20, color: rgb(0.1, 0.3, 0.5), opacity: 0.1 });
    const contactText = 'Contact: Bharat Radiya | Phone: 9825492079 | Email: mahadevfilaments@gmail.com';
    const contactW    = font.widthOfTextAtSize(contactText, 9);
    drawTextAndMeasureHeight(
      contactText,
      leftMargin + (contentWidth - contactW) / 2,
      footerY,
      { size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3) }
    );
    const pdfBytes  = await pdfDoc.save();
    const pdfFileName = `DebitNote-${debitNote.debitNoteNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    log(`PDF generated for debit note ${debitNote.debitNoteNumber}`, 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    log(
      `Error generating PDF for debit note ID ${debitNoteId}: ${error.message} - Stack: ${error.stack}`,
      'error'
    );
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF debit note.' });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  getNextDebitNoteNumber,
  getUnpaidPurchasesByCompany,
  createDebitNote,
  getDebitNotes,
  getDebitNoteById,
  updateDebitNote,
  deleteDebitNote,
  generateDebitNotePdf,
  getFinancialYear,
  calculateDebitNoteTotals,
  amountToWords,
};