const CreditNote = require('../models/CreditNote');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const Settings = require('../models/Settings');
const Challan = require('../models/Challan');
const { log } = require('../middleware/logger');
const exceljs = require('exceljs');
const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb, PageSizes } = require('pdf-lib');

const { getOrgDetails } = require('../utils/orgDetails');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Determine financial year string from a date
// e.g. April 2025 → June 2026  →  "2025-26"
// ─────────────────────────────────────────────────────────────────────────────
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed; April = 3
  const year = d.getFullYear();
  if (month >= 3) {
    // April (3) to December (11)
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // January (0) to March (2)
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate next credit note number for a given financial year
// Format: 2025-26/01, 2025-26/02 … reset to /01 each new financial year
// ─────────────────────────────────────────────────────────────────────────────
const generateCreditNoteNumber = async (financialYear, organizationId) => {
  const prefix = `${financialYear}/`;
  const lastNote = await CreditNote.findOne({
    creditNoteNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
    organizationId,
  }).sort({ creditNoteNumber: -1 });

  let nextSeq = 1;
  if (lastNote) {
    const parts = lastNote.creditNoteNumber.split('/');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Calculate totals
// ─────────────────────────────────────────────────────────────────────────────
const calculateCreditNoteTotals = (
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
    const rate = parseFloat(item.rate) || 0;
    const amount = parseFloat((quantity * rate).toFixed(2));
    subTotalAmount += amount;
    return {
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity,
      rate,
      amount
    };
  });

  subTotalAmount = parseFloat(subTotalAmount.toFixed(2));
  const discountAmount = parseFloat((subTotalAmount * (parseFloat(discountPercentage) / 100)).toFixed(2)) || 0;
  const amountAfterDiscount = parseFloat((subTotalAmount - discountAmount).toFixed(2));

  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, jobCgstAmount = 0, jobSgstAmount = 0;
  let totalTaxAmount = 0;

  if (taxType === 'CGST_SGST') {
    cgstAmount = parseFloat((amountAfterDiscount * (parseFloat(cgstPercentage) / 100)).toFixed(2)) || 0;
    sgstAmount = parseFloat((amountAfterDiscount * (parseFloat(sgstPercentage) / 100)).toFixed(2)) || 0;
    totalTaxAmount = cgstAmount + sgstAmount;
  } else if (taxType === 'IGST') {
    igstAmount = parseFloat((amountAfterDiscount * (parseFloat(igstPercentage) / 100)).toFixed(2)) || 0;
    totalTaxAmount = igstAmount;
  } else if (taxType === 'JOBCGST_JOBSGST') {
    jobCgstAmount = parseFloat((amountAfterDiscount * (parseFloat(jobCgstPercentage) / 100)).toFixed(2)) || 0;
    jobSgstAmount = parseFloat((amountAfterDiscount * (parseFloat(jobSgstPercentage) / 100)).toFixed(2)) || 0;
    totalTaxAmount = jobCgstAmount + jobSgstAmount;
  }

  totalTaxAmount = parseFloat(totalTaxAmount.toFixed(2));
  const totalAmount = parseFloat((amountAfterDiscount + totalTaxAmount).toFixed(2));

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
    totalAmount
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get next credit note number preview (for UI auto-fill)
// @route  GET /api/credit-notes/next-number?financialYear=2025-26
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getNextCreditNoteNumber = async (req, res) => {
  try {
    const financialYear = req.query.financialYear || getFinancialYear();
    const nextNumber = await generateCreditNoteNumber(financialYear, req.organizationId);
    res.json({ creditNoteNumber: nextNumber, financialYear });
  } catch (error) {
    log(`Error fetching next credit note number: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching next credit note number.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get unpaid bills for a company (filtered by companyId + financialYear)
// @route  GET /api/credit-notes/unpaid-bills?companyId=xxx&financialYear=2025-26
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
// const getUnpaidBillsByCompany = async (req, res) => {
//   const { companyId, financialYear } = req.query;

//   if (!companyId) {
//     return res.status(400).json({ message: 'companyId is required.' });
//   }

//   try {
//     const query = {
//       company: companyId,
//       // Only bills that are unpaid / partially paid
//       paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
//       // Exclude bills that already have a credit note linked
//       creditNote: { $exists: false },
//     };

//     // Filter by financial year date range if provided
//     if (financialYear) {
//       const [startYearStr, endYearShortStr] = financialYear.split('-');
//       const startYear = parseInt(startYearStr, 10);
//       // "26" → 2026
//       const endYear = startYear + 1;
//       query.billDate = {
//         $gte: new Date(`${startYear}-04-01T00:00:00.000Z`),
//         $lte: new Date(`${endYear}-03-31T23:59:59.999Z`),
//       };
//     }

//     const bills = await Bill.find(query)
//       .select('billNumber billDate totalAmount paymentStatus company')
//       .populate('company', 'name')
//       .sort({ billDate: -1 });

//     log(`Fetched ${bills.length} unpaid bills for company ${companyId} FY ${financialYear || 'all'}`, 'info');
//     res.json(bills);
//   } catch (error) {
//     log(`Error fetching unpaid bills: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching unpaid bills.' });
//   }
// };

const getUnpaidBillsByCompany = async (req, res) => {
  const { companyId, financialYear } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required.' });
  }

  try {
    const query = {
      company: companyId,
      organizationId: req.organizationId,

      // ✅ use actual bill status field
      status: { $in: ['Pending', 'Partially Paid'] },

      // ✅ allow bills without credit note
      $or: [
        { creditNote: { $exists: false } },
        { creditNote: null }
      ]
    };

    // ✅ BEST: direct FY field filtering
    if (financialYear) {
      query.financialYear = financialYear;
    }

    const bills = await Bill.find(query)
      .select(
        'billNumber billDate totalAmount status company financialYear totalPaidAmount'
      )
      .populate('company', 'name')
      .sort({ billDate: -1 });

    log(
      `Fetched ${bills.length} unpaid bills for company ${companyId} FY ${financialYear || 'all'}`,
      'info'
    );

    res.json(bills);
  } catch (error) {
    log(
      `Error fetching unpaid bills: ${error.message} - Stack: ${error.stack}`,
      'error'
    );
    res.status(500).json({
      message: 'Server error while fetching unpaid bills.',
    });
  }
};

const createCreditNote = async (req, res) => {
  let {
    companyId,
    financialYear,
    creditNoteNumber,
    creditNoteDate,
    billId,
    returnReason,
    returnReasonNotes,
    items,
  } = req.body;

  // ✅ Required validation
  if (!companyId) {
    return res.status(400).json({
      message: 'companyId is required. Please select a company first.',
    });
  }

  if (!billId) {
    return res.status(400).json({
      message: 'billId is required. Please select an unpaid bill.',
    });
  }

  if (!returnReason) {
    return res.status(400).json({
      message: 'returnReason is required.',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'At least one item is required.',
    });
  }

  try {
    // ✅ Verify company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    // ✅ Resolve date + FY
    const resolvedDate = creditNoteDate
      ? new Date(creditNoteDate)
      : new Date();

    const resolvedFY =
      financialYear || getFinancialYear(resolvedDate);

    // ✅ Generate note number
    if (!creditNoteNumber) {
      creditNoteNumber = await generateCreditNoteNumber(resolvedFY, req.organizationId);
    } else {
      const expectedPrefix = `${resolvedFY}/`;
      if (!creditNoteNumber.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: `creditNoteNumber must follow "${expectedPrefix}XX" format.`,
        });
      }
    }

    // ✅ Fetch original bill
    const bill = await Bill.findById(billId)
      .populate('company')
      .populate('consignee')
      .populate('challan');

    if (!bill) {
      return res.status(404).json({
        message: 'Original bill not found.',
      });
    }

    // ✅ Company validation
    if (String(bill.company._id) !== String(companyId)) {
      return res.status(400).json({
        message: 'Selected bill does not belong to selected company.',
      });
    }

    // ✅ IMPORTANT FIX → status support
    const billStatus = bill.status || bill.paymentStatus;

    if (
      !['Pending', 'Partially Paid', 'Unpaid'].includes(billStatus)
    ) {
      return res.status(400).json({
        message: `Cannot create credit note for bill status "${billStatus}". Only Pending or Partially Paid bills are allowed.`,
      });
    }

    // ✅ Check duplicate credit note
    if (bill.creditNote) {
      return res.status(400).json({
        message: 'Credit note already exists for this bill.',
      });
    }

    // ✅ Validate return items
    for (const item of items) {
      const billItem = bill.items.find(
        bi =>
          bi.description === item.description &&
          bi.hsnSacCode === item.hsnSacCode
      );

      if (!billItem) {
        return res.status(400).json({
          message: `Item "${item.description}" not found in bill.`,
        });
      }

      if (parseFloat(item.quantity) > parseFloat(billItem.quantity)) {
        return res.status(400).json({
          message: `Return quantity for "${item.description}" exceeds bill quantity.`,
        });
      }
    }

    // ✅ Snapshots
    const companyDetailsSnapshot =
      bill.companyDetailsSnapshot || {
        name: bill.company.name,
        address: bill.company.address,
        gstNumber: bill.company.gstNumber,
      };

    const consigneeDetailsSnapshot =
      bill.isConsigneeDifferent
        ? bill.consigneeDetailsSnapshot
        : null;

    // ✅ Tax settings
    const settings = await Settings.getSettings(req.organizationId);

    const cgstRate =
      bill.cgstPercentage || settings.cgstPercentage;

    const sgstRate =
      bill.sgstPercentage || settings.sgstPercentage;

    const igstRate =
      bill.igstPercentage || settings.igstPercentage;

    const jobCgstRate =
      bill.jobCgstPercentage || settings.jobCgstPercentage;

    const jobSgstRate =
      bill.jobSgstPercentage || settings.jobSgstPercentage;

    // ✅ Calculate totals
    const calculated = calculateCreditNoteTotals(
      items,
      bill.discountPercentage || 0,
      bill.taxType,
      cgstRate,
      sgstRate,
      igstRate,
      jobCgstRate,
      jobSgstRate
    );

    // ✅ Create note
    const newCreditNote = new CreditNote({
      creditNoteNumber,
      financialYear: resolvedFY,
      creditNoteDate: resolvedDate,
      originalBill: bill._id,
      originalBillNumber: bill.billNumber,
      challan: bill.challan || null,
      challanNumber: bill.challanNumber || '',
      company: bill.company._id,
      companyDetailsSnapshot,
      isConsigneeDifferent: bill.isConsigneeDifferent || false,
      consignee: bill.consignee || null,
      consigneeDetailsSnapshot,
      returnReason,
      returnReasonNotes: returnReasonNotes || '',
      items: calculated.items,
      subTotalAmount: calculated.subTotalAmount,
      discountPercentage: bill.discountPercentage || 0,
      discountAmount: calculated.discountAmount,
      amountAfterDiscount: calculated.amountAfterDiscount,
      taxType: bill.taxType,
      cgstPercentage: bill.taxType === 'CGST_SGST' ? cgstRate : 0,
      cgstAmount: calculated.cgstAmount,
      sgstPercentage: bill.taxType === 'CGST_SGST' ? sgstRate : 0,
      sgstAmount: calculated.sgstAmount,
      igstPercentage: bill.taxType === 'IGST' ? igstRate : 0,
      igstAmount: calculated.igstAmount,
      jobCgstPercentage:
        bill.taxType === 'JOBCGST_JOBSGST'
          ? jobCgstRate
          : 0,
      jobCgstAmount: calculated.jobCgstAmount,
      jobSgstPercentage:
        bill.taxType === 'JOBCGST_JOBSGST'
          ? jobSgstRate
          : 0,
      jobSgstAmount: calculated.jobSgstAmount,
      totalTaxAmount: calculated.totalTaxAmount,
      totalAmount: calculated.totalAmount,
      amountInWords:
        amountToWords(calculated.totalAmount) || '',
      status: 'Pending',
      stockAdjusted: false,
      createdBy: req.user._id,
      organizationId: req.organizationId,
    });

    const savedCreditNote = await newCreditNote.save();

    // ✅ Link bill
    bill.creditNote = savedCreditNote._id;
    await bill.save();

    log(
      `Credit note created ${savedCreditNote.creditNoteNumber} for bill ${bill.billNumber}`,
      'info'
    );

    res.status(201).json(savedCreditNote);
  } catch (error) {
    log(
      `Error creating credit note: ${error.message} - Stack: ${error.stack}`,
      'error'
    );

    if (error.code === 11000) {
      return res.status(400).json({
        message: `Credit note number '${creditNoteNumber}' already exists.`,
      });
    }

    res.status(500).json({
      message: 'Server error while creating credit note.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get all credit notes
// @route  GET /api/credit-notes
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getCreditNotes = async (req, res) => {
  const { companyId, startDate, endDate, status, financialYear } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (status) query.status = status;
  if (financialYear) query.financialYear = financialYear;

  if (startDate && endDate) {
    query.creditNoteDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.creditNoteDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.creditNoteDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const creditNotes = await CreditNote.find(query)
      .populate('company', 'name gstNumber')
      .populate('consignee', 'name gstNumber address')
      .populate('originalBill', 'billNumber billDate')
      .populate('createdBy', 'username email')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
      .sort({ creditNoteDate: -1, createdAt: -1 });

    log(`Fetched credit notes with query ${JSON.stringify(query)} by ${req.user.email}`, 'info');
    res.json(creditNotes);
  } catch (error) {
    log(`Error fetching credit notes: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching credit notes.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get a credit note by ID
// @route  GET /api/credit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getCreditNoteById = async (req, res) => {
  try {
    const creditNote = await CreditNote.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('company', 'name address gstNumber mobileNumber')
      .populate('consignee', 'name address gstNumber')
      .populate('originalBill', 'billNumber billDate')
      .populate('createdBy', 'username email')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops');

    if (!creditNote) {
      log(`Credit note not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Credit note not found' });
    }
    log(`Fetched credit note by ID: ${creditNote.creditNoteNumber} by ${req.user.email}`, 'info');
    res.json(creditNote);
  } catch (error) {
    log(`Error fetching credit note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching credit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Update credit note status
// @route  PUT /api/credit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const updateCreditNote = async (req, res) => {
  const creditNoteId = req.params.id;
  const { status, stockAdjusted } = req.body;

  try {
    const creditNote = await CreditNote.findById(creditNoteId);
    if (!creditNote) {
      log(`Credit note update failed: Not found with ID: ${creditNoteId}`, 'warn');
      return res.status(404).json({ message: 'Credit note not found' });
    }

    if (creditNote.organizationId && String(creditNote.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    if (status !== undefined) creditNote.status = status;
    if (stockAdjusted !== undefined) creditNote.stockAdjusted = stockAdjusted;

    const updatedCreditNote = await creditNote.save();
    log(`Credit note updated: ${updatedCreditNote.creditNoteNumber} by ${req.user.email}`, 'info');
    res.json(updatedCreditNote);
  } catch (error) {
    log(`Error updating credit note ID ${creditNoteId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating credit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Delete a credit note
// @route  DELETE /api/credit-notes/:id
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const deleteCreditNote = async (req, res) => {
  try {
    const creditNote = await CreditNote.findById(req.params.id);
    if (!creditNote) {
      log(`Credit note deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Credit note not found' });
    }

    if (creditNote.organizationId && String(creditNote.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    if (creditNote.originalBill) {
      await Bill.findByIdAndUpdate(creditNote.originalBill, { $unset: { creditNote: 1 } });
    }

    await creditNote.deleteOne();
    log(`Credit note deleted: ${creditNote.creditNoteNumber} by ${req.user.email}`, 'info');
    res.json({ message: 'Credit note removed successfully.' });
  } catch (error) {
    log(`Error deleting credit note ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting credit note.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Generate PDF for a credit note
// @route  GET /api/credit-notes/:id/pdf
// @access Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const generateCreditNotePdf = async (req, res) => {
  const creditNoteId = req.params.id;
  try {
    const org = await getOrgDetails(req.organizationId);
    const creditNote = await CreditNote.findOne({ _id: creditNoteId, organizationId: req.organizationId })
      .populate('company')
      .populate('consignee', 'name address gstNumber')
      .populate('originalBill', 'billNumber billDate')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops');

    if (!creditNote) {
      log(`PDF generation failed: Credit note not found - ID: ${creditNoteId}`, 'warn');
      return res.status(404).json({ message: 'Credit note not found.' });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 40;
    const leftMargin = 40;
    const rightMargin = width - 40;
    const contentWidth = rightMargin - leftMargin;

    const lineSpacing = 18;
    const smallLineSpacing = 12;
    const itemLineSpacing = 16;

    const drawTextAndMeasureHeight = (textToDraw, xPos, currentY, options = {}) => {
      const textToProcess = String(textToDraw ?? '').replace(/₹/g, 'INR ');
      const FONT_TO_USE = options.font || font;
      const SIZE = options.size || 10;
      const COLOR = options.color || rgb(0, 0, 0);
      const LINE_HEIGHT = options.lineHeight || SIZE * 1.3;
      const MAX_WIDTH = options.maxWidth;
      const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 3;
      const ALIGN = options.align || 'left';

      let actualXPos = xPos;
      if (ALIGN === 'center' && MAX_WIDTH) {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
        actualXPos = xPos + (MAX_WIDTH - textWidth) / 2;
      } else if (ALIGN === 'center') {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
        actualXPos = leftMargin + (contentWidth - textWidth) / 2;
      }

      page.drawText(textToProcess, {
        x: actualXPos,
        y: currentY,
        font: FONT_TO_USE,
        size: SIZE,
        color: COLOR,
        lineHeight: LINE_HEIGHT,
        maxWidth: MAX_WIDTH,
        wordBreaks: [' ', '-', '/'],
      });

      let numLines = 1;
      if (MAX_WIDTH && FONT_TO_USE.widthOfTextAtSize(textToProcess.replace(/\n/g, ' '), SIZE) > MAX_WIDTH) {
        const segments = textToProcess.split('\n');
        numLines = 0;
        segments.forEach(segment => {
          if (segment.trim() === '') {
            numLines++;
            return;
          }
          let currentLineForEstimation = '';
          let linesForSegment = 1;
          const words = segment.split(' ');
          for (const word of words) {
            const testLineWithWord = currentLineForEstimation
              ? `${currentLineForEstimation} ${word}`
              : word;
            if (FONT_TO_USE.widthOfTextAtSize(testLineWithWord, SIZE) > MAX_WIDTH) {
              linesForSegment++;
              currentLineForEstimation = word;
            } else {
              currentLineForEstimation = testLineWithWord;
            }
          }
          numLines += linesForSegment;
        });
        if (textToProcess.endsWith('\n') && segments[segments.length - 1].trim() !== '') numLines++;
        if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
      } else {
        numLines = textToProcess.split('\n').length;
        if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
      }

      const textHeight = textToProcess.trim() === '' ? 0 : numLines * LINE_HEIGHT;
      return textHeight + SPACING_AFTER;
    };

    let currentY = y;

    // Header
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
    const shreeGaneshHeight = drawTextAndMeasureHeight(shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);

    const creditInvoiceText = 'CREDIT INVOICE';
    const creditInvoiceFontSize = 14;
    const creditInvoiceWidth = boldFont.widthOfTextAtSize(creditInvoiceText, creditInvoiceFontSize);
    const creditInvoiceOptions = {
      font: boldFont,
      size: creditInvoiceFontSize,
      color: rgb(0.8, 0.1, 0.1),
      spacingAfter: 0,
    };
    const creditInvoiceHeight = drawTextAndMeasureHeight(
      creditInvoiceText,
      rightMargin - creditInvoiceWidth,
      topHeaderTextY,
      creditInvoiceOptions
    );

    currentY -= Math.max(shreeGaneshHeight, creditInvoiceHeight) + 18;

    const companyNameText = org.name;
    const companyNameFontSize = 25;
    currentY -= drawTextAndMeasureHeight(companyNameText, leftMargin, currentY, {
      font: boldFont,
      size: companyNameFontSize,
      align: 'center',
      color: rgb(0.1, 0.3, 0.5),
    });

    const addressText = org.address;
    currentY -= drawTextAndMeasureHeight(addressText, leftMargin, currentY + 14, {
      size: 9,
      align: 'center',
      maxWidth: contentWidth,
      spacingAfter: 4,
    });

    const companyGSTIN = org.gstin;
    const companyStateCode = companyGSTIN.substring(0, 2);
    const gstinWithStateText = `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`;
    currentY -= drawTextAndMeasureHeight(gstinWithStateText, leftMargin, currentY + 14, {
      size: 10,
      align: 'center',
      spacingAfter: 15,
    });

    y = currentY;

    const buyerName =
      creditNote.companyDetailsSnapshot?.name || creditNote.company?.name || 'N/A';
    const buyerAddress =
      creditNote.companyDetailsSnapshot?.address || creditNote.company?.address || 'N/A';
    const buyerGstin =
      creditNote.companyDetailsSnapshot?.gstNumber || creditNote.company?.gstNumber || 'N/A';
    const buyerStateCode =
      buyerGstin !== 'N/A' && buyerGstin.length >= 2 ? buyerGstin.substring(0, 2) : 'N/A';

    let yLeft = y;
    let yRight = y;

    const detailsMaxWidth = contentWidth / 2 - 20;
    const billDetailsColumnWidth = 180;
    const billDetailsX = rightMargin - billDetailsColumnWidth;
    const billDetailsMaxWidth = billDetailsColumnWidth - 10;

    const buyerSectionHeight = creditNote.isConsigneeDifferent ? 155 : 100;
    page.drawRectangle({
      x: leftMargin,
      y: yLeft - (creditNote.isConsigneeDifferent ? 144 : 84),
      width: detailsMaxWidth + 20,
      height: buyerSectionHeight,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    page.drawRectangle({
      x: billDetailsX - 5,
      y: yRight - 84,
      width: billDetailsColumnWidth,
      height: 100,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    yLeft -= drawTextAndMeasureHeight(`Buyer:`, leftMargin + 5, yLeft, {
      font: boldFont,
      size: 11,
      spacingAfter: 4,
    });
    yLeft -= drawTextAndMeasureHeight(buyerName, leftMargin + 5, yLeft, {
      font: boldFont,
      size: 10,
      spacingAfter: 4,
      maxWidth: detailsMaxWidth,
    });
    yLeft -= drawTextAndMeasureHeight(buyerAddress, leftMargin + 5, yLeft, {
      size: 9,
      spacingAfter: 4,
      maxWidth: detailsMaxWidth,
    });
    yLeft -= drawTextAndMeasureHeight(
      `GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`,
      leftMargin + 5,
      yLeft,
      { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth }
    );

    if (creditNote.isConsigneeDifferent && creditNote.consigneeDetailsSnapshot) {
      const consigneeName = creditNote.consigneeDetailsSnapshot.name || 'N/A';
      const consigneeAddress = creditNote.consigneeDetailsSnapshot.address || 'N/A';
      const consigneeGstin = creditNote.consigneeDetailsSnapshot.gstNumber || 'N/A';
      const consigneeStateCode = creditNote.consigneeDetailsSnapshot.stateCode || 'N/A';

      yLeft -= drawTextAndMeasureHeight(`Consignee:`, leftMargin + 5, yLeft, {
        font: boldFont,
        size: 11,
        spacingAfter: 4,
      });
      yLeft -= drawTextAndMeasureHeight(consigneeName, leftMargin + 5, yLeft, {
        font: boldFont,
        size: 10,
        spacingAfter: 4,
        maxWidth: detailsMaxWidth,
      });
      yLeft -= drawTextAndMeasureHeight(consigneeAddress, leftMargin + 5, yLeft, {
        size: 9,
        spacingAfter: 4,
        maxWidth: detailsMaxWidth,
      });
      yLeft -= drawTextAndMeasureHeight(
        `GSTIN: ${consigneeGstin}     STATE CODE: ${consigneeStateCode}`,
        leftMargin + 5,
        yLeft,
        { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth }
      );
    }

    // Right side details — now includes Financial Year
    yRight -= drawTextAndMeasureHeight(
      `Date : ${new Date(creditNote.creditNoteDate).toLocaleDateString('en-IN')}`,
      billDetailsX,
      yRight,
      { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth }
    );
    yRight -= drawTextAndMeasureHeight(
      `Credit Note No : ${creditNote.creditNoteNumber || 'N/A'}`,
      billDetailsX,
      yRight,
      { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth }
    );
    yRight -= drawTextAndMeasureHeight(
      `Original Bill No : ${creditNote.originalBillNumber || 'N/A'}`,
      billDetailsX,
      yRight,
      { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth }
    );
    yRight -= drawTextAndMeasureHeight(
      `Reason : ${creditNote.returnReason || 'N/A'}`,
      billDetailsX,
      yRight,
      { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth }
    );

    y = Math.min(yLeft, yRight) - (creditNote.isConsigneeDifferent ? lineSpacing + 10 : lineSpacing);

    // Items table header
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

    const colPositions = {
      srNo: leftMargin + 10,
      desc: leftMargin + 50,
      hsn: leftMargin + 260,
      qty: leftMargin + 340,
      rate: leftMargin + 410,
      amount: rightMargin - 80,
    };

    const headerOptions = { font: boldFont, size: 10, spacingAfter: 0, color: rgb(0.1, 0.1, 0.1) };
    drawTextAndMeasureHeight('Sr No.', colPositions.srNo, y, headerOptions);
    drawTextAndMeasureHeight('Description of Goods', colPositions.desc, y, {
      ...headerOptions,
      maxWidth: colPositions.hsn - colPositions.desc - 15,
    });
    drawTextAndMeasureHeight('HSN/SAC', colPositions.hsn, y, headerOptions);
    drawTextAndMeasureHeight('Quantity', colPositions.qty, y, headerOptions);
    drawTextAndMeasureHeight('Rate/Kgs', colPositions.rate, y, headerOptions);
    const amountHeaderText = 'Amount';
    const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeaderText, 10);
    drawTextAndMeasureHeight(amountHeaderText, rightMargin - amountHeaderWidth - 10, y, headerOptions);

    y -= smallLineSpacing;
    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= itemLineSpacing;

    creditNote.items.forEach((item, index) => {
      const itemRowOptions = { size: 9, spacingAfter: 0 };
      let maxHeightThisRow = 0;

      if (index % 2 === 0) {
        page.drawRectangle({
          x: leftMargin,
          y: y - 5,
          width: contentWidth,
          height: 16,
          color: rgb(0.98, 0.98, 0.98),
          opacity: 0.5,
        });
      }

      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(index + 1), colPositions.srNo, y, itemRowOptions));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.description, colPositions.desc, y, {
        ...itemRowOptions,
        maxWidth: colPositions.hsn - colPositions.desc - 15,
      }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.hsnSacCode, colPositions.hsn, y, {
        ...itemRowOptions,
        maxWidth: colPositions.qty - colPositions.hsn - 10,
      }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.quantity.toFixed(2)), colPositions.qty, y, {
        ...itemRowOptions,
        maxWidth: colPositions.rate - colPositions.qty - 10,
      }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(Math.round(item.rate || 0)), colPositions.rate, y, {
        ...itemRowOptions,
        maxWidth: colPositions.amount - colPositions.rate - 10,
      }));
      const amountStr = String(Math.round(item.amount || 0));
      const amountCellWidth = font.widthOfTextAtSize(amountStr, 9);
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(amountStr, rightMargin - amountCellWidth - 10, y, itemRowOptions));

      y -= maxHeightThisRow + itemLineSpacing / 2;
    });

    const minItemRows = creditNote.isConsigneeDifferent ? 4 : 7;
    if (creditNote.items.length < minItemRows) {
      for (let i = creditNote.items.length; i < minItemRows; i++) {
        y -= itemLineSpacing;
      }
    }

    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= smallLineSpacing + 1;

    // Totals
    const totalsLabelX = rightMargin - 230;
    const totalsValueX = rightMargin - 100;

    const drawTotalLine = (label, valueStr, isBold = false) => {
      const commonOpt = { size: 10, font: isBold ? boldFont : font, spacingAfter: 2 };
      const labelMaxWidth = totalsValueX - totalsLabelX - 15;

      const hLabel = drawTextAndMeasureHeight(label, totalsLabelX, y, {
        ...commonOpt,
        maxWidth: labelMaxWidth,
      });
      const valWidth = (isBold ? boldFont : font).widthOfTextAtSize(valueStr, commonOpt.size);
      const valXPos = rightMargin - valWidth - 10;
      const hValue = drawTextAndMeasureHeight(valueStr, valXPos, y, commonOpt);

      y -= Math.max(hLabel, hValue) + 10;
    };

    page.drawRectangle({
      x: totalsLabelX - 10,
      y: y - 114,
      width: rightMargin - totalsLabelX + 15,
      height: 124,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    drawTotalLine('Subtotal', String(Math.round(creditNote.subTotalAmount || 0)));
    if (creditNote.discountAmount > 0) {
      drawTotalLine(
        `Discount (${creditNote.discountPercentage}%):`,
        `- ${String(Math.round(creditNote.discountAmount || 0))}`
      );
    }
    drawTotalLine('Amount After Discount:', String(Math.round(creditNote.amountAfterDiscount || 0)), true);

    if (creditNote.taxType === 'CGST_SGST') {
      drawTotalLine(
        `SGST (${creditNote.sgstPercentage}%):`,
        `+ ${String(Math.round(creditNote.sgstAmount || 0))}`
      );
      drawTotalLine(
        `CGST (${creditNote.cgstPercentage}%):`,
        `+ ${String(Math.round(creditNote.cgstAmount || 0))}`
      );
    } else if (creditNote.taxType === 'IGST') {
      drawTotalLine(
        `IGST (${creditNote.igstPercentage}%):`,
        `+ ${String(Math.round(creditNote.igstAmount || 0))}`
      );
    } else if (creditNote.taxType === 'JOBCGST_JOBSGST') {
      drawTotalLine(
        `SGST (${creditNote.jobSgstPercentage}%):`,
        `+ ${String(Math.round(creditNote.jobSgstAmount || 0))}`
      );
      drawTotalLine(
        `CGST (${creditNote.jobCgstPercentage}%):`,
        `+ ${String(Math.round(creditNote.jobCgstAmount || 0))}`
      );
    }

    y -= 5;
    page.drawLine({
      start: { x: totalsLabelX - 10, y: y + 5 },
      end: { x: rightMargin, y: y + 5 },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 3;

    drawTotalLine('Total Credit Amount', String(Math.round(creditNote.totalAmount || 0)), true);

    const currentTotalAmountInWords = amountToWords(creditNote.totalAmount || 0);
    if (
      currentTotalAmountInWords &&
      currentTotalAmountInWords !== 'Zero Rupees Only' &&
      creditNote.totalAmount !== 0
    ) {
      const amountInWordsText = `Amount in Words: ${currentTotalAmountInWords}`;
      y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
        font: boldFont,
        size: 10,
        spacingAfter: 8,
        maxWidth: contentWidth,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    if (creditNote.returnReasonNotes) {
      const notesText = `Return Notes: ${creditNote.returnReasonNotes}`;
      y -= drawTextAndMeasureHeight(notesText, leftMargin, y, {
        size: 9,
        spacingAfter: 8,
        maxWidth: contentWidth,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    y -= 2;
    page.drawLine({
      start: { x: leftMargin, y: y },
      end: { x: rightMargin, y: y },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 12;

    // Bank details
    let bankDetailsY = y;
    const bankDetailsMaxWidth = contentWidth * 0.5;
    bankDetailsY -= drawTextAndMeasureHeight('Bank Details:', leftMargin, bankDetailsY, {
      font: boldFont,
      size: 12,
      spacingAfter: 4,
    });
    bankDetailsY -= drawTextAndMeasureHeight(`Bank Name: ${org.bankName}`, leftMargin, bankDetailsY, {
      size: 10,
      spacingAfter: 3,
      maxWidth: bankDetailsMaxWidth,
    });
    bankDetailsY -= drawTextAndMeasureHeight(`Account Name: ${org.accountName}`, leftMargin, bankDetailsY, {
      size: 10,
      spacingAfter: 3,
      maxWidth: bankDetailsMaxWidth,
    });
    bankDetailsY -= drawTextAndMeasureHeight(`Account No.: ${org.accountNo}`, leftMargin, bankDetailsY, {
      size: 10,
      spacingAfter: 3,
      maxWidth: bankDetailsMaxWidth,
    });
    bankDetailsY -= drawTextAndMeasureHeight(`IFSC Code: ${org.ifsc}`, leftMargin, bankDetailsY, {
      size: 10,
      spacingAfter: 10,
      maxWidth: bankDetailsMaxWidth,
    });

    let declarationTitleY = bankDetailsY;
    const forCompanyText = `For ${org.name}`;
    const forCompanyFontSize = 11;
    const forCompanyOptions = { font: boldFont, size: forCompanyFontSize, spacingAfter: 3, align: 'right' };
    const forCompanyWidth = boldFont.widthOfTextAtSize(forCompanyText, forCompanyFontSize);

    const declarationTitleHeight = drawTextAndMeasureHeight('Declaration:', leftMargin, declarationTitleY, {
      font: boldFont,
      size: 12,
      spacingAfter: 4,
    });
    drawTextAndMeasureHeight(forCompanyText, rightMargin - forCompanyWidth, declarationTitleY, forCompanyOptions);
    bankDetailsY -= declarationTitleHeight;

    const declarationText = [
      'This credit note is issued against returned goods.',
      'All returned items will be added back to stock inventory.',
      'Refund will be processed as per company policy.',
      'Subject to Surat jurisdiction.',
    ];

    let lastDeclarationLineY = bankDetailsY;

    declarationText.forEach((line, index) => {
      const currentLineHeight = drawTextAndMeasureHeight(line, leftMargin, bankDetailsY, {
        size: 9,
        spacingAfter: 3,
        maxWidth: contentWidth * 0.6,
      });
      bankDetailsY -= currentLineHeight;
      if (index === declarationText.length - 1) {
        lastDeclarationLineY = bankDetailsY + currentLineHeight - 3;
      }
    });

    const authSignText = 'Authorised Signatory';
    const authSignFontSize = 9;
    const authSignWidth = font.widthOfTextAtSize(authSignText, authSignFontSize);
    drawTextAndMeasureHeight(authSignText, rightMargin - authSignWidth, lastDeclarationLineY, {
      font: font,
      size: authSignFontSize,
      spacingAfter: 0,
      align: 'right',
    });

    // Footer
    const bottomMarginForContact = 30;
    y = bottomMarginForContact;
    page.drawRectangle({
      x: leftMargin,
      y: y - 8,
      width: contentWidth,
      height: 20,
      color: rgb(0.1, 0.3, 0.5),
      opacity: 0.1,
    });
    const contactText =
      `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
    const contactTextWidth = font.widthOfTextAtSize(contactText, 9);
    drawTextAndMeasureHeight(
      contactText,
      leftMargin + (contentWidth - contactTextWidth) / 2,
      y,
      { size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3) }
    );

    const pdfBytes = await pdfDoc.save();
    const pdfFileName = `CreditNote-${creditNote.creditNoteNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    log(`PDF generated for credit note ${creditNote.creditNoteNumber}`, 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    log(
      `Error generating PDF for credit note ID ${creditNoteId}: ${error.message} - Stack: ${error.stack}`,
      'error'
    );
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF credit note.' });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Amount to words
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
  const crore = Math.floor(mainNum / 10000000); mainNum %= 10000000;
  const lakh = Math.floor(mainNum / 100000); mainNum %= 100000;
  const thousand = Math.floor(mainNum / 1000); mainNum %= 1000;
  const hundred = Math.floor(mainNum / 100); mainNum %= 100;

  if (crore > 0) str += (crore > 19 ? tens[Math.floor(crore / 10)] + ones[crore % 10] : ones[crore]) + 'Crore ';
  if (lakh > 0) str += (lakh > 19 ? tens[Math.floor(lakh / 10)] + ones[lakh % 10] : ones[lakh]) + 'Lakh ';
  if (thousand > 0) str += (thousand > 19 ? tens[Math.floor(thousand / 10)] + ones[thousand % 10] : ones[thousand]) + 'Thousand ';
  if (hundred > 0) str += (hundred > 19 ? tens[Math.floor(hundred / 10)] + ones[hundred % 10] : ones[hundred]) + 'Hundred ';
  if (mainNum > 0) str += (str !== '' && mainNum < 100 && str.trim() !== '' ? 'and ' : '') + (mainNum > 19 ? tens[Math.floor(mainNum / 10)] + ones[mainNum % 10] : ones[mainNum]);

  const finalStr = (str.trim() + ' Rupees Only').trim();
  return finalStr.length > 'Rupees Only'.length ? finalStr : 'Zero Rupees Only';
};

module.exports = {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
  generateCreditNotePdf,
  calculateCreditNoteTotals,
  amountToWords,
  getNextCreditNoteNumber,
  getUnpaidBillsByCompany,
  getFinancialYear,
};