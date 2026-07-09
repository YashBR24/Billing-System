import mongoose from 'mongoose';

const Bill = mongoose.model('Bill');
const Purchase = mongoose.model('Purchase');
const CreditNote = mongoose.model('CreditNote');
const DebitNote = mongoose.model('DebitNote');
const InterestNote = mongoose.model('InterestNote');
const Settings = mongoose.model('Settings');

function getFinancialYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function getFYRange(fy) {
  const [startYear] = fy.split('-').map(Number);
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

function round(num) {
  return Number(Number(num).toFixed(2));
}

function extractStateCode(gstNumber) {
  if (gstNumber && typeof gstNumber === 'string' && gstNumber.length >= 2) {
    return gstNumber.substring(0, 2);
  }
  return null;
}

function isInterState(buyerStateCode, supplierStateCode) {
  if (!buyerStateCode || !supplierStateCode) return false;
  return buyerStateCode !== supplierStateCode;
}

async function getOwnStateCode(organizationId) {
  const settings = await Settings.getSettings(organizationId);
  if (settings && settings.companyGstNumber) {
    return extractStateCode(settings.companyGstNumber);
  }
  return null;
}

async function aggregateSales(startDate, endDate, organizationId) {
  const bills = await Bill.find({
    billDate: { $gte: startDate, $lte: endDate },
    status: { $ne: 'Cancelled' },
    organizationId,
  }).lean();

  const result = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    jobCgst: 0,
    jobSgst: 0,
    totalTax: 0,
    totalAmount: 0,
    intraState: { taxableValue: 0, cgst: 0, sgst: 0, count: 0 },
    interState: { taxableValue: 0, igst: 0, count: 0 },
    jobWork: { taxableValue: 0, jobCgst: 0, jobSgst: 0, count: 0 },
    count: bills.length,
  };

  const ownStateCode = await getOwnStateCode(organizationId);

  for (const bill of bills) {
    const amountAfterDiscount = bill.amountAfterDiscount || 0;
    const buyerStateCode = extractStateCode(bill.companyDetailsSnapshot?.gstNumber) || ownStateCode;
    const interState = isInterState(ownStateCode, buyerStateCode);

    if (bill.taxType === 'JOBCGST_JOBSGST') {
      result.jobWork.taxableValue = round(result.jobWork.taxableValue + amountAfterDiscount);
      result.jobWork.jobCgst = round(result.jobWork.jobCgst + (bill.jobCgstAmount || 0));
      result.jobWork.jobSgst = round(result.jobWork.jobSgst + (bill.jobSgstAmount || 0));
      result.jobWork.count += 1;
      result.jobCgst = round(result.jobCgst + (bill.jobCgstAmount || 0));
      result.jobSgst = round(result.jobSgst + (bill.jobSgstAmount || 0));
    } else if (interState) {
      result.interState.taxableValue = round(result.interState.taxableValue + amountAfterDiscount);
      result.interState.igst = round(result.interState.igst + (bill.igstAmount || 0));
      result.interState.count += 1;
      result.igst = round(result.igst + (bill.igstAmount || 0));
    } else {
      result.intraState.taxableValue = round(result.intraState.taxableValue + amountAfterDiscount);
      result.intraState.cgst = round(result.intraState.cgst + (bill.cgstAmount || 0));
      result.intraState.sgst = round(result.intraState.sgst + (bill.sgstAmount || 0));
      result.intraState.count += 1;
      result.cgst = round(result.cgst + (bill.cgstAmount || 0));
      result.sgst = round(result.sgst + (bill.sgstAmount || 0));
    }

    result.taxableValue = round(result.taxableValue + amountAfterDiscount);
    result.totalTax = round(result.totalTax + (bill.totalTaxAmount || 0));
    result.totalAmount = round(result.totalAmount + (bill.totalAmount || 0));
  }

  return result;
}

async function aggregatePurchases(startDate, endDate, organizationId) {
  const purchases = await Purchase.find({
    purchaseBillDate: { $gte: startDate, $lte: endDate },
    organizationId,
  }).lean();

  const result = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalTax: 0,
    totalAmount: 0,
    intraState: { taxableValue: 0, cgst: 0, sgst: 0, count: 0 },
    interState: { taxableValue: 0, igst: 0, count: 0 },
    count: purchases.length,
  };

  const ownStateCode = await getOwnStateCode(organizationId);

  for (const purchase of purchases) {
    const supplierStateCode = extractStateCode(purchase.supplierDetailsSnapshot?.gstNumber) || ownStateCode;
    const interState = isInterState(ownStateCode, supplierStateCode);

    const baseAmount = purchase.subTotal || purchase.amount || 0;
    const cgstAmt = purchase.cgst || 0;
    const sgstAmt = purchase.sgst || 0;
    const igstAmt = purchase.igst || 0;
    const purchaseTotalTax = cgstAmt + sgstAmt + igstAmt;
    const purchaseTotal = baseAmount + purchaseTotalTax;

    if (interState) {
      result.interState.taxableValue = round(result.interState.taxableValue + baseAmount);
      result.interState.igst = round(result.interState.igst + igstAmt);
      result.interState.count += 1;
      result.igst = round(result.igst + igstAmt);
    } else {
      result.intraState.taxableValue = round(result.intraState.taxableValue + baseAmount);
      result.intraState.cgst = round(result.intraState.cgst + cgstAmt);
      result.intraState.sgst = round(result.intraState.sgst + sgstAmt);
      result.intraState.count += 1;
      result.cgst = round(result.cgst + cgstAmt);
      result.sgst = round(result.sgst + sgstAmt);
    }

    result.taxableValue = round(result.taxableValue + baseAmount);
    result.totalTax = round(result.totalTax + purchaseTotalTax);
    result.totalAmount = round(result.totalAmount + purchaseTotal);
  }

  return result;
}

async function aggregateCreditNotes(startDate, endDate, organizationId) {
  const creditNotes = await CreditNote.find({
    creditNoteDate: { $gte: startDate, $lte: endDate },
    status: { $ne: 'Cancelled' },
    organizationId,
  }).lean();

  const result = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    jobCgst: 0,
    jobSgst: 0,
    totalTax: 0,
    totalAmount: 0,
    count: creditNotes.length,
  };

  for (const cn of creditNotes) {
    const amountAfterDiscount = cn.amountAfterDiscount || 0;
    result.taxableValue = round(result.taxableValue + amountAfterDiscount);
    result.cgst = round(result.cgst + (cn.cgstAmount || 0));
    result.sgst = round(result.sgst + (cn.sgstAmount || 0));
    result.igst = round(result.igst + (cn.igstAmount || 0));
    result.jobCgst = round(result.jobCgst + (cn.jobCgstAmount || 0));
    result.jobSgst = round(result.jobSgst + (cn.jobSgstAmount || 0));
    result.totalTax = round(result.totalTax + (cn.totalTaxAmount || 0));
    result.totalAmount = round(result.totalAmount + (cn.totalAmount || 0));
  }

  return result;
}

async function aggregateDebitNotes(startDate, endDate, organizationId) {
  const debitNotes = await DebitNote.find({
    debitNoteDate: { $gte: startDate, $lte: endDate },
    status: { $ne: 'Cancelled' },
    organizationId,
  }).lean();

  const result = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    jobCgst: 0,
    jobSgst: 0,
    totalTax: 0,
    totalAmount: 0,
    count: debitNotes.length,
  };

  for (const dn of debitNotes) {
    const amountAfterDiscount = dn.amountAfterDiscount || 0;
    result.taxableValue = round(result.taxableValue + amountAfterDiscount);
    result.cgst = round(result.cgst + (dn.cgstAmount || 0));
    result.sgst = round(result.sgst + (dn.sgstAmount || 0));
    result.igst = round(result.igst + (dn.igstAmount || 0));
    result.jobCgst = round(result.jobCgst + (dn.jobCgstAmount || 0));
    result.jobSgst = round(result.jobSgst + (dn.jobSgstAmount || 0));
    result.totalTax = round(result.totalTax + (dn.totalTaxAmount || 0));
    result.totalAmount = round(result.totalAmount + (dn.totalAmount || 0));
  }

  return result;
}

async function aggregateInterestNotes(startDate, endDate, organizationId) {
  const interestNotes = await InterestNote.find({
    interestNoteDate: { $gte: startDate, $lte: endDate },
    status: { $ne: 'Cancelled' },
    organizationId,
  }).lean();

  const result = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalTax: 0,
    totalAmount: 0,
    count: interestNotes.length,
  };

  for (const note of interestNotes) {
    const subtotal = note.subtotal || 0;
    result.taxableValue = round(result.taxableValue + subtotal);
    result.cgst = round(result.cgst + (note.cgstAmount || 0));
    result.sgst = round(result.sgst + (note.sgstAmount || 0));
    result.igst = round(result.igst + (note.igstAmount || 0));
    result.totalTax = round(result.totalTax + (note.totalTaxAmount || 0));
    result.totalAmount = round(result.totalAmount + (note.totalAmount || 0));
  }

  return result;
}

function computeNetPayable(outputTax, inputTax, creditNoteTax, debitNoteTax, interestTax) {
  const totalOutput = round(outputTax + interestTax);
  const totalInput = round(inputTax);
  const totalCreditNoteAdjustment = round(creditNoteTax);
  const totalDebitNoteAdjustment = round(debitNoteTax);
  const netITC = round(totalInput - totalCreditNoteAdjustment + totalDebitNoteAdjustment);
  const netPayable = round(totalOutput - netITC);
  return {
    totalOutputTax: totalOutput,
    totalInputTax: totalInput,
    creditNoteTaxReduction: totalCreditNoteAdjustment,
    debitNoteTaxAddition: totalDebitNoteAdjustment,
    netITCAvailable: netITC,
    netPayable: netPayable,
    isRefund: netPayable < 0,
  };
}

function buildGSTR3BTable(sales, purchases, creditNotes, debitNotes, interestNotes, netPayable) {
  return {
    table31: {
      description: 'Outward taxable supplies (other than reverse charge)',
      taxableValue: sales.taxableValue,
      cgst: sales.cgst,
      sgst: sales.sgst,
      igst: sales.igst,
      totalTax: sales.totalTax,
    },
    table32: {
      description: 'Outward taxable supplies (reverse charge)',
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    },
    table40: {
      description: 'Eligible ITC - All other ITC',
      cgst: purchases.cgst,
      sgst: purchases.sgst,
      igst: purchases.igst,
      totalITC: purchases.totalTax,
    },
    table41: {
      description: 'ITC Reversed - Credit Notes',
      cgst: creditNotes.cgst,
      sgst: creditNotes.sgst,
      igst: creditNotes.igst,
      totalReversed: creditNotes.totalTax,
    },
    table42: {
      description: 'ITC Reversed - Debit Notes',
      cgst: debitNotes.cgst,
      sgst: debitNotes.sgst,
      igst: debitNotes.igst,
      totalReversed: debitNotes.totalTax,
    },
    table61: {
      description: 'Interest / Late fee payable',
      taxableValue: interestNotes.taxableValue,
      cgst: interestNotes.cgst,
      sgst: interestNotes.sgst,
      igst: interestNotes.igst,
      totalTax: interestNotes.totalTax,
    },
    summary: {
      totalOutputTax: netPayable.totalOutputTax,
      totalITCAvailable: netPayable.totalInputTax,
      netITC: netPayable.netITCAvailable,
      netPayable: netPayable.netPayable,
      isRefund: netPayable.isRefund,
    },
  };
}

async function getMonthlySummary(year, month, organizationId) {
  const { start, end } = getMonthRange(year, month);
  const fy = getFinancialYear(start);

  const [sales, purchases, creditNotes, debitNotes, interestNotes] = await Promise.all([
    aggregateSales(start, end, organizationId),
    aggregatePurchases(start, end, organizationId),
    aggregateCreditNotes(start, end, organizationId),
    aggregateDebitNotes(start, end, organizationId),
    aggregateInterestNotes(start, end, organizationId),
  ]);

  const outputTax = round(sales.totalTax);
  const inputTax = round(purchases.totalTax);
  const creditNoteTax = round(creditNotes.totalTax);
  const debitNoteTax = round(debitNotes.totalTax);
  const interestTax = round(interestNotes.totalTax);

  const netPayable = computeNetPayable(outputTax, inputTax, creditNoteTax, debitNoteTax, interestTax);
  const gstr3b = buildGSTR3BTable(sales, purchases, creditNotes, debitNotes, interestNotes, netPayable);

  return {
    period: `${String(month).padStart(2, '0')}-${year}`,
    financialYear: fy,
    startDate: start,
    endDate: end,
    sales,
    purchases,
    creditNotes,
    debitNotes,
    interestNotes,
    outputTax,
    inputTax,
    creditNoteTax,
    debitNoteTax,
    interestTax,
    netPayable,
    gstr3b,
  };
}

async function getFYSummary(financialYear, organizationId) {
  const { start, end } = getFYRange(financialYear);
  const months = [];

  const fyStartYear = parseInt(financialYear.split('-')[0], 10);
  for (let m = 4; m <= 12; m++) {
    months.push({ year: fyStartYear, month: m });
  }
  for (let m = 1; m <= 3; m++) {
    months.push({ year: fyStartYear + 1, month: m });
  }

  const monthSummaries = await Promise.all(
    months.map(({ year, month }) => getMonthlySummary(year, month, organizationId))
  );

  const totals = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalTax: 0,
    totalAmount: 0,
    outputTax: 0,
    inputTax: 0,
    netPayable: 0,
  };

  for (const ms of monthSummaries) {
    totals.taxableValue = round(totals.taxableValue + ms.sales.taxableValue);
    totals.cgst = round(totals.cgst + ms.sales.cgst);
    totals.sgst = round(totals.sgst + ms.sales.sgst);
    totals.igst = round(totals.igst + ms.sales.igst);
    totals.totalTax = round(totals.totalTax + ms.sales.totalTax);
    totals.totalAmount = round(totals.totalAmount + ms.sales.totalAmount);
    totals.outputTax = round(totals.outputTax + ms.outputTax);
    totals.inputTax = round(totals.inputTax + ms.inputTax);
    totals.netPayable = round(totals.netPayable + ms.netPayable.netPayable);
  }

  return {
    financialYear,
    startDate: start,
    endDate: end,
    months: monthSummaries,
    totals,
  };
}

export {
  getMonthlySummary,
  getFYSummary,
  getFinancialYear,
  getMonthRange,
  getFYRange,
  aggregateSales,
  aggregatePurchases,
  aggregateCreditNotes,
  aggregateDebitNotes,
  aggregateInterestNotes,
  computeNetPayable,
  buildGSTR3BTable,
};
