const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const Transaction = require('../models/Transaction');
const Company = require('../models/Company');
const CreditNote = require('../models/CreditNote');
const DebitNote = require('../models/DebitNote');
const InterestNote = require('../models/InterestNote');
const { log } = require('../middleware/logger');
const moment = require('moment');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const exceljs = require('exceljs');

// @desc    Get company ledger with filters
// @route   GET /api/ledger/company
// @access  Private/Admin
const getCompanyLedger = async (req, res) => {
  const { companyId, startDate, endDate, month, year } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required.' });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      log(`Company ledger failed: Company not found - ID: ${companyId}`, 'warn');
      return res.status(404).json({ message: 'Company not found.' });
    }

    let dateFilter = {};
    if (month && year) {
      const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
      const end = moment(start).endOf('month').toDate();
      dateFilter = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      dateFilter = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    } else if (startDate) {
      dateFilter = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateFilter = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
      Bill.find({
        company: companyId,
        ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter })
      }).sort({ billDate: 1 }),
      
      Purchase.find({
        supplierCompany: companyId,
        ...(Object.keys(dateFilter).length > 0 && { purchaseBillDate: dateFilter })
      }).sort({ purchaseBillDate: 1 }),
      
      Transaction.find({
        company: companyId,
        ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter })
      }).sort({ paymentDate: 1 }),

      CreditNote.find({
        company: companyId,
        ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter })
      }).sort({ creditNoteDate: 1 }),

      DebitNote.find({
        supplierCompany: companyId,
        ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter })
      }).sort({ debitNoteDate: 1 }),

      InterestNote.find({
        company: companyId,
        ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter })
      }).sort({ interestNoteDate: 1 }),
    ]);

    const ledgerEntries = [];
    
    bills.forEach(bill => {
      ledgerEntries.push({
        date: bill.billDate,
        type: 'Sale',
        docNo: bill.billNumber,
        description: `Bill to ${company.name}`,
        debit: bill.totalAmount,
        credit: null,
        amount: bill.totalAmount,
        referenceId: bill._id,
        referenceType: 'Bill'
      });
    });

    purchases.forEach(purchase => {
      ledgerEntries.push({
        date: purchase.purchaseBillDate,
        type: 'Purchase',
        docNo: purchase.purchaseBillNumber,
        description: `Purchase from ${company.name}`,
        debit: purchase.amount,
        credit: null,
        amount: purchase.amount,
        referenceId: purchase._id,
        referenceType: 'Purchase'
      });
    });

    transactions.forEach(transaction => {
      if (transaction.type === 'IN') {
        ledgerEntries.push({
          date: transaction.paymentDate,
          type: 'Payment Received',
          docNo: transaction.referenceNumber || `TR-${transaction._id.toString().slice(-6)}`,
          description: transaction.description,
          debit: null,
          credit: transaction.amount,
          amount: transaction.amount,
          referenceId: transaction._id,
          referenceType: 'Transaction'
        });
      } else if (transaction.type === 'OUT') {
        ledgerEntries.push({
          date: transaction.paymentDate,
          type: 'Payment Made',
          docNo: transaction.referenceNumber || `TR-${transaction._id.toString().slice(-6)}`,
          description: transaction.description,
          debit: transaction.amount,
          credit: null,
          amount: transaction.amount,
          referenceId: transaction._id,
          referenceType: 'Transaction'
        });
      }
    });

    creditNotes.forEach(note => {
      const isProcessed = note.status === 'Processed';
      ledgerEntries.push({
        date: note.creditNoteDate,
        type: 'Credit Note',
        docNo: note.creditNoteNumber,
        description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
        debit: null,
        credit: isProcessed ? note.totalAmount : null,
        amount: note.totalAmount,
        status: note.status,
        referenceId: note._id,
        referenceType: 'CreditNote'
      });
    });

    debitNotes.forEach(note => {
      const isProcessed = note.status === 'Processed';
      ledgerEntries.push({
        date: note.debitNoteDate,
        type: 'Debit Note',
        docNo: note.debitNoteNumber,
        description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
        debit: isProcessed ? note.totalAmount : null,
        credit: null,
        amount: note.totalAmount,
        status: note.status,
        referenceId: note._id,
        referenceType: 'DebitNote'
      });
    });

    interestNotes.forEach(note => {
      const isPaid = note.status === 'Paid';
      ledgerEntries.push({
        date: note.interestNoteDate,
        type: 'Interest Note',
        docNo: note.interestNoteNumber,
        description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
        debit: null,
        credit: isPaid ? note.totalAmount : null,
        amount: note.totalAmount,
        status: note.status,
        referenceId: note._id,
        referenceType: 'InterestNote'
      });
    });

    ledgerEntries.sort((a, b) => a.date - b.date);

    const totalSales = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    
    const totalPaymentsReceived = transactions
      .filter(t => t.type === 'IN')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalPaymentsMade = transactions
      .filter(t => t.type === 'OUT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCreditNotes = creditNotes.reduce((sum, note) => sum + note.totalAmount, 0);
    const totalDebitNotes = debitNotes.reduce((sum, note) => sum + note.totalAmount, 0);
    const totalInterestNotes = interestNotes.reduce((sum, note) => sum + note.totalAmount, 0);

    const processedCreditNotes = creditNotes
      .filter(n => n.status === 'Processed')
      .reduce((sum, note) => sum + note.totalAmount, 0);
    const processedDebitNotes = debitNotes
      .filter(n => n.status === 'Processed')
      .reduce((sum, note) => sum + note.totalAmount, 0);
    const paidInterestNotes = interestNotes
      .filter(n => n.status === 'Paid')
      .reduce((sum, note) => sum + note.totalAmount, 0);

    const netBalance = (totalSales + totalPaymentsMade + processedDebitNotes) - (totalPurchases + totalPaymentsReceived + processedCreditNotes + paidInterestNotes);
    const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

    const response = {
      company: {
        _id: company._id,
        name: company.name,
        gstNumber: company.gstNumber
      },
      dateRange: {
        start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
        end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
      },
      ledgerEntries,
      summary: {
        totalSales,
        totalPurchases,
        totalPaymentsReceived,
        totalPaymentsMade,
        totalCreditNotes,
        totalDebitNotes,
        totalInterestNotes,
        processedCreditNotes,
        processedDebitNotes,
        paidInterestNotes,
        netBalance: Math.abs(netBalance),
        balanceType
      }
    };

    res.json(response);

  } catch (error) {
    log(`Error generating company ledger: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while generating company ledger.' });
  }
};

// @desc    Get all companies ledger summary
// @route   GET /api/ledger/companies-summary
// @access  Private/Admin
const getCompaniesLedgerSummary = async (req, res) => {
  const { startDate, endDate, month, year } = req.query;

  try {
    let dateFilter = {};
    if (month && year) {
      const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
      const end = moment(start).endOf('month').toDate();
      dateFilter = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      dateFilter = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
      };
    }

    const companies = await Company.find().sort({ name: 1 });

    const companiesSummary = await Promise.all(
      companies.map(async company => {
        const [salesSum, purchasesSum, paymentsInSum, paymentsOutSum, creditNotesSum, debitNotesSum, interestNotesSum, processedCreditNotesSum, processedDebitNotesSum, paidInterestNotesSum] = await Promise.all([
          Bill.aggregate([
            { 
              $match: { 
                company: company._id,
                ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          Purchase.aggregate([
            { 
              $match: { 
                supplierCompany: company._id,
                ...(Object.keys(dateFilter).length > 0 && { purchaseBillDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]),
          Transaction.aggregate([
            { 
              $match: { 
                company: company._id,
                type: 'IN',
                ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]),
          Transaction.aggregate([
            { 
              $match: { 
                company: company._id,
                type: 'OUT',
                ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]),
          CreditNote.aggregate([
            { 
              $match: { 
                company: company._id,
                ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          DebitNote.aggregate([
            { 
              $match: { 
                supplierCompany: company._id,
                ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          InterestNote.aggregate([
            { 
              $match: { 
                company: company._id,
                ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          CreditNote.aggregate([
            { 
              $match: { 
                company: company._id,
                status: 'Processed',
                ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          DebitNote.aggregate([
            { 
              $match: { 
                supplierCompany: company._id,
                status: 'Processed',
                ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          InterestNote.aggregate([
            { 
              $match: { 
                company: company._id,
                status: 'Paid',
                ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter })
              } 
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ])
        ]);

        const totalSales = salesSum[0]?.total || 0;
        const totalPurchases = purchasesSum[0]?.total || 0;
        const totalPaymentsReceived = paymentsInSum[0]?.total || 0;
        const totalPaymentsMade = paymentsOutSum[0]?.total || 0;
        const totalCreditNotes = creditNotesSum[0]?.total || 0;
        const totalDebitNotes = debitNotesSum[0]?.total || 0;
        const totalInterestNotes = interestNotesSum[0]?.total || 0;
        const processedCreditNotes = processedCreditNotesSum[0]?.total || 0;
        const processedDebitNotes = processedDebitNotesSum[0]?.total || 0;
        const paidInterestNotes = paidInterestNotesSum[0]?.total || 0;

        const netBalance = (totalSales + totalPaymentsMade + processedDebitNotes) - (totalPurchases + totalPaymentsReceived + processedCreditNotes + paidInterestNotes);
        const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

        return {
          company: {
            _id: company._id,
            name: company.name,
            gstNumber: company.gstNumber
          },
          totals: {
            totalSales,
            totalPurchases,
            totalPaymentsReceived,
            totalPaymentsMade,
            totalCreditNotes,
            totalDebitNotes,
            totalInterestNotes,
            processedCreditNotes,
            processedDebitNotes,
            paidInterestNotes,
            netBalance: Math.abs(netBalance),
            balanceType
          }
        };
      })
    );

    const grandTotals = companiesSummary.reduce(
      (acc, curr) => {
        acc.totalSales += curr.totals.totalSales;
        acc.totalPurchases += curr.totals.totalPurchases;
        acc.totalPaymentsReceived += curr.totals.totalPaymentsReceived;
        acc.totalPaymentsMade += curr.totals.totalPaymentsMade;
        acc.totalCreditNotes += curr.totals.totalCreditNotes;
        acc.totalDebitNotes += curr.totals.totalDebitNotes;
        acc.totalInterestNotes += curr.totals.totalInterestNotes;
        acc.processedCreditNotes += curr.totals.processedCreditNotes || 0;
        acc.processedDebitNotes += curr.totals.processedDebitNotes || 0;
        acc.paidInterestNotes += curr.totals.paidInterestNotes || 0;
        
        const companyNet = (curr.totals.totalSales + curr.totals.totalPaymentsMade + (curr.totals.processedDebitNotes || 0)) - 
                          (curr.totals.totalPurchases + curr.totals.totalPaymentsReceived + (curr.totals.processedCreditNotes || 0) + (curr.totals.paidInterestNotes || 0));
        
        if (companyNet >= 0) {
          acc.totalReceivable += companyNet;
        } else {
          acc.totalPayable += Math.abs(companyNet);
        }
        
        return acc;
      },
      { 
        totalSales: 0, 
        totalPurchases: 0, 
        totalPaymentsReceived: 0, 
        totalPaymentsMade: 0,
        totalCreditNotes: 0,
        totalDebitNotes: 0,
        totalInterestNotes: 0,
        processedCreditNotes: 0,
        processedDebitNotes: 0,
        paidInterestNotes: 0,
        totalReceivable: 0,
        totalPayable: 0
      }
    );

    const response = {
      dateRange: {
        start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
        end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
      },
      companiesSummary,
      grandTotals
    };

    log(`Companies ledger summary generated`, 'info');
    res.json(response);

  } catch (error) {
    log(`Error generating companies ledger summary: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while generating companies ledger summary.' });
  }
};

// @desc    Download company ledger as Excel
// @route   GET /api/ledger/company/excel
// @access  Private/Admin
const downloadCompanyLedgerExcel = async (req, res) => {
  try {
    const { companyId, startDate, endDate, month, year } = req.query;
    
    const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year);
    
    if (!ledgerData || !ledgerData.ledgerEntries || ledgerData.ledgerEntries.length === 0) {
      return res.status(404).json({ message: 'No ledger data found for the given criteria' });
    }
    
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Company Ledger');
    
    worksheet.addRow([`Company: ${ledgerData.company.name}`]);
    if (ledgerData.company.gstNumber) {
      worksheet.addRow([`GST: ${ledgerData.company.gstNumber}`]);
    }
    worksheet.addRow([`Period: ${ledgerData.dateRange.start} to ${ledgerData.dateRange.end}`]);
    worksheet.addRow([]);
    
    const headers = companyId === 'all' 
      ? ['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit']
      : ['Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit'];
    
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    ledgerData.ledgerEntries.forEach(entry => {
      const rowData = companyId === 'all'
        ? [
            entry.companyName,
            moment(entry.date).format('DD/MM/YYYY'),
            entry.type,
            entry.docNo || '',
            entry.description || '',
            entry.debit ? Number(entry.debit).toFixed(2) : '',
            entry.credit ? Number(entry.credit).toFixed(2) : ''
          ]
        : [
            moment(entry.date).format('DD/MM/YYYY'),
            entry.type,
            entry.docNo || '',
            entry.description || '',
            entry.debit ? Number(entry.debit).toFixed(2) : '',
            entry.credit ? Number(entry.credit).toFixed(2) : ''
          ];
      
      const row = worksheet.addRow(rowData);
      
      if (entry.debit) {
        row.getCell(rowData.length - 2).numFmt = '#,##0.00';
        row.getCell(rowData.length - 2).font = { color: { argb: 'FF2E7D32' } };
      }
      if (entry.credit) {
        row.getCell(rowData.length - 1).numFmt = '#,##0.00';
        row.getCell(rowData.length - 1).font = { color: { argb: 'FFC62828' } };
      }
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
    
    worksheet.addRow([]);
    const summaryTitle = worksheet.addRow(['Summary']);
    summaryTitle.getCell(1).font = { bold: true };
    
    worksheet.addRow(['Total Sales:', ledgerData.summary.totalSales.toFixed(2)]);
    worksheet.addRow(['Total Purchases:', ledgerData.summary.totalPurchases.toFixed(2)]);
    worksheet.addRow(['Total Payments Received:', ledgerData.summary.totalPaymentsReceived.toFixed(2)]);
    worksheet.addRow(['Total Payments Made:', ledgerData.summary.totalPaymentsMade.toFixed(2)]);
    worksheet.addRow(['Total Credit Notes:', ledgerData.summary.totalCreditNotes.toFixed(2)]);
    worksheet.addRow(['Total Debit Notes:', ledgerData.summary.totalDebitNotes.toFixed(2)]);
    worksheet.addRow(['Total Interest Notes:', ledgerData.summary.totalInterestNotes.toFixed(2)]);
    
    const balanceRow = worksheet.addRow([
      'Net Balance:', 
      `${ledgerData.summary.netBalance.toFixed(2)} (${ledgerData.summary.balanceType})`
    ]);
    balanceRow.getCell(2).font = { bold: true };
    balanceRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: ledgerData.summary.balanceType === 'Receivable' ? 'FFC6EFCE' : 'FFFFC7CE' }
    };
    
    [2, 3, 4, 5, 6, 7, 8, 9].forEach(rowNum => {
      const row = worksheet.getRow(worksheet.rowCount - 9 + rowNum);
      if (row.getCell(2).value && typeof row.getCell(2).value === 'number') {
        row.getCell(2).numFmt = '#,##0.00';
      }
    });
    balanceRow.getCell(2).numFmt = '#,##0.00';
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${ledgerData.company.name.replace(/ /g, '_')}_Ledger_${moment().format('YYYYMMDD')}.xlsx`
    );
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    log(`Error generating Excel: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error generating Excel report', error: error.message });
  }
};

// @desc    Download company ledger as PDF
// @route   GET /api/ledger/company/pdf
// @access  Private/Admin
const downloadCompanyLedgerPDF = async (req, res) => {
  try {
    const { companyId = 'all', startDate, endDate, month, year } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both startDate and endDate are required' });
    }

    const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year);

    if (!ledgerData?.ledgerEntries?.length) {
      return res.status(404).json({ message: 'No ledger data found' });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    let pageCount = 1;

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const currencySymbol = 'RS.';
    const colors = {
      primary: rgb(0.13, 0.27, 0.47),
      secondary: rgb(0.2, 0.2, 0.2),
      success: rgb(0.1, 0.6, 0.1),
      danger: rgb(0.8, 0.1, 0.1),
      lightGray: rgb(0.95, 0.95, 0.95),
      border: rgb(0.7, 0.7, 0.7),
    };

    const margins = {
      top: 50,
      bottom: 50,
      left: 30,
      right: 30,
    };

    const fontSizes = {
      title: 16,
      subtitle: 10,
      tableHeader: 9,
      tableCell: 8,
      footer: 8,
      summaryTitle: 12,
      summaryLabel: 10,
    };

    const lineHeight = 14;
    const smallLineHeight = 10;
    const paragraphSpacing = 8;

    let y = page.getHeight() - margins.top;

    const drawHeader = () => {
      page.drawText(ledgerData.company.name, {
        x: margins.left,
        y,
        size: fontSizes.title,
        font: boldFont,
        color: colors.primary,
      });
      y -= lineHeight;

      if (ledgerData.company.gstNumber) {
        page.drawText(`GSTIN: ${ledgerData.company.gstNumber}`, {
          x: margins.left,
          y,
          size: fontSizes.subtitle,
          font: regularFont,
          color: colors.secondary,
        });
      }

      const periodText = `Period: ${moment(ledgerData.dateRange.start).format('DD/MM/YYYY')} - ${moment(ledgerData.dateRange.end).format('DD/MM/YYYY')}`;
      const periodWidth = regularFont.widthOfTextAtSize(periodText, fontSizes.subtitle);
      page.drawText(periodText, {
        x: page.getWidth() - margins.right - periodWidth,
        y,
        size: fontSizes.subtitle,
        font: regularFont,
        color: colors.secondary,
      });
      y -= lineHeight * 1.2;

      page.drawLine({
        start: { x: margins.left, y },
        end: { x: page.getWidth() - margins.right, y },
        thickness: 1,
        color: colors.primary,
      });
      y -= paragraphSpacing;
    };

    drawHeader();

    const columnDefinitions = companyId === 'all'
      ? [
          { header: 'Company', key: 'companyName', width: 70, align: 'left' },
          { header: 'Date', key: 'date', width: 55, align: 'left' },
          { header: 'Type', key: 'type', width: 55, align: 'left' },
          { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
          { header: 'Description', key: 'description', width: 120, align: 'left' },
          { header: 'Debit', key: 'debit', width: 60, align: 'right' },
          { header: 'Credit', key: 'credit', width: 60, align: 'right' },
        ]
      : [
          { header: 'Date', key: 'date', width: 55, align: 'left' },
          { header: 'Type', key: 'type', width: 55, align: 'left' },
          { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
          { header: 'Description', key: 'description', width: 175, align: 'left' },
          { header: 'Debit', key: 'debit', width: 65, align: 'right' },
          { header: 'Credit', key: 'credit', width: 65, align: 'right' },
        ];

    const tableWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);
    const tableX = (page.getWidth() - tableWidth) / 2;

    const drawTableHeader = () => {
      let x = tableX;
      columnDefinitions.forEach(column => {
        page.drawRectangle({
          x,
          y: y - lineHeight - 4,
          width: column.width,
          height: lineHeight + 4,
          borderWidth: 0.5,
          borderColor: colors.border,
          color: colors.lightGray,
        });

        page.drawText(column.header, {
          x: column.align === 'right' ? x + column.width - 4 - regularFont.widthOfTextAtSize(column.header, fontSizes.tableHeader) : x + 4,
          y: y - 8,
          size: fontSizes.tableHeader,
          font: boldFont,
          color: colors.primary,
        });

        x += column.width;
      });
      y -= lineHeight + 8;
    };

    drawTableHeader();

    const drawTableRow = (entry) => {
      const startY = y;
      let maxLines = 1;

      const linesNeeded = columnDefinitions.map((column) => {
        const text = getCellText(entry, column.key);
        if (!text) return 1;
        const availableWidth = column.width - 8;
        const words = text.split(' ');
        let line = '';
        let lines = 1;

        words.forEach((word) => {
          const testLine = line + word + ' ';
          const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
          if (testWidth > availableWidth) {
            lines++;
            line = word + ' ';
          } else {
            line = testLine;
          }
        });

        return lines;
      });

      maxLines = Math.max(...linesNeeded);
      const cellHeight = maxLines * smallLineHeight + 6;

      if (y - cellHeight < margins.bottom + 80) {
        page.drawText('Continued on next page...', {
          x: margins.left,
          y: margins.bottom + 20,
          size: fontSizes.footer,
          font: regularFont,
          color: colors.secondary,
        });
        pageCount += 1;
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - margins.top;
        drawHeader();
        drawTableHeader();
      }

      let x = tableX;
      columnDefinitions.forEach((column) => {
        page.drawRectangle({
          x,
          y: y - cellHeight,
          width: column.width,
          height: cellHeight,
          borderWidth: 0.5,
          borderColor: colors.border,
          color: rgb(1, 1, 1),
        });

        const text = getCellText(entry, column.key);
        const words = text.split(' ');
        let line = '';
        let textY = y - 10;

        words.forEach((word) => {
          const testLine = line + word + ' ';
          const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
          if (testWidth > column.width - 8) {
            page.drawText(line.trim(), {
              x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
              y: textY,
              size: fontSizes.tableCell,
              font: regularFont,
              color: 
                    column.key === 'credit' ? colors.danger : 
                    column.key === 'debit' ? colors.success :
                    colors.secondary,
            });
            textY -= smallLineHeight;
            line = word + ' ';
          } else {
            line = testLine;
          }
        });

        if (line.trim() !== '') {
          page.drawText(line.trim(), {
            x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
            y: textY,
            size: fontSizes.tableCell,
            font: regularFont,
            color:
                  column.key === 'credit' ? colors.danger : 
                  column.key === 'debit' ? colors.success :
                  colors.secondary,
          });
        }

        x += column.width;
      });

      y -= cellHeight + 2;
    };

    const getCellText = (entry, key) => {
      switch (key) {
        case 'date':
          return moment(entry.date).format('DD/MM/YYYY');
        case 'debit':
          return entry.debit != null && entry.debit !== '' ? `${currencySymbol}${parseFloat(entry.debit).toFixed(2)}` : '';
        case 'credit':
          return entry.credit != null && entry.credit !== '' ? `${currencySymbol}${parseFloat(entry.credit).toFixed(2)}` : '';
        case 'companyName':
          return entry.companyName || '';
        default:
          return entry[key] || '';
      }
    };

    ledgerData.ledgerEntries.forEach((entry) => {
      drawTableRow(entry);
    });

    const drawSummary = () => {
      y -= lineHeight * 1.5;

      const summaryHeight = 9 * lineHeight + 16;
      if (y - summaryHeight < margins.bottom + 60) {
        page.drawText('Continued on next page...', {
          x: margins.left,
          y: margins.bottom + 20,
          size: fontSizes.footer,
          font: regularFont,
          color: colors.secondary,
        });
        pageCount += 1;
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - margins.top;
        drawHeader();
      }

      page.drawText('Summary', {
        x: margins.left,
        y,
        size: fontSizes.summaryTitle,
        font: boldFont,
        color: colors.primary,
      });
      y -= lineHeight;

      const summaryItems = [
        { label: 'Total Sales:', value: `${currencySymbol}${(ledgerData.summary.totalSales || 0).toFixed(2)}` },
        { label: 'Total Purchases:', value: `${currencySymbol}${(ledgerData.summary.totalPurchases || 0).toFixed(2)}` },
        { label: 'Total Payments Received:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsReceived || 0).toFixed(2)}` },
        { label: 'Total Payments Made:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsMade || 0).toFixed(2)}` },
        { label: 'Total Credit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalCreditNotes || 0).toFixed(2)}` },
        { label: 'Total Debit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalDebitNotes || 0).toFixed(2)}` },
        { label: 'Total Interest Notes:', value: `${currencySymbol}${(ledgerData.summary.totalInterestNotes || 0).toFixed(2)}` },
      ];

      const maxLabelWidth = Math.max(...summaryItems.map((item) => boldFont.widthOfTextAtSize(item.label, fontSizes.summaryLabel)));
      const summaryWidth = maxLabelWidth + 150;

      page.drawRectangle({
        x: margins.left,
        y: y - summaryHeight + lineHeight,
        width: summaryWidth,
        height: summaryHeight - 2,
        borderWidth: 0.5,
        borderColor: colors.border,
        color: colors.lightGray,
      });

      summaryItems.forEach((item) => {
        page.drawText(item.label, {
          x: margins.left + 8,
          y: y - 8,
          size: fontSizes.summaryLabel,
          font: boldFont,
          color: colors.secondary,
        });
        page.drawText(item.value, {
          x: margins.left + maxLabelWidth + 16,
          y: y - 8,
          size: fontSizes.summaryLabel,
          font: regularFont,
          color: colors.secondary,
        });
        y -= lineHeight;
      });

      const netBalance = (ledgerData.summary.netBalance || 0).toFixed(2);
      const balanceType = ledgerData.summary.balanceType || 'N/A';
      const netBalanceText = `Net Balance: ${currencySymbol}${netBalance} (${balanceType})`;
      const balanceColor = balanceType === 'Receivable' ? colors.success : colors.danger;

      page.drawText(netBalanceText, {
        x: margins.left + 8,
        y: y - 8,
        size: fontSizes.summaryLabel,
        font: boldFont,
        color: balanceColor,
      });
      y -= lineHeight;
    };

    drawSummary();

    const drawFooter = () => {
      const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${pageCount} of ${pageCount}`;
      const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
      page.drawText(footerText, {
        x: (page.getWidth() - footerWidth) / 2,
        y: margins.bottom - 10,
        size: fontSizes.footer,
        font: regularFont,
        color: colors.secondary,
      });
    };

    drawFooter();

    const pages = pdfDoc.getPages();
    pageCount = pages.length;
    pages.forEach((p, index) => {
      const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${index + 1} of ${pageCount}`;
      const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
      p.drawText(footerText, {
        x: (p.getWidth() - footerWidth) / 2,
        y: margins.bottom - 10,
        size: fontSizes.footer,
        font: regularFont,
        color: colors.secondary,
      });
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${ledgerData.company.name.replace(/ /g, '_')}_Ledger_${moment().format('YYYYMMDD')}.pdf`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};

// @desc    Prepare company ledger data
// @access  Private
const prepareCompanyLedgerData = async (companyId, startDate, endDate, month, year) => {
  let dateFilter = {};
  if (month && year) {
    const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
    const end = moment(start).endOf('month').toDate();
    dateFilter = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    dateFilter = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  }

  if (companyId === 'all') {
    const companies = await Company.find();
    let allEntries = [];
    let totals = {
      totalSales: 0,
      totalPurchases: 0,
      totalPaymentsReceived: 0,
      totalPaymentsMade: 0,
      totalCreditNotes: 0,
      totalDebitNotes: 0,
      totalInterestNotes: 0,
      netBalance: 0
    };

    for (const company of companies) {
      const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
        Bill.find({
          company: company._id,
          ...(Object.keys(dateFilter).length && { billDate: dateFilter })
        }),
        Purchase.find({
          supplierCompany: company._id,
          ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
        }),
        Transaction.find({
          company: company._id,
          ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
        }),
        CreditNote.find({
          company: company._id,
          ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
        }),
        DebitNote.find({
          supplierCompany: company._id,
          ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
        }),
        InterestNote.find({
          company: company._id,
          ...(Object.keys(dateFilter).length && { interestNoteDate: dateFilter })
        }),
      ]);

      const companyEntries = [];
      
      bills.forEach(bill => {
        companyEntries.push({
          date: bill.billDate,
          type: 'Sale',
          docNo: bill.billNumber,
          description: `Bill to ${company.name}`,
          debit: bill.totalAmount,
          credit: null,
          companyName: company.name,
          referenceId: bill._id,
          referenceType: 'Bill'
        });
        totals.totalSales += bill.totalAmount;
      });

      purchases.forEach(purchase => {
        companyEntries.push({
          date: purchase.purchaseBillDate,
          type: 'Purchase',
          docNo: purchase.purchaseBillNumber,
          description: `Purchase from ${company.name}`,
          debit: null,
          credit: purchase.amount,
          companyName: company.name,
          referenceId: purchase._id,
          referenceType: 'Purchase'
        });
        totals.totalPurchases += purchase.amount;
      });

      transactions.forEach(tx => {
        if (tx.type === 'IN') {
          companyEntries.push({
            date: tx.paymentDate,
            type: 'Payment Received',
            docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
            description: tx.description || 'Received',
            debit: null,
            credit: tx.amount,
            companyName: company.name,
            referenceId: tx._id,
            referenceType: 'Transaction'
          });
          totals.totalPaymentsReceived += tx.amount;
        } else {
          companyEntries.push({
            date: tx.paymentDate,
            type: 'Payment Made',
            docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
            description: tx.description || 'Paid',
            debit: tx.amount,
            credit: null,
            companyName: company.name,
            referenceId: tx._id,
            referenceType: 'Transaction'
          });
          totals.totalPaymentsMade += tx.amount;
        }
      });

      creditNotes.forEach(note => {
        const isProcessed = note.status === 'Processed';
        companyEntries.push({
          date: note.creditNoteDate,
          type: 'Credit Note',
          docNo: note.creditNoteNumber,
          description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
          debit: isProcessed ? note.totalAmount : null,
          credit: isProcessed ? note.totalAmount : null,
          amount: note.totalAmount,
          status: note.status,
          companyName: company.name,
          referenceId: note._id,
          referenceType: 'CreditNote'
        });
        totals.totalCreditNotes += note.totalAmount;
      });

      debitNotes.forEach(note => {
        const isProcessed = note.status === 'Processed';
        companyEntries.push({
          date: note.debitNoteDate,
          type: 'Debit Note',
          docNo: note.debitNoteNumber,
          description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
          debit: isProcessed ? note.totalAmount : null,
          credit: isProcessed ? note.totalAmount : null,
          amount: note.totalAmount,
          status: note.status,
          companyName: company.name,
          referenceId: note._id,
          referenceType: 'DebitNote'
        });
        totals.totalDebitNotes += note.totalAmount;
      });

      interestNotes.forEach(note => {
        const isPaid = note.status === 'Paid';
        companyEntries.push({
          date: note.interestNoteDate,
          type: 'Interest Note',
          docNo: note.interestNoteNumber,
          description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
          debit: isPaid ? note.totalAmount : null,
          credit: isPaid ? note.totalAmount : null,
          amount: note.totalAmount,
          status: note.status,
          companyName: company.name,
          referenceId: note._id,
          referenceType: 'InterestNote'
        });
        totals.totalInterestNotes += note.totalAmount;
      });

      allEntries = [...allEntries, ...companyEntries];
    }

    allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const netBalance = (totals.totalSales + totals.totalPaymentsMade + totals.totalDebitNotes) - (totals.totalPurchases + totals.totalPaymentsReceived + totals.totalCreditNotes + totals.totalInterestNotes);
    const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

    return {
      company: {
        _id: 'all',
        name: 'All Companies',
        gstNumber: ''
      },
      dateRange: {
        start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
        end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
      },
      ledgerEntries: allEntries,
      summary: {
        ...totals,
        netBalance: Math.abs(netBalance),
        balanceType
      }
    };
  }

  if (!companyId) {
    throw new Error('Company ID is required');
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
    Bill.find({
      company: companyId,
      ...(Object.keys(dateFilter).length && { billDate: dateFilter })
    }).sort({ billDate: 1 }),
    
    Purchase.find({
      supplierCompany: companyId,
      ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
    }).sort({ purchaseBillDate: 1 }),

    Transaction.find({
      company: companyId,
      ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
    }).sort({ paymentDate: 1 }),

    CreditNote.find({
      company: companyId,
      ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
    }).sort({ creditNoteDate: 1 }),

    DebitNote.find({
      supplierCompany: companyId,
      ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
    }).sort({ debitNoteDate: 1 }),

    InterestNote.find({
      company: companyId,
      ...(Object.keys(dateFilter).length && { interestNoteDate: dateFilter })
    }).sort({ interestNoteDate: 1 }),
  ]);

  const ledgerEntries = [];

  bills.forEach(bill => {
    ledgerEntries.push({
      date: bill.billDate,
      type: 'Sale',
      docNo: bill.billNumber,
      description: `Bill to ${company.name}`,
      debit: bill.totalAmount,
      credit: null,
      referenceId: bill._id,
      referenceType: 'Bill'
    });
  });

  purchases.forEach(purchase => {
    ledgerEntries.push({
      date: purchase.purchaseBillDate,
      type: 'Purchase',
      docNo: purchase.purchaseBillNumber,
      description: `Purchase from ${company.name}`,
      debit: null,
      credit: purchase.amount,
      referenceId: purchase._id,
      referenceType: 'Purchase'
    });
  });

  transactions.forEach(tx => {
    if (tx.type === 'IN') {
      ledgerEntries.push({
        date: tx.paymentDate,
        type: 'Payment Received',
        docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
        description: tx.description || 'Received',
        debit: null,
        credit: tx.amount,
        referenceId: tx._id,
        referenceType: 'Transaction'
      });
    } else {
      ledgerEntries.push({
        date: tx.paymentDate,
        type: 'Payment Made',
        docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
        description: tx.description || 'Paid',
        debit: tx.amount,
        credit: null,
        referenceId: tx._id,
        referenceType: 'Transaction'
      });
    }
  });

  creditNotes.forEach(note => {
    ledgerEntries.push({
      date: note.creditNoteDate,
      type: 'Credit Note',
      docNo: note.creditNoteNumber,
      description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
      debit: null,
      credit: note.totalAmount,
      referenceId: note._id,
      referenceType: 'CreditNote'
    });
  });

  debitNotes.forEach(note => {
    ledgerEntries.push({
      date: note.debitNoteDate,
      type: 'Debit Note',
      docNo: note.debitNoteNumber,
      description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
      debit: note.totalAmount,
      credit: null,
      referenceId: note._id,
      referenceType: 'DebitNote'
    });
  });

  interestNotes.forEach(note => {
    ledgerEntries.push({
      date: note.interestNoteDate,
      type: 'Interest Note',
      docNo: note.interestNoteNumber,
      description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
      debit: null,
      credit: note.totalAmount,
      referenceId: note._id,
      referenceType: 'InterestNote'
    });
  });

  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalSales = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsReceived = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalPaymentsMade = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  const totalCreditNotes = creditNotes.reduce((sum, n) => sum + n.totalAmount, 0);
  const totalDebitNotes = debitNotes.reduce((sum, n) => sum + n.totalAmount, 0);
  const totalInterestNotes = interestNotes.reduce((sum, n) => sum + n.totalAmount, 0);

  const netBalance = (totalSales + totalPaymentsMade + totalDebitNotes) - (totalPurchases + totalPaymentsReceived + totalCreditNotes + totalInterestNotes);
  const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

  return {
    company: {
      _id: company._id,
      name: company.name,
      gstNumber: company.gstNumber
    },
    dateRange: {
      start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
      end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
    },
    ledgerEntries,
    summary: {
      totalSales,
      totalPurchases,
      totalPaymentsReceived,
      totalPaymentsMade,
      totalCreditNotes,
      totalDebitNotes,
      totalInterestNotes,
      netBalance: Math.abs(netBalance),
      balanceType
    }
  };
};

module.exports = {
  getCompanyLedger,
  getCompaniesLedgerSummary,
  downloadCompanyLedgerExcel,
  downloadCompanyLedgerPDF
};
