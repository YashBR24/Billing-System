const Transaction = require('../models/Transaction');
const { log } = require('../middleware/logger');
const { Parser } = require('json2csv'); // For CSV export

// @desc    Get detailed transaction report
// @route   GET /api/reports/transactions
// @access  Private/Admin
const   getTransactionReport = async (req, res) => {
  const { companyId, type, paymentMethod, startDate, endDate, month, year, descriptionSearch } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (type) query.type = type;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  
  if (descriptionSearch) {
    query.description = { $regex: descriptionSearch, $options: 'i' }; // Case-insensitive search
  }

  // Date filtering logic (similar to transactionController.getTransactions)
  if (month && year) {
    const firstDay = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    const lastDay = new Date(Date.UTC(year, parseInt(month), 0, 23, 59, 59, 999));
    query.paymentDate = { $gte: firstDay, $lte: lastDay };
  } else if (startDate && endDate) {
    query.paymentDate = { 
      $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)), 
      $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999)) 
    };
  } else if (startDate) {
    query.paymentDate = { $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)) };
  } else if (endDate) {
    query.paymentDate = { $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999)) };
  } else {
    // Default to current month if no date range specified
    const now = new Date();
    const firstDayCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const lastDayCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    query.paymentDate = { $gte: firstDayCurrentMonth, $lte: lastDayCurrentMonth };
  }

  try {
    const transactions = await Transaction.find(query)
      .populate('company', 'name')
      .populate('recordedBy', 'username')
      .populate('relatedBills.billId', 'billNumber')
      .populate('relatedPurchases.purchaseId', 'purchaseBillNumber')
      .sort({ paymentDate: -1, createdAt: -1 });

    // Calculate totals for the filtered set
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach(t => {
      if (t.type === 'IN') totalIn += t.amount;
      else if (t.type === 'OUT') totalOut += t.amount;
    });

    log(`Generated transaction report with query ${JSON.stringify(query)}`, 'info');
    res.json({ 
        transactions, 
        summary: {
            totalIn: parseFloat(totalIn.toFixed(2)),
            totalOut: parseFloat(totalOut.toFixed(2)),
            netFlow: parseFloat((totalIn - totalOut).toFixed(2))
        }
    });
  } catch (error) {
    log(`Error generating transaction report: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while generating transaction report.' });
  }
};

// @desc    Export detailed transaction report as CSV
// @route   GET /api/reports/transactions/export/csv
// @access  Private/Admin
const   exportTransactionReportCSV = async (req, res) => {
  // Re-use the same query logic as getTransactionReport
  const { companyId, type, paymentMethod, startDate, endDate, month, year, descriptionSearch } = req.query;
  const query = { organizationId: req.organizationId };
  if (companyId) query.company = companyId;
  if (type) query.type = type;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (descriptionSearch) query.description = { $regex: descriptionSearch, $options: 'i' };

  if (month && year) {
    const firstDay = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    const lastDay = new Date(Date.UTC(year, parseInt(month), 0, 23, 59, 59, 999));
    query.paymentDate = { $gte: firstDay, $lte: lastDay };
  } else if (startDate && endDate) {
    query.paymentDate = { $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)), $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999)) };
  } else if (startDate) {
    query.paymentDate = { $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)) };
  } else if (endDate) {
    query.paymentDate = { $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999)) };
  } else {
    const now = new Date();
    const firstDayCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const lastDayCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    query.paymentDate = { $gte: firstDayCurrentMonth, $lte: lastDayCurrentMonth };
  }

  try {
    const transactions = await Transaction.find(query)
      .populate('company', 'name')
      .populate('relatedBills.billId', 'billNumber')
      .populate('relatedPurchases.purchaseId', 'purchaseBillNumber')
      .sort({ paymentDate: -1 })
      .lean(); // Use .lean() for faster exports with large datasets

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No transactions found for the selected criteria to export.' });
    }

    const fields = [
      { label: 'Date', value: row => new Date(row.paymentDate).toLocaleDateString('en-IN') },
      { label: 'Type (IN/OUT)', value: 'type' },
      { label: 'Description', value: 'description' },
      { label: 'Company', value: row => row.company?.name || 'N/A' },
      { label: 'Amount', value: 'amount' },
      { label: 'Payment Method', value: 'paymentMethod' },
      { label: 'Reference No.', value: 'referenceNumber' },
      { label: 'Related Sales Bills', value: row => (row.relatedBills || []).map(b => b.billNumber || b.billId?.billNumber).join(', ') },
      { label: 'Related Purchase Bills', value: row => (row.relatedPurchases || []).map(p => p.purchaseBillNumber || p.purchaseId?.purchaseBillNumber).join(', ') },
      { label: 'Notes', value: 'notes' },
    ];
    const json2csvParser = new Parser({ fields, header: true });
    const csv = json2csvParser.parse(transactions);

    const fileName = `Transaction_Report_${new Date().toISOString().split('T')[0]}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    log(`Exported transaction report as CSV`, 'info');
    return res.send(csv);

  } catch (error) {
    log(`Error exporting transaction report as CSV: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while exporting transaction report.' });
  }
};

module.exports = {
  getTransactionReport,
  exportTransactionReportCSV
};