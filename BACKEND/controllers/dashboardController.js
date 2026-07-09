const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const Transaction = require('../models/Transaction');
const CreditNote = require('../models/CreditNote');
const DebitNote = require('../models/DebitNote');
const { log } = require('../middleware/logger');

function getFinancialYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

function getFYRange(fy) {
  const [startYear] = fy.split('-').map(Number);
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

function getCurrentFY() {
  return getFinancialYear(new Date());
}

function getLast3FY() {
  const current = getCurrentFY();
  const [startYear] = current.split('-').map(Number);
  return [
    current,
    `${startYear - 1}-${String(startYear).slice(-2)}`,
    `${startYear - 2}-${String(startYear - 1).slice(-2)}`,
  ];
}

function round(num) {
  return Number(Number(num).toFixed(2));
}

// @desc    Get available financial years
// @route   GET /api/dashboard/financial-years
// @access  Private/Admin
const getFinancialYears = async (req, res) => {
  try {
    const years = getLast3FY();
    res.json({ current: getCurrentFY(), available: years });
  } catch (error) {
    log(`Error fetching financial years: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching financial years.' });
  }
};

// @desc    Get FY-wise account summary (income, expense, balance)
// @route   GET /api/dashboard/fy-summary?fy=2025-26
// @access  Private/Admin
const getFYSummary = async (req, res) => {
  try {
    const fy = req.query.fy || getCurrentFY();
    const { start, end } = getFYRange(fy);

    const fyTransactions = await Transaction.find({
      paymentDate: { $gte: start, $lte: end },
      organizationId: req.organizationId,
    }).lean();

    const totalIn = fyTransactions
      .filter((t) => t.type === 'IN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalOut = fyTransactions
      .filter((t) => t.type === 'OUT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const fyBills = await Bill.find({
      billDate: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' },
      organizationId: req.organizationId,
    }).lean();

    const fyPurchases = await Purchase.find({
      purchaseBillDate: { $gte: start, $lte: end },
      organizationId: req.organizationId,
    }).lean();

    const fyCreditNotes = await CreditNote.find({
      creditNoteDate: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' },
      organizationId: req.organizationId,
    }).lean();

    const fyDebitNotes = await DebitNote.find({
      debitNoteDate: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' },
      organizationId: req.organizationId,
    }).lean();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthTransactions = await Transaction.find({
      paymentDate: { $gte: monthStart, $lte: monthEnd },
      organizationId: req.organizationId,
    }).lean();

    const currentMonthIn = currentMonthTransactions
      .filter((t) => t.type === 'IN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const currentMonthOut = currentMonthTransactions
      .filter((t) => t.type === 'OUT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netIncome = round(totalIn);
    const netExpense = round(totalOut);

    res.json({
      fy,
      transactions: {
        totalIn: round(totalIn),
        totalOut: round(totalOut),
        balance: round(totalIn - totalOut),
      },
      currentMonth: {
        month: now.toLocaleString('default', { month: 'long' }),
        year: now.getFullYear(),
        totalIn: round(currentMonthIn),
        totalOut: round(currentMonthOut),
        balance: round(currentMonthIn - currentMonthOut),
      },
      invoices: {
        totalIncome: round(totalIn),
        creditNotes: 0,
        netIncome,
        totalExpense: round(totalOut),
        debitNotes: 0,
        netExpense,
        netProfit: round(totalIn - totalOut),
      },
      counts: {
        bills: fyBills.length,
        purchases: fyPurchases.length,
        creditNotes: fyCreditNotes.length,
        debitNotes: fyDebitNotes.length,
        transactions: fyTransactions.length,
      },
    });
  } catch (error) {
    log(`Error fetching FY summary: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching FY summary.' });
  }
};

// @desc    Get comparison data for last 3 financial years
// @route   GET /api/dashboard/fy-comparison
// @access  Private/Admin
const getFYComparison = async (req, res) => {
  try {
    const fyList = getLast3FY();
    const results = [];

    for (const fy of fyList) {
      const { start, end } = getFYRange(fy);

      const [bills, purchases, creditNotes, debitNotes, transactions] = await Promise.all([
        Bill.find({ billDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
        Purchase.find({ purchaseBillDate: { $gte: start, $lte: end }, organizationId: req.organizationId }).lean(),
        CreditNote.find({ creditNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
        DebitNote.find({ debitNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
        Transaction.find({ paymentDate: { $gte: start, $lte: end }, organizationId: req.organizationId }).lean(),
      ]);

      const totalIn = transactions.filter((t) => t.type === 'IN').reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalOut = transactions.filter((t) => t.type === 'OUT').reduce((sum, t) => sum + (t.amount || 0), 0);

      results.push({
        fy,
        income: round(totalIn),
        expense: round(totalOut),
        creditNotes: 0,
        debitNotes: 0,
        netIncome: round(totalIn),
        netExpense: round(totalOut),
        netProfit: round(totalIn - totalOut),
        cashIn: round(totalIn),
        cashOut: round(totalOut),
        cashBalance: round(totalIn - totalOut),
        billCount: bills.length,
        purchaseCount: purchases.length,
      });
    }

    res.json({ fyList, data: results });
  } catch (error) {
    log(`Error fetching FY comparison: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching FY comparison.' });
  }
};

// @desc    Get FY-wise monthly breakdown for chart
// @route   GET /api/dashboard/fy-monthly?fy=2025-26
// @access  Private/Admin
const getFYMonthlyBreakdown = async (req, res) => {
  try {
    const fy = req.query.fy || getCurrentFY();
    const [startYear] = fy.split('-').map(Number);
    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const fyMonths = [];

    for (let m = 4; m <= 12; m++) {
      fyMonths.push({ year: startYear, month: m, label: monthNames[m - 4] });
    }
    for (let m = 1; m <= 3; m++) {
      fyMonths.push({ year: startYear + 1, month: m, label: monthNames[m + 8] });
    }

    const labels = fyMonths.map((m) => m.label);
    const incomeData = new Array(12).fill(0);
    const expenseData = new Array(12).fill(0);

    const [transactions] = await Promise.all([
      Transaction.find({ organizationId: req.organizationId }).lean(),
    ]);

    for (let i = 0; i < fyMonths.length; i++) {
      const { year, month } = fyMonths[i];
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      incomeData[i] = round(
        transactions
          .filter((t) => {
            const d = new Date(t.paymentDate);
            return d >= monthStart && d <= monthEnd && t.type === 'IN';
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      );

      expenseData[i] = round(
        transactions
          .filter((t) => {
            const d = new Date(t.paymentDate);
            return d >= monthStart && d <= monthEnd && t.type === 'OUT';
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      );
    }

    res.json({ fy, labels, incomeData, expenseData });
  } catch (error) {
    log(`Error fetching FY monthly breakdown: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching FY monthly breakdown.' });
  }
};

// @desc    Get FY-wise material flow (purchase, sale, credit note, debit note)
// @route   GET /api/dashboard/fy-material-flow?fy=2025-26
// @access  Private/Admin
const getFYMaterialFlow = async (req, res) => {
  try {
    const fy = req.query.fy || getCurrentFY();
    const { start, end } = getFYRange(fy);

    const [bills, purchases, creditNotes, debitNotes] = await Promise.all([
      Bill.find({ billDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
      Purchase.find({ purchaseBillDate: { $gte: start, $lte: end }, organizationId: req.organizationId }).lean(),
      CreditNote.find({ creditNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
      DebitNote.find({ debitNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
    ]);

    let totalSoldQty = 0;
    bills.forEach((bill) => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((item) => {
          totalSoldQty += item.quantity || 0;
        });
      }
    });

    const totalPurchasedQty = purchases.reduce((sum, p) => sum + (p.netWeight || 0), 0);

    let totalCreditNoteQty = 0;
    creditNotes.forEach((cn) => {
      if (cn.items && Array.isArray(cn.items)) {
        cn.items.forEach((item) => {
          totalCreditNoteQty += item.quantity || 0;
        });
      }
    });

    let totalDebitNoteQty = 0;
    debitNotes.forEach((dn) => {
      if (dn.items && Array.isArray(dn.items)) {
        dn.items.forEach((item) => {
          totalDebitNoteQty += item.quantity || 0;
        });
      }
    });

    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const [startYear] = fy.split('-').map(Number);
    const fyMonths = [];
    for (let m = 4; m <= 12; m++) fyMonths.push({ year: startYear, month: m, label: monthNames[m - 4] });
    for (let m = 1; m <= 3; m++) fyMonths.push({ year: startYear + 1, month: m, label: monthNames[m + 8] });

    const labels = fyMonths.map((m) => m.label);
    const soldData = new Array(12).fill(0);
    const purchasedData = new Array(12).fill(0);
    const creditNoteData = new Array(12).fill(0);
    const debitNoteData = new Array(12).fill(0);

    for (let i = 0; i < fyMonths.length; i++) {
      const { year, month } = fyMonths[i];
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      bills.forEach((bill) => {
        const d = new Date(bill.billDate);
        if (d >= monthStart && d <= monthEnd && bill.items) {
          bill.items.forEach((item) => {
            soldData[i] += item.quantity || 0;
          });
        }
      });

      purchases.forEach((p) => {
        const d = new Date(p.purchaseBillDate);
        if (d >= monthStart && d <= monthEnd) {
          purchasedData[i] += p.netWeight || 0;
        }
      });

      creditNotes.forEach((cn) => {
        const d = new Date(cn.creditNoteDate);
        if (d >= monthStart && d <= monthEnd && cn.items) {
          cn.items.forEach((item) => {
            creditNoteData[i] += item.quantity || 0;
          });
        }
      });

      debitNotes.forEach((dn) => {
        const d = new Date(dn.debitNoteDate);
        if (d >= monthStart && d <= monthEnd && dn.items) {
          dn.items.forEach((item) => {
            debitNoteData[i] += item.quantity || 0;
          });
        }
      });

      soldData[i] = round(soldData[i]);
      purchasedData[i] = round(purchasedData[i]);
      creditNoteData[i] = round(creditNoteData[i]);
      debitNoteData[i] = round(debitNoteData[i]);
    }

    res.json({
      fy,
      labels,
      soldData,
      purchasedData,
      creditNoteData,
      debitNoteData,
      totals: {
        totalSold: round(totalSoldQty),
        totalPurchased: round(totalPurchasedQty),
        totalCreditNotes: round(totalCreditNoteQty),
        totalDebitNotes: round(totalDebitNoteQty),
        netFlow: round(totalSoldQty - totalCreditNoteQty - totalPurchasedQty + totalDebitNoteQty),
      },
    });
  } catch (error) {
    log(`Error fetching FY material flow: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching FY material flow.' });
  }
};

// @desc    Get overdue sales bills (fixed: null company, missing dueDate)
// @route   GET /api/dashboard/overdue-bills
// @access  Private/Admin
const getOverdueBills = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueBills = await Bill.find({
      dueDate: { $lt: today, $ne: null },
      status: { $in: ['Pending', 'Partially Paid', 'Overdue'] },
      organizationId: req.organizationId,
    })
      .populate('company', 'name')
      .select('billNumber billDate dueDate totalAmount totalPaidAmount status company financialYear')
      .sort({ dueDate: 1 });

    const safeBills = overdueBills.map((bill) => ({
      _id: bill._id,
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      totalAmount: bill.totalAmount || 0,
      totalPaidAmount: bill.totalPaidAmount || 0,
      status: bill.status,
      company: bill.company ? { name: bill.company.name } : { name: 'Unknown Company' },
      financialYear: bill.financialYear,
      daysOverdue: Math.floor((today - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24)),
    }));

    log(`Fetched overdue bills for dashboard`, 'info');
    res.json(safeBills);
  } catch (error) {
    log(`Error fetching overdue bills: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching overdue bills.' });
  }
};

// @desc    Get overdue purchases (fixed: null company, missing dueDate)
// @route   GET /api/dashboard/overdue-purchases
// @access  Private/Admin
const getOverduePurchases = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overduePurchases = await Purchase.find({
      dueDate: { $lt: today, $ne: null },
      paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
      organizationId: req.organizationId,
    })
      .populate('supplierCompany', 'name')
      .select('purchaseBillNumber purchaseBillDate dueDate amount totalPaidAmount paymentStatus supplierCompany financialYear')
      .sort({ dueDate: 1 });

    const safePurchases = overduePurchases.map((purchase) => ({
      _id: purchase._id,
      purchaseBillNumber: purchase.purchaseBillNumber,
      purchaseBillDate: purchase.purchaseBillDate,
      dueDate: purchase.dueDate,
      amount: purchase.amount || 0,
      totalPaidAmount: purchase.totalPaidAmount || 0,
      paymentStatus: purchase.paymentStatus,
      supplierCompany: purchase.supplierCompany
        ? { name: purchase.supplierCompany.name }
        : { name: 'Unknown Supplier' },
      financialYear: purchase.financialYear,
      daysOverdue: Math.floor((today - new Date(purchase.dueDate)) / (1000 * 60 * 60 * 24)),
    }));

    log(`Fetched overdue purchases for dashboard`, 'info');
    res.json(safePurchases);
  } catch (error) {
    log(`Error fetching overdue purchases: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching overdue purchases.' });
  }
};

// @desc    Get all overdue items combined for table view
// @route   GET /api/dashboard/all-overdue
// @access  Private/Admin
const getAllOverdue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [overdueBills, overduePurchases] = await Promise.all([
      Bill.find({
        dueDate: { $lt: today, $ne: null },
        status: { $in: ['Pending', 'Partially Paid', 'Overdue'] },
        organizationId: req.organizationId,
      })
        .populate('company', 'name')
        .select('billNumber billDate dueDate totalAmount totalPaidAmount status company financialYear')
        .sort({ dueDate: 1 })
        .lean(),

      Purchase.find({
        dueDate: { $lt: today, $ne: null },
        paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
        organizationId: req.organizationId,
      })
        .populate('supplierCompany', 'name')
        .select('purchaseBillNumber purchaseBillDate dueDate amount totalPaidAmount paymentStatus supplierCompany financialYear')
        .sort({ dueDate: 1 })
        .lean(),
    ]);

    const bills = overdueBills.map((bill) => ({
      _id: bill._id,
      type: 'bill',
      number: bill.billNumber,
      date: bill.billDate,
      dueDate: bill.dueDate,
      totalAmount: bill.totalAmount || 0,
      paidAmount: bill.totalPaidAmount || 0,
      balance: (bill.totalAmount || 0) - (bill.totalPaidAmount || 0),
      status: bill.status,
      party: bill.company ? bill.company.name : 'Unknown Company',
      financialYear: bill.financialYear,
      daysOverdue: Math.floor((today - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24)),
    }));

    const purchases = overduePurchases.map((p) => ({
      _id: p._id,
      type: 'purchase',
      number: p.purchaseBillNumber,
      date: p.purchaseBillDate,
      dueDate: p.dueDate,
      totalAmount: p.amount || 0,
      paidAmount: p.totalPaidAmount || 0,
      balance: (p.amount || 0) - (p.totalPaidAmount || 0),
      status: p.paymentStatus,
      party: p.supplierCompany ? p.supplierCompany.name : 'Unknown Supplier',
      financialYear: p.financialYear,
      daysOverdue: Math.floor((today - new Date(p.dueDate)) / (1000 * 60 * 60 * 24)),
    }));

    const allOverdue = [...bills, ...purchases].sort((a, b) => a.daysOverdue - b.daysOverdue);

    res.json({
      total: allOverdue.length,
      bills: bills.length,
      purchases: purchases.length,
      totalOutstanding: round(allOverdue.reduce((sum, item) => sum + item.balance, 0)),
      items: allOverdue,
    });
  } catch (error) {
    log(`Error fetching all overdue: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching overdue items.' });
  }
};

// @desc    Get upcoming bill dues (next 5 days)
// @route   GET /api/dashboard/upcoming-bill-dues
// @access  Private/Admin
const getUpcomingBillDues = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingDues = await Bill.find({
      dueDate: { $gte: today, $lte: fiveDaysFromNow },
      status: { $in: ['Pending', 'Partially Paid'] },
      organizationId: req.organizationId,
    })
      .populate('company', 'name')
      .select('billNumber billDate dueDate totalAmount totalPaidAmount status company financialYear')
      .sort({ dueDate: 1 })
      .lean();

    const safeDues = upcomingDues.map((bill) => ({
      _id: bill._id,
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      totalAmount: bill.totalAmount || 0,
      totalPaidAmount: bill.totalPaidAmount || 0,
      status: bill.status,
      company: bill.company ? { name: bill.company.name } : { name: 'Unknown Company' },
      financialYear: bill.financialYear,
    }));

    log(`Fetched upcoming bill dues for dashboard`, 'info');
    res.json(safeDues);
  } catch (error) {
    log(`Error fetching upcoming bill dues: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching upcoming bill dues.' });
  }
};

// @desc    Get upcoming purchase dues (next 5 days)
// @route   GET /api/dashboard/upcoming-purchase-dues
// @access  Private/Admin
const getUpcomingPurchaseDues = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingDues = await Purchase.find({
      dueDate: { $gte: today, $lte: fiveDaysFromNow },
      paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
      organizationId: req.organizationId,
    })
      .populate('supplierCompany', 'name')
      .select('purchaseBillNumber purchaseBillDate dueDate amount totalPaidAmount paymentStatus supplierCompany financialYear')
      .sort({ dueDate: 1 })
      .lean();

    const safeDues = upcomingDues.map((p) => ({
      _id: p._id,
      purchaseBillNumber: p.purchaseBillNumber,
      purchaseBillDate: p.purchaseBillDate,
      dueDate: p.dueDate,
      amount: p.amount || 0,
      totalPaidAmount: p.totalPaidAmount || 0,
      paymentStatus: p.paymentStatus,
      supplierCompany: p.supplierCompany ? { name: p.supplierCompany.name } : { name: 'Unknown Supplier' },
      financialYear: p.financialYear,
    }));

    log(`Fetched upcoming purchase dues for dashboard`, 'info');
    res.json(safeDues);
  } catch (error) {
    log(`Error fetching upcoming purchase dues: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching upcoming purchase dues.' });
  }
};

// @desc    Get material flow cards summary (purchase, sale, credit note, debit note)
// @route   GET /api/dashboard/material-flow-cards?fy=2025-26
// @access  Private/Admin
const getMaterialFlowCards = async (req, res) => {
  try {
    const fy = req.query.fy || getCurrentFY();
    const { start, end } = getFYRange(fy);

    const [bills, purchases, creditNotes, debitNotes] = await Promise.all([
      Bill.find({ billDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
      Purchase.find({ purchaseBillDate: { $gte: start, $lte: end }, organizationId: req.organizationId }).lean(),
      CreditNote.find({ creditNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
      DebitNote.find({ debitNoteDate: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, organizationId: req.organizationId }).lean(),
    ]);

    const totalSales = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalCreditNotes = creditNotes.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalDebitNotes = debitNotes.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    res.json({
      fy,
      sales: {
        count: bills.length,
        total: round(totalSales),
      },
      purchases: {
        count: purchases.length,
        total: round(totalPurchases),
      },
      creditNotes: {
        count: creditNotes.length,
        total: round(totalCreditNotes),
      },
      debitNotes: {
        count: debitNotes.length,
        total: round(totalDebitNotes),
      },
      netSales: round(totalSales - totalCreditNotes),
      netPurchases: round(totalPurchases + totalDebitNotes),
    });
  } catch (error) {
    log(`Error fetching material flow cards: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching material flow cards.' });
  }
};

module.exports = {
  getFinancialYears,
  getFYSummary,
  getFYComparison,
  getFYMonthlyBreakdown,
  getFYMaterialFlow,
  getOverdueBills,
  getOverduePurchases,
  getAllOverdue,
  getUpcomingBillDues,
  getUpcomingPurchaseDues,
  getMaterialFlowCards,
};
