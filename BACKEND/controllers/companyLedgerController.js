// const Bill = require('../models/Bill');
// const Purchase = require('../models/Purchase');
// const Transaction = require('../models/Transaction');
// const Company = require('../models/Company');
// const CreditNote = require('../models/CreditNote');
// const DebitNote = require('../models/DebitNote');
// const InterestNote = require('../models/InterestNote');
// const { log } = require('../middleware/logger');
// const moment = require('moment');
// const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
// const exceljs = require('exceljs');
// const mongoose = require('mongoose');

// const { getOrgDetails } = require('../utils/orgDetails');

// // @desc    Get company ledger with filters
// // @route   GET /api/ledger/company
// // @access  Private/Admin
// const getCompanyLedger = async (req, res) => {
//   const { companyId, startDate, endDate, month, year } = req.query;

//   if (!companyId) {
//     return res.status(400).json({ message: 'Company ID is required.' });
//   }

//   try {
//     const company = await Company.findById(companyId);
//     if (!company) {
//       log(`Company ledger failed: Company not found - ID: ${companyId}`, 'warn');
//       return res.status(404).json({ message: 'Company not found.' });
//     }

//     let dateFilter = {};
//     if (month && year) {
//       const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
//       const end = moment(start).endOf('month').toDate();
//       dateFilter = { $gte: start, $lte: end };
//     } else if (startDate && endDate) {
//       dateFilter = { 
//         $gte: new Date(startDate), 
//         $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
//       };
//     } else if (startDate) {
//       dateFilter = { $gte: new Date(startDate) };
//     } else if (endDate) {
//       dateFilter = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//     }

//     const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
//       Bill.find({
//         company: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter })
//       }).sort({ billDate: 1 }),
      
//       Purchase.find({
//         supplierCompany: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { purchaseBillDate: dateFilter })
//       }).sort({ purchaseBillDate: 1 }),
      
//       Transaction.find({
//         company: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter })
//       }).sort({ paymentDate: 1 }),

//       CreditNote.find({
//         company: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter })
//       }).sort({ creditNoteDate: 1 }),

//       DebitNote.find({
//         supplierCompany: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter })
//       }).sort({ debitNoteDate: 1 }),

//       InterestNote.find({
//         company: companyId,
//         organizationId: req.organizationId,
//         ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter })
//       }).sort({ interestNoteDate: 1 }),
//     ]);

//     const ledgerEntries = [];
    
//     bills.forEach(bill => {
//       ledgerEntries.push({
//         date: bill.billDate,
//         type: 'Sale',
//         docNo: bill.billNumber,
//         description: `Bill to ${company.name}`,
//         debit: bill.totalAmount,
//         credit: null,
//         amount: bill.totalAmount,
//         referenceId: bill._id,
//         referenceType: 'Bill'
//       });
//     });

//     purchases.forEach(purchase => {
//       ledgerEntries.push({
//         date: purchase.purchaseBillDate,
//         type: 'Purchase',
//         docNo: purchase.purchaseBillNumber,
//         description: `Purchase from ${company.name}`,
//         debit: null,
//         credit: purchase.amount,
//         amount: purchase.amount,
//         referenceId: purchase._id,
//         referenceType: 'Purchase'
//       });
//     });

//     transactions.forEach(transaction => {
//       if (transaction.type === 'IN') {
//         ledgerEntries.push({
//           date: transaction.paymentDate,
//           type: 'Payment Received',
//           docNo: transaction.referenceNumber || `TR-${transaction._id.toString().slice(-6)}`,
//           description: transaction.description,
//           debit: null,
//           credit: transaction.amount,
//           amount: transaction.amount,
//           referenceId: transaction._id,
//           referenceType: 'Transaction'
//         });
//       } else if (transaction.type === 'OUT') {
//         ledgerEntries.push({
//           date: transaction.paymentDate,
//           type: 'Payment Made',
//           docNo: transaction.referenceNumber || `TR-${transaction._id.toString().slice(-6)}`,
//           description: transaction.description,
//           debit: transaction.amount,
//           credit: null,
//           amount: transaction.amount,
//           referenceId: transaction._id,
//           referenceType: 'Transaction'
//         });
//       }
//     });

//     creditNotes.forEach(note => {
//       const isProcessed = note.status === 'Processed';
//       ledgerEntries.push({
//         date: note.creditNoteDate,
//         type: 'Credit Note',
//         docNo: note.creditNoteNumber,
//         description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
//         debit: null,
//         credit: isProcessed ? note.totalAmount : null,
//         amount: note.totalAmount,
//         status: note.status,
//         referenceId: note._id,
//         referenceType: 'CreditNote'
//       });
//     });

//     debitNotes.forEach(note => {
//       const isProcessed = note.status === 'Processed';
//       ledgerEntries.push({
//         date: note.debitNoteDate,
//         type: 'Debit Note',
//         docNo: note.debitNoteNumber,
//         description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
//         debit: isProcessed ? note.totalAmount : null,
//         credit: null,
//         amount: note.totalAmount,
//         status: note.status,
//         referenceId: note._id,
//         referenceType: 'DebitNote'
//       });
//     });

//     interestNotes.forEach(note => {
//       const isPaid = note.status === 'Paid';
//       ledgerEntries.push({
//         date: note.interestNoteDate,
//         type: 'Interest Note',
//         docNo: note.interestNoteNumber,
//         description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
//         debit: null,
//         credit: isPaid ? note.totalAmount : null,
//         amount: note.totalAmount,
//         status: note.status,
//         referenceId: note._id,
//         referenceType: 'InterestNote'
//       });
//     });

//     ledgerEntries.sort((a, b) => a.date - b.date);

//     const totalSales = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
//     const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    
//     const totalPaymentsReceived = transactions
//       .filter(t => t.type === 'IN')
//       .reduce((sum, t) => sum + t.amount, 0);
      
//     const totalPaymentsMade = transactions
//       .filter(t => t.type === 'OUT')
//       .reduce((sum, t) => sum + t.amount, 0);

//     const totalCreditNotes = creditNotes.reduce((sum, note) => sum + note.totalAmount, 0);
//     const totalDebitNotes = debitNotes.reduce((sum, note) => sum + note.totalAmount, 0);
//     const totalInterestNotes = interestNotes.reduce((sum, note) => sum + note.totalAmount, 0);

//     const processedCreditNotes = creditNotes
//       .filter(n => n.status === 'Processed')
//       .reduce((sum, note) => sum + note.totalAmount, 0);
//     const processedDebitNotes = debitNotes
//       .filter(n => n.status === 'Processed')
//       .reduce((sum, note) => sum + note.totalAmount, 0);
//     const paidInterestNotes = interestNotes
//       .filter(n => n.status === 'Paid')
//       .reduce((sum, note) => sum + note.totalAmount, 0);

//     const adjustedSales = totalSales - totalCreditNotes + totalInterestNotes;
//     const adjustedPurchases = totalPurchases - totalDebitNotes;

//     const netBalance = (adjustedSales - totalPaymentsReceived) - (adjustedPurchases - totalPaymentsMade);
//     const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

//     const response = {
//       company: {
//         _id: company._id,
//         name: company.name,
//         gstNumber: company.gstNumber
//       },
//       dateRange: {
//         start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
//         end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
//       },
//       ledgerEntries,
//       summary: {
//         totalSales,
//         totalPurchases,
//         totalPaymentsReceived,
//         totalPaymentsMade,
//         totalCreditNotes,
//         totalDebitNotes,
//         totalInterestNotes,
//         processedCreditNotes,
//         processedDebitNotes,
//         paidInterestNotes,
//         adjustedSales,
//         adjustedPurchases,
//         netBalance: Math.abs(netBalance),
//         balanceType
//       }
//     };

//     res.json(response);

//   } catch (error) {
//     log(`Error generating company ledger: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while generating company ledger.' });
//   }
// };

// // @desc    Get all companies ledger summary
// // @route   GET /api/ledger/companies-summary
// // @access  Private/Admin
// const getCompaniesLedgerSummary = async (req, res) => {
//   console.log('=== getCompaniesLedgerSummary CALLED ===');
//   console.log('req.organizationId:', req.organizationId);
//   console.log('req.user:', req.user ? req.user.email : 'none');
//   console.log('req.query:', req.query);
//   const { startDate, endDate, month, year } = req.query;

//   try {
//     let dateFilter = {};
//     if (month && year) {
//       const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
//       const end = moment(start).endOf('month').toDate();
//       dateFilter = { $gte: start, $lte: end };
//     } else if (startDate && endDate) {
//       dateFilter = { 
//         $gte: new Date(startDate), 
//         $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
//       };
//     }

//     const companies = await Company.find({ organizationId: req.organizationId }).sort({ name: 1 });
//     console.log('[LEDGER] orgId:', req.organizationId, '| companies:', companies.length);
//     if (companies.length > 0) {
//       console.log('[LEDGER] First company:', companies[0]._id, companies[0].name);
//     }

//     const companiesSummary = await Promise.all(
//       companies.map(async company => {
//         console.log('[LEDGER] Processing company:', company._id, company.name);

//         const companyId = new mongoose.Types.ObjectId(company._id);
//         console.log('[LEDGER] companyId for aggregate:', companyId, 'type:', typeof companyId);

//         const purchasesSum = await Purchase.aggregate([
//           { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId } },
//           { $group: { _id: null, total: { $sum: "$amount" } } }
//         ]);
//         console.log('[LEDGER] purchasesSum:', purchasesSum);

//         const [salesSum, paymentsInSum, paymentsOutSum, creditNotesSum, debitNotesSum, interestNotesSum, processedCreditNotesSum, processedDebitNotesSum, paidInterestNotesSum] = await Promise.all([
//           Bill.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           Transaction.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, type: 'IN', ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$amount" } } }
//           ]),
//           Transaction.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, type: 'OUT', ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$amount" } } }
//           ]),
//           CreditNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           DebitNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId, ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           InterestNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           CreditNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, status: 'Processed', ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           DebitNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId, status: 'Processed', ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ]),
//           InterestNote.aggregate([
//             { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, status: 'Paid', ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter }) } },
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//           ])
//         ]);

//         const totalSales = salesSum[0]?.total || 0;
//         const totalPurchases = purchasesSum[0]?.total || 0;
//         const totalPaymentsReceived = paymentsInSum[0]?.total || 0;
//         const totalPaymentsMade = paymentsOutSum[0]?.total || 0;
//         const totalCreditNotes = creditNotesSum[0]?.total || 0;
//         const totalDebitNotes = debitNotesSum[0]?.total || 0;
//         const totalInterestNotes = interestNotesSum[0]?.total || 0;
//         const processedCreditNotes = processedCreditNotesSum[0]?.total || 0;
//         const processedDebitNotes = processedDebitNotesSum[0]?.total || 0;
//         const paidInterestNotes = paidInterestNotesSum[0]?.total || 0;

//         const adjustedSales = totalSales - totalCreditNotes + totalInterestNotes;
//         const adjustedPurchases = totalPurchases - totalDebitNotes;

//         const netBalance = (adjustedSales - totalPaymentsReceived) - (adjustedPurchases - totalPaymentsMade);
//         const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

//         return {
//           company: {
//             _id: company._id,
//             name: company.name,
//             gstNumber: company.gstNumber
//           },
//           totals: {
//             totalSales,
//             totalPurchases,
//             totalPaymentsReceived,
//             totalPaymentsMade,
//             totalCreditNotes,
//             totalDebitNotes,
//             totalInterestNotes,
//             processedCreditNotes,
//             processedDebitNotes,
//             paidInterestNotes,
//             adjustedSales,
//             adjustedPurchases,
//             netBalance: Math.abs(netBalance),
//             balanceType
//           }
//         };
//       })
//     );

//     const grandTotals = companiesSummary.reduce(
//       (acc, curr) => {
//         acc.totalSales += curr.totals.totalSales;
//         acc.totalPurchases += curr.totals.totalPurchases;
//         acc.totalPaymentsReceived += curr.totals.totalPaymentsReceived;
//         acc.totalPaymentsMade += curr.totals.totalPaymentsMade;
//         acc.totalCreditNotes += curr.totals.totalCreditNotes;
//         acc.totalDebitNotes += curr.totals.totalDebitNotes;
//         acc.totalInterestNotes += curr.totals.totalInterestNotes;
//         acc.processedCreditNotes += curr.totals.processedCreditNotes || 0;
//         acc.processedDebitNotes += curr.totals.processedDebitNotes || 0;
//         acc.paidInterestNotes += curr.totals.paidInterestNotes || 0;
//         acc.adjustedSales += curr.totals.adjustedSales || 0;
//         acc.adjustedPurchases += curr.totals.adjustedPurchases || 0;
        
//         const companyNet = (curr.totals.adjustedSales - curr.totals.totalPaymentsReceived) - 
//                           (curr.totals.adjustedPurchases - curr.totals.totalPaymentsMade);
        
//         if (companyNet >= 0) {
//           acc.totalReceivable += companyNet;
//         } else {
//           acc.totalPayable += Math.abs(companyNet);
//         }
        
//         return acc;
//       },
//       { 
//         totalSales: 0, 
//         totalPurchases: 0, 
//         totalPaymentsReceived: 0, 
//         totalPaymentsMade: 0,
//         totalCreditNotes: 0,
//         totalDebitNotes: 0,
//         totalInterestNotes: 0,
//         processedCreditNotes: 0,
//         processedDebitNotes: 0,
//         paidInterestNotes: 0,
//         adjustedSales: 0,
//         adjustedPurchases: 0,
//         totalReceivable: 0,
//         totalPayable: 0
//       }
//     );

//     const response = {
//       dateRange: {
//         start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
//         end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
//       },
//       companiesSummary,
//       grandTotals
//     };

//     log(`Companies ledger summary generated`, 'info');
//     res.json(response);

//   } catch (error) {
//     log(`Error generating companies ledger summary: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while generating companies ledger summary.' });
//   }
// };

// // @desc    Download company ledger as Excel
// // @route   GET /api/ledger/company/excel
// // @access  Private/Admin
// const downloadCompanyLedgerExcel = async (req, res) => {
//   try {
//     const { companyId, startDate, endDate, month, year, type } = req.query;
    
//     const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year, type, organizationId);
    
//     if (!ledgerData || !ledgerData.ledgerEntries || ledgerData.ledgerEntries.length === 0) {
//       return res.status(404).json({ message: 'No ledger data found for the given criteria' });
//     }
    
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Company Ledger');
    
//     worksheet.addRow([`Company: ${ledgerData.company.name}`]);
//     if (ledgerData.company.gstNumber) {
//       worksheet.addRow([`GST: ${ledgerData.company.gstNumber}`]);
//     }
//     worksheet.addRow([`Period: ${ledgerData.dateRange.start} to ${ledgerData.dateRange.end}`]);
//     worksheet.addRow([]);
    
//     const headers = companyId === 'all' 
//       ? ['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit']
//       : ['Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit'];
    
//     const headerRow = worksheet.addRow(headers);
    
//     headerRow.eachCell((cell) => {
//       cell.font = { bold: true };
//       cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFD3D3D3' }
//       };
//       cell.border = {
//         top: { style: 'thin' },
//         left: { style: 'thin' },
//         bottom: { style: 'thin' },
//         right: { style: 'thin' }
//       };
//     });
    
//     ledgerData.ledgerEntries.forEach(entry => {
//       const rowData = companyId === 'all'
//         ? [
//             entry.companyName,
//             moment(entry.date).format('DD/MM/YYYY'),
//             entry.type,
//             entry.docNo || '',
//             entry.description || '',
//             entry.debit ? Number(entry.debit).toFixed(2) : '',
//             entry.credit ? Number(entry.credit).toFixed(2) : ''
//           ]
//         : [
//             moment(entry.date).format('DD/MM/YYYY'),
//             entry.type,
//             entry.docNo || '',
//             entry.description || '',
//             entry.debit ? Number(entry.debit).toFixed(2) : '',
//             entry.credit ? Number(entry.credit).toFixed(2) : ''
//           ];
      
//       const row = worksheet.addRow(rowData);
      
//       if (entry.debit) {
//         row.getCell(rowData.length - 2).numFmt = '#,##0.00';
//         row.getCell(rowData.length - 2).font = { color: { argb: 'FF2E7D32' } };
//       }
//       if (entry.credit) {
//         row.getCell(rowData.length - 1).numFmt = '#,##0.00';
//         row.getCell(rowData.length - 1).font = { color: { argb: 'FFC62828' } };
//       }
      
//       row.eachCell((cell) => {
//         cell.border = {
//           top: { style: 'thin' },
//           left: { style: 'thin' },
//           bottom: { style: 'thin' },
//           right: { style: 'thin' }
//         };
//       });
//     });
    
//     worksheet.columns.forEach(column => {
//       let maxLength = 0;
//       column.eachCell({ includeEmpty: true }, cell => {
//         const columnLength = cell.value ? cell.value.toString().length : 0;
//         if (columnLength > maxLength) {
//           maxLength = columnLength;
//         }
//       });
//       column.width = maxLength < 10 ? 10 : maxLength + 2;
//     });
    
//     worksheet.addRow([]);
//     const summaryTitle = worksheet.addRow(['Summary']);
//     summaryTitle.getCell(1).font = { bold: true };
    
//     worksheet.addRow(['Total Sales:', ledgerData.summary.totalSales.toFixed(2)]);
//     worksheet.addRow(['Total Purchases:', ledgerData.summary.totalPurchases.toFixed(2)]);
//     worksheet.addRow(['Total Payments Received:', ledgerData.summary.totalPaymentsReceived.toFixed(2)]);
//     worksheet.addRow(['Total Payments Made:', ledgerData.summary.totalPaymentsMade.toFixed(2)]);
//     worksheet.addRow(['Total Credit Notes:', ledgerData.summary.totalCreditNotes.toFixed(2)]);
//     worksheet.addRow(['Total Debit Notes:', ledgerData.summary.totalDebitNotes.toFixed(2)]);
//     worksheet.addRow(['Total Interest Notes:', ledgerData.summary.totalInterestNotes.toFixed(2)]);
    
//     const balanceRow = worksheet.addRow([
//       'Net Balance:', 
//       `${ledgerData.summary.netBalance.toFixed(2)} (${ledgerData.summary.balanceType})`
//     ]);
//     balanceRow.getCell(2).font = { bold: true };
//     balanceRow.getCell(2).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: ledgerData.summary.balanceType === 'Receivable' ? 'FFC6EFCE' : 'FFFFC7CE' }
//     };
    
//     [2, 3, 4, 5, 6, 7, 8, 9].forEach(rowNum => {
//       const row = worksheet.getRow(worksheet.rowCount - 9 + rowNum);
//       if (row.getCell(2).value && typeof row.getCell(2).value === 'number') {
//         row.getCell(2).numFmt = '#,##0.00';
//       }
//     });
//     balanceRow.getCell(2).numFmt = '#,##0.00';
    
//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     );
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=${ledgerData.company.name.replace(/ /g, '_')}_Ledger_${moment().format('YYYYMMDD')}.xlsx`
//     );
    
//     await workbook.xlsx.write(res);
//     res.end();
    
//   } catch (error) {
//     log(`Error generating Excel: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Error generating Excel report', error: error.message });
//   }
// };

// // @desc    Download company ledger as PDF
// // @route   GET /api/ledger/company/pdf
// // @access  Private/Admin
// // const downloadCompanyLedgerPDF = async (req, res) => {
// //   try {
// //     const { companyId = 'all', startDate, endDate, month, year, type } = req.query;

// //     if (!startDate || !endDate) {
// //       return res.status(400).json({ message: 'Both startDate and endDate are required' });
// //     }

// //     const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year, type, organizationId);

// //     if (!ledgerData?.ledgerEntries?.length) {
// //       return res.status(404).json({ message: 'No ledger data found' });
// //     }

// //     const pdfDoc = await PDFDocument.create();
// //     let page = pdfDoc.addPage([595, 842]);
// //     let pageCount = 1;

// //     const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
// //     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

// //     const currencySymbol = 'RS.';
// //     const colors = {
// //       primary: rgb(0.13, 0.27, 0.47),
// //       secondary: rgb(0.2, 0.2, 0.2),
// //       success: rgb(0.1, 0.6, 0.1),
// //       danger: rgb(0.8, 0.1, 0.1),
// //       lightGray: rgb(0.95, 0.95, 0.95),
// //       border: rgb(0.7, 0.7, 0.7),
// //     };

// //     const margins = {
// //       top: 50,
// //       bottom: 50,
// //       left: 30,
// //       right: 30,
// //     };

// //     const fontSizes = {
// //       title: 16,
// //       subtitle: 10,
// //       tableHeader: 9,
// //       tableCell: 8,
// //       footer: 8,
// //       summaryTitle: 12,
// //       summaryLabel: 10,
// //     };

// //     const lineHeight = 14;
// //     const smallLineHeight = 10;
// //     const paragraphSpacing = 8;

// //     let y = page.getHeight() - margins.top;

// //     const drawHeader = () => {
// //       page.drawText(ledgerData.company.name, {
// //         x: margins.left,
// //         y,
// //         size: fontSizes.title,
// //         font: boldFont,
// //         color: colors.primary,
// //       });
// //       y -= lineHeight;

// //       if (ledgerData.company.gstNumber) {
// //         page.drawText(`GSTIN: ${ledgerData.company.gstNumber}`, {
// //           x: margins.left,
// //           y,
// //           size: fontSizes.subtitle,
// //           font: regularFont,
// //           color: colors.secondary,
// //         });
// //       }

// //       const periodText = `Period: ${moment(ledgerData.dateRange.start).format('DD/MM/YYYY')} - ${moment(ledgerData.dateRange.end).format('DD/MM/YYYY')}`;
// //       const periodWidth = regularFont.widthOfTextAtSize(periodText, fontSizes.subtitle);
// //       page.drawText(periodText, {
// //         x: page.getWidth() - margins.right - periodWidth,
// //         y,
// //         size: fontSizes.subtitle,
// //         font: regularFont,
// //         color: colors.secondary,
// //       });
// //       y -= lineHeight * 1.2;

// //       page.drawLine({
// //         start: { x: margins.left, y },
// //         end: { x: page.getWidth() - margins.right, y },
// //         thickness: 1,
// //         color: colors.primary,
// //       });
// //       y -= paragraphSpacing;
// //     };

// //     drawHeader();

// //     const columnDefinitions = companyId === 'all'
// //       ? [
// //           { header: 'Company', key: 'companyName', width: 70, align: 'left' },
// //           { header: 'Date', key: 'date', width: 55, align: 'left' },
// //           { header: 'Type', key: 'type', width: 55, align: 'left' },
// //           { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
// //           { header: 'Description', key: 'description', width: 120, align: 'left' },
// //           { header: 'Debit', key: 'debit', width: 60, align: 'right' },
// //           { header: 'Credit', key: 'credit', width: 60, align: 'right' },
// //         ]
// //       : [
// //           { header: 'Date', key: 'date', width: 55, align: 'left' },
// //           { header: 'Type', key: 'type', width: 55, align: 'left' },
// //           { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
// //           { header: 'Description', key: 'description', width: 175, align: 'left' },
// //           { header: 'Debit', key: 'debit', width: 65, align: 'right' },
// //           { header: 'Credit', key: 'credit', width: 65, align: 'right' },
// //         ];

// //     const tableWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);
// //     const tableX = (page.getWidth() - tableWidth) / 2;

// //     const drawTableHeader = () => {
// //       let x = tableX;
// //       columnDefinitions.forEach(column => {
// //         page.drawRectangle({
// //           x,
// //           y: y - lineHeight - 4,
// //           width: column.width,
// //           height: lineHeight + 4,
// //           borderWidth: 0.5,
// //           borderColor: colors.border,
// //           color: colors.lightGray,
// //         });

// //         page.drawText(column.header, {
// //           x: column.align === 'right' ? x + column.width - 4 - regularFont.widthOfTextAtSize(column.header, fontSizes.tableHeader) : x + 4,
// //           y: y - 8,
// //           size: fontSizes.tableHeader,
// //           font: boldFont,
// //           color: colors.primary,
// //         });

// //         x += column.width;
// //       });
// //       y -= lineHeight + 8;
// //     };

// //     drawTableHeader();

// //     const drawTableRow = (entry) => {
// //       const startY = y;
// //       let maxLines = 1;

// //       const linesNeeded = columnDefinitions.map((column) => {
// //         const text = getCellText(entry, column.key);
// //         if (!text) return 1;
// //         const availableWidth = column.width - 8;
// //         const words = text.split(' ');
// //         let line = '';
// //         let lines = 1;

// //         words.forEach((word) => {
// //           const testLine = line + word + ' ';
// //           const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
// //           if (testWidth > availableWidth) {
// //             lines++;
// //             line = word + ' ';
// //           } else {
// //             line = testLine;
// //           }
// //         });

// //         return lines;
// //       });

// //       maxLines = Math.max(...linesNeeded);
// //       const cellHeight = maxLines * smallLineHeight + 6;

// //       if (y - cellHeight < margins.bottom + 80) {
// //         page.drawText('Continued on next page...', {
// //           x: margins.left,
// //           y: margins.bottom + 20,
// //           size: fontSizes.footer,
// //           font: regularFont,
// //           color: colors.secondary,
// //         });
// //         pageCount += 1;
// //         page = pdfDoc.addPage([595, 842]);
// //         y = page.getHeight() - margins.top;
// //         drawHeader();
// //         drawTableHeader();
// //       }

// //       let x = tableX;
// //       columnDefinitions.forEach((column) => {
// //         page.drawRectangle({
// //           x,
// //           y: y - cellHeight,
// //           width: column.width,
// //           height: cellHeight,
// //           borderWidth: 0.5,
// //           borderColor: colors.border,
// //           color: rgb(1, 1, 1),
// //         });

// //         const text = getCellText(entry, column.key);
// //         const words = text.split(' ');
// //         let line = '';
// //         let textY = y - 10;

// //         words.forEach((word) => {
// //           const testLine = line + word + ' ';
// //           const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
// //           if (testWidth > column.width - 8) {
// //             page.drawText(line.trim(), {
// //               x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
// //               y: textY,
// //               size: fontSizes.tableCell,
// //               font: regularFont,
// //               color: 
// //                     column.key === 'credit' ? colors.danger : 
// //                     column.key === 'debit' ? colors.success :
// //                     colors.secondary,
// //             });
// //             textY -= smallLineHeight;
// //             line = word + ' ';
// //           } else {
// //             line = testLine;
// //           }
// //         });

// //         if (line.trim() !== '') {
// //           page.drawText(line.trim(), {
// //             x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
// //             y: textY,
// //             size: fontSizes.tableCell,
// //             font: regularFont,
// //             color:
// //                   column.key === 'credit' ? colors.danger : 
// //                   column.key === 'debit' ? colors.success :
// //                   colors.secondary,
// //           });
// //         }

// //         x += column.width;
// //       });

// //       y -= cellHeight + 2;
// //     };

// //     const getCellText = (entry, key) => {
// //       switch (key) {
// //         case 'date':
// //           return moment(entry.date).format('DD/MM/YYYY');
// //         case 'debit':
// //           return entry.debit != null && entry.debit !== '' ? `${currencySymbol}${parseFloat(entry.debit).toFixed(2)}` : '';
// //         case 'credit':
// //           return entry.credit != null && entry.credit !== '' ? `${currencySymbol}${parseFloat(entry.credit).toFixed(2)}` : '';
// //         case 'companyName':
// //           return entry.companyName || '';
// //         default:
// //           return entry[key] || '';
// //       }
// //     };

// //     ledgerData.ledgerEntries.forEach((entry) => {
// //       drawTableRow(entry);
// //     });

// //     const drawSummary = () => {
// //       y -= lineHeight * 1.5;

// //       const summaryHeight = 9 * lineHeight + 16;
// //       if (y - summaryHeight < margins.bottom + 60) {
// //         page.drawText('Continued on next page...', {
// //           x: margins.left,
// //           y: margins.bottom + 20,
// //           size: fontSizes.footer,
// //           font: regularFont,
// //           color: colors.secondary,
// //         });
// //         pageCount += 1;
// //         page = pdfDoc.addPage([595, 842]);
// //         y = page.getHeight() - margins.top;
// //         drawHeader();
// //       }

// //       page.drawText('Summary', {
// //         x: margins.left,
// //         y,
// //         size: fontSizes.summaryTitle,
// //         font: boldFont,
// //         color: colors.primary,
// //       });
// //       y -= lineHeight;

// //       const summaryItems = [
// //         { label: 'Total Sales:', value: `${currencySymbol}${(ledgerData.summary.totalSales || 0).toFixed(2)}` },
// //         { label: 'Total Purchases:', value: `${currencySymbol}${(ledgerData.summary.totalPurchases || 0).toFixed(2)}` },
// //         { label: 'Payments Received:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsReceived || 0).toFixed(2)}` },
// //         { label: 'Payments Made:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsMade || 0).toFixed(2)}` },
// //         { label: 'Credit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalCreditNotes || 0).toFixed(2)}` },
// //         { label: 'Debit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalDebitNotes || 0).toFixed(2)}` },
// //         { label: 'Interest Notes:', value: `${currencySymbol}${(ledgerData.summary.totalInterestNotes || 0).toFixed(2)}` },
// //       ];

// //       const maxLabelWidth = Math.max(...summaryItems.map((item) => boldFont.widthOfTextAtSize(item.label, fontSizes.summaryLabel)));
// //       const maxValueWidth = Math.max(...summaryItems.map((item) => regularFont.widthOfTextAtSize(item.value, fontSizes.summaryLabel)));
// //       const netValue = `${currencySymbol}${(ledgerData.summary.netBalance || 0).toFixed(2)} (${ledgerData.summary.balanceType || 'N/A'})`;
// //       const netValueWidth = boldFont.widthOfTextAtSize(netValue, fontSizes.summaryLabel);
// //       const summaryWidth = Math.min(
// //         page.getWidth() - margins.left - margins.right,
// //         maxLabelWidth + Math.max(maxValueWidth, netValueWidth) + 40
// //       );

// //       const valueStartX = margins.left + maxLabelWidth + 12;

// //       page.drawRectangle({
// //         x: margins.left,
// //         y: y - summaryHeight + lineHeight,
// //         width: summaryWidth,
// //         height: summaryHeight - 2,
// //         borderWidth: 0.5,
// //         borderColor: colors.border,
// //         color: colors.lightGray,
// //       });

// //       summaryItems.forEach((item) => {
// //         page.drawText(item.label, {
// //           x: margins.left + 6,
// //           y: y - 8,
// //           size: fontSizes.summaryLabel,
// //           font: boldFont,
// //           color: colors.secondary,
// //         });
// //         page.drawText(item.value, {
// //           x: valueStartX,
// //           y: y - 8,
// //           size: fontSizes.summaryLabel,
// //           font: regularFont,
// //           color: colors.secondary,
// //         });
// //         y -= lineHeight;
// //       });

// //       const netBalance = (ledgerData.summary.netBalance || 0).toFixed(2);
// //       const balanceType = ledgerData.summary.balanceType || 'N/A';
// //       const balanceColor = balanceType === 'Receivable' ? colors.success : colors.danger;

// //       page.drawText('Net Balance:', {
// //         x: margins.left + 6,
// //         y: y - 8,
// //         size: fontSizes.summaryLabel,
// //         font: boldFont,
// //         color: colors.secondary,
// //       });
// //       page.drawText(netValue, {
// //         x: valueStartX,
// //         y: y - 8,
// //         size: fontSizes.summaryLabel,
// //         font: boldFont,
// //         color: balanceColor,
// //       });
// //       y -= lineHeight;
// //     };

// //     drawSummary();

// //     const drawFooter = () => {
// //       const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${pageCount} of ${pageCount}`;
// //       const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
// //       page.drawText(footerText, {
// //         x: (page.getWidth() - footerWidth) / 2,
// //         y: margins.bottom - 10,
// //         size: fontSizes.footer,
// //         font: regularFont,
// //         color: colors.secondary,
// //       });
// //     };

// //     drawFooter();

// //     const pages = pdfDoc.getPages();
// //     pageCount = pages.length;
// //     pages.forEach((p, index) => {
// //       const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${index + 1} of ${pageCount}`;
// //       const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
// //       p.drawText(footerText, {
// //         x: (p.getWidth() - footerWidth) / 2,
// //         y: margins.bottom - 10,
// //         size: fontSizes.footer,
// //         font: regularFont,
// //         color: colors.secondary,
// //       });
// //     });

// //     const pdfBytes = await pdfDoc.save();
// //     res.setHeader('Content-Type', 'application/pdf');
// //     res.setHeader(
// //       'Content-Disposition',
// //       `attachment; filename=${ledgerData.company.name.replace(/ /g, '_')}_Ledger_${moment().format('YYYYMMDD')}.pdf`
// //     );
// //     res.send(Buffer.from(pdfBytes));
// //   } catch (error) {
// //     console.error('PDF generation error:', error);
// //     res.status(500).json({ message: 'Error generating PDF', error: error.message });
// //   }
// // };

// // ─── Colour palette ────────────────────────────────────────────────
// const C = {
//   navy:       rgb(0.09, 0.19, 0.37),
//   navyLight:  rgb(0.12, 0.29, 0.54),
//   ink:        rgb(0.10, 0.10, 0.18),
//   muted:      rgb(0.42, 0.42, 0.50),
//   white:      rgb(1, 1, 1),
//   rowAlt:     rgb(0.94, 0.96, 0.98),
//   divider:    rgb(0.82, 0.85, 0.91),
//   positive:   rgb(0.06, 0.54, 0.31),   // credit / receivable – green
//   negative:   rgb(0.77, 0.10, 0.10),   // debit  / payable   – red
//   summaryBg:  rgb(0.94, 0.96, 0.98),
//   bannerSub:  rgb(0.66, 0.80, 1.00),
//   periodTxt:  rgb(0.78, 0.85, 1.00),
// };
 
// // ─── Layout constants ───────────────────────────────────────────────
// const PW = 595, PH = 842;           // A4
// const ML = 28, MR = 28;
// const MT = 20, MB = 36;
// const CONTENT_W = PW - ML - MR;
 
// // ─── Font sizes ─────────────────────────────────────────────────────
// const FS = {
//   company:   17,
//   subLabel:   8,
//   colHeader:  8,
//   cell:       8,
//   badge:      7,
//   sumLabel:   9,
//   sumVal:     9,
//   netLabel:  11,
//   netVal:    11,
//   footer:     7,
// };
 
// const LINE_H   = 10;   // px per text line inside a cell
// const COL_PAD  = 5;    // horizontal padding inside cells
// const HDR_H    = 52;   // banner height
 
// // ─── Helper: wrap text into lines ──────────────────────────────────
// function wrapText(text, font, size, maxW) {
//   const words = String(text || '').split(' ');
//   const lines = [];
//   let cur = '';
//   for (const w of words) {
//     const test = cur ? `${cur} ${w}` : w;
//     if (font.widthOfTextAtSize(test, size) > maxW) {
//       if (cur) lines.push(cur);
//       cur = w;
//     } else {
//       cur = test;
//     }
//   }
//   if (cur) lines.push(cur);
//   return lines.length ? lines : [''];
// }
 
// // ─── Helper: truncate with ellipsis ────────────────────────────────
// function truncate(text, font, size, maxW) {
//   let s = String(text || '');
//   if (font.widthOfTextAtSize(s, size) <= maxW) return s;
//   while (s.length > 0 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1);
//   return s + '…';
// }
 
// // ───────────────────────────────────────────────────────────────────
// const downloadCompanyLedgerPDF = async (req, res) => {
//   try {
//     const { companyId = 'all', startDate, endDate, month, year, type } = req.query;
 
//     if (!startDate || !endDate)
//       return res.status(400).json({ message: 'Both startDate and endDate are required' });
 
//     // ── Fetch data (your existing function, unchanged) ──────────────
//     const ledgerData = await prepareCompanyLedgerData(
//       companyId, startDate, endDate, month, year, type, organizationId
//     );
 
//     if (!ledgerData?.ledgerEntries?.length)
//       return res.status(404).json({ message: 'No ledger data found' });
 
//     // ── PDF document setup ──────────────────────────────────────────
//     const pdfDoc    = await PDFDocument.create();
//     const regular   = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const bold      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
//     const boldObliq = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
 
//     let page, curY;
 
//     const newPage = () => {
//       page = pdfDoc.addPage([PW, PH]);
//       curY = PH - MT - HDR_H - 10;
//     };
//     newPage();
 
//     // ── Column definitions ─────────────────────────────────────────
//     // Single "Amount" + "Dr/Cr" badge — no separate Debit/Credit
//     const isAll = companyId === 'all';
 
//     const COLS = isAll
//       ? [
//           { key: 'companyName', label: 'Party / Company', w: 90,  align: 'left'   },
//           { key: 'date',        label: 'Date',            w: 58,  align: 'left'   },
//           { key: 'type',        label: 'Type',            w: 58,  align: 'left'   },
//           { key: 'docNo',       label: 'Doc No.',         w: 52,  align: 'left'   },
//           { key: 'description', label: 'Narration',       w: 114, align: 'left'   },
//           { key: 'amount',      label: 'Amount (Rs.)',    w: 72,  align: 'right'  },
//           { key: 'drCr',        label: 'Dr/Cr',           w: 30,  align: 'center' },
//         ]
//       : [
//           { key: 'date',        label: 'Date',            w: 62,  align: 'left'   },
//           { key: 'type',        label: 'Type',            w: 62,  align: 'left'   },
//           { key: 'docNo',       label: 'Doc No.',         w: 56,  align: 'left'   },
//           { key: 'description', label: 'Narration',       w: 176, align: 'left'   },
//           { key: 'amount',      label: 'Amount (Rs.)',    w: 76,  align: 'right'  },
//           { key: 'drCr',        label: 'Dr/Cr',           w: 32,  align: 'center' },
//         ];
 
//     const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);
//     const TABLE_X = ML + (CONTENT_W - TABLE_W) / 2;
 
//     // ── Draw banner header ─────────────────────────────────────────
//     const drawHeader = () => {
//       // Navy banner
//       page.drawRectangle({ x: 0, y: PH - MT - HDR_H, width: PW, height: HDR_H + MT, color: C.navy });
//       // Right accent strip
//       page.drawRectangle({ x: PW - 7, y: PH - MT - HDR_H, width: 7, height: HDR_H + MT, color: C.navyLight });
 
//       // Company name
//       page.drawText(ledgerData.company.name || 'Company', {
//         x: ML, y: PH - MT - 22, size: FS.company, font: bold, color: C.white,
//       });
 
//       // "COMPANY LEDGER" sub-label
//       page.drawText('COMPANY LEDGER', {
//         x: ML, y: PH - MT - 40, size: FS.subLabel, font: boldObliq, color: C.bannerSub,
//       });
 
//       // Period — right aligned
//       const periodStr = `Period: ${moment(ledgerData.dateRange.start).format('DD MMM YYYY')} – ${moment(ledgerData.dateRange.end).format('DD MMM YYYY')}`;
//       const pw2 = regular.widthOfTextAtSize(periodStr, FS.subLabel);
//       page.drawText(periodStr, {
//         x: PW - MR - 7 - pw2, y: PH - MT - 28, size: FS.subLabel, font: regular, color: C.periodTxt,
//       });
 
//       // GSTIN if available
//       if (ledgerData.company.gstNumber) {
//         const gStr = `GSTIN: ${ledgerData.company.gstNumber}`;
//         const gw2  = regular.widthOfTextAtSize(gStr, FS.subLabel);
//         page.drawText(gStr, {
//           x: PW - MR - 7 - gw2, y: PH - MT - 42, size: FS.subLabel, font: regular, color: C.periodTxt,
//         });
//       }
//     };
 
//     // ── Draw table column header row ───────────────────────────────
//     const drawTableHeader = () => {
//       const HDR_ROW_H = 20;
//       let cx = TABLE_X;
//       COLS.forEach(col => {
//         page.drawRectangle({ x: cx, y: curY - HDR_ROW_H, width: col.w, height: HDR_ROW_H, color: C.navyLight });
//         const lw = bold.widthOfTextAtSize(col.label, FS.colHeader);
//         const tx =
//           col.align === 'right'  ? cx + col.w - COL_PAD - lw :
//           col.align === 'center' ? cx + (col.w - lw) / 2 :
//           cx + COL_PAD;
//         page.drawText(col.label, { x: tx, y: curY - HDR_ROW_H + 7, size: FS.colHeader, font: bold, color: C.white });
//         cx += col.w;
//       });
//       curY -= HDR_ROW_H;
//     };
 
//     // ── Resolve cell value ─────────────────────────────────────────
//     const cellValue = (entry, key) => {
//       switch (key) {
//         case 'date':   return moment(entry.date).format('DD MMM YYYY');
//         case 'amount': {
//           const v = entry.debit != null && entry.debit !== '' ? entry.debit
//                   : entry.credit != null && entry.credit !== '' ? entry.credit : null;
//           return v !== null ? `Rs. ${parseFloat(v).toFixed(2)}` : '—';
//         }
//         case 'drCr':
//           if (entry.debit  != null && entry.debit  !== '') return 'Dr';
//           if (entry.credit != null && entry.credit !== '') return 'Cr';
//           return '—';
//         default: return String(entry[key] || '');
//       }
//     };
 
//     // ── Draw a single data row ─────────────────────────────────────
//     let rowIdx = 0;
 
//     const drawRow = (entry) => {
//       const descCol  = COLS.find(c => c.key === 'description');
//       const descLines = descCol
//         ? wrapText(cellValue(entry, 'description'), regular, FS.cell, descCol.w - COL_PAD * 2)
//         : [''];
//       const rowH = Math.max(18, descLines.length * LINE_H + 8);
//       const drCr = cellValue(entry, 'drCr');
 
//       // Page break
//       if (curY - rowH < MB + 80) {
//         page.drawText('/ continued on next page /', {
//           x: TABLE_X + TABLE_W / 2 - 55, y: curY - 8,
//           size: FS.footer, font: regular, color: C.muted,
//         });
//         newPage();
//         drawHeader();
//         drawTableHeader();
//       }
 
//       const bg = rowIdx % 2 === 1 ? C.rowAlt : C.white;
//       let cx = TABLE_X;
 
//       COLS.forEach(col => {
//         // Cell background
//         page.drawRectangle({
//           x: cx, y: curY - rowH, width: col.w, height: rowH,
//           color: bg, borderWidth: 0.4, borderColor: C.divider,
//         });
 
//         const val = cellValue(entry, col.key);
 
//         if (col.key === 'drCr') {
//           // Coloured badge
//           const bColor = drCr === 'Dr' ? C.negative : drCr === 'Cr' ? C.positive : C.muted;
//           const bW = 22, bH = 13;
//           const bx = cx + (col.w - bW) / 2;
//           const by = curY - rowH / 2 - bH / 2;
//           page.drawRectangle({ x: bx, y: by, width: bW, height: bH, color: bColor });
//           const tw = bold.widthOfTextAtSize(val, FS.badge);
//           page.drawText(val, { x: bx + (bW - tw) / 2, y: by + 3, size: FS.badge, font: bold, color: C.white });
 
//         } else if (col.key === 'description') {
//           // Multi-line narration
//           let ty = curY - 9;
//           descLines.forEach(ln => {
//             page.drawText(ln, { x: cx + COL_PAD, y: ty, size: FS.cell, font: regular, color: C.ink });
//             ty -= LINE_H;
//           });
 
//         } else if (col.key === 'amount') {
//           // Right-aligned, colour-coded
//           const amtColor = drCr === 'Dr' ? C.negative : drCr === 'Cr' ? C.positive : C.ink;
//           const aw = bold.widthOfTextAtSize(val, FS.cell);
//           page.drawText(val, {
//             x: cx + col.w - COL_PAD - aw,
//             y: curY - rowH / 2 - 3,
//             size: FS.cell, font: bold, color: amtColor,
//           });
 
//         } else {
//           // Default: single line, truncated
//           const txt = truncate(val, regular, FS.cell, col.w - COL_PAD * 2);
//           const tw  = regular.widthOfTextAtSize(txt, FS.cell);
//           const tx  =
//             col.align === 'right'  ? cx + col.w - COL_PAD - tw :
//             col.align === 'center' ? cx + (col.w - tw) / 2 :
//             cx + COL_PAD;
//           page.drawText(txt, { x: tx, y: curY - rowH / 2 - 3, size: FS.cell, font: regular, color: C.ink });
//         }
 
//         cx += col.w;
//       });
 
//       curY -= rowH;
//       rowIdx++;
//     };
 
//     // ── Render all rows ────────────────────────────────────────────
//     drawHeader();
//     drawTableHeader();
//     ledgerData.ledgerEntries.forEach(drawRow);
 
//     // ── Summary section ────────────────────────────────────────────
//     const drawSummary = () => {
//       const s       = ledgerData.summary;
//       const ITEM_H  = 28;
//       const GAP     = 6;
//       const ITEMS   = [
//         ['Total Sales',          s.totalSales          || 0],
//         ['Total Purchases',      s.totalPurchases       || 0],
//         ['Payments Received',    s.totalPaymentsReceived|| 0],
//         ['Payments Made',        s.totalPaymentsMade    || 0],
//         ['Credit Notes',         s.totalCreditNotes     || 0],
//         ['Debit Notes',          s.totalDebitNotes      || 0],
//         ['Interest Notes',       s.totalInterestNotes   || 0],
//       ];
//       const ROWS    = Math.ceil(ITEMS.length / 2);
//       const NET_H   = 32;
//       const TOTAL_H = ROWS * (ITEM_H + GAP) + NET_H + 60;
 
//       if (curY - TOTAL_H < MB) {
//         newPage();
//         drawHeader();
//       }
 
//       curY -= 18;
 
//       // Section title with left accent bar
//       page.drawRectangle({ x: ML, y: curY - 14, width: 3, height: 14, color: C.navyLight });
//       page.drawText('Ledger Summary', { x: ML + 8, y: curY - 13, size: 11, font: bold, color: C.navy });
//       curY -= 20;
 
//       // Thin rule
//       page.drawLine({ start: { x: ML, y: curY }, end: { x: ML + CONTENT_W, y: curY }, thickness: 0.8, color: C.navyLight });
//       curY -= GAP;
 
//       // Two-column grid
//       const HALF_W = (CONTENT_W - GAP) / 2;
 
//       ITEMS.forEach(([label, value], i) => {
//         const col = i % 2;
//         const row = Math.floor(i / 2);
//         const ix  = ML + col * (HALF_W + GAP);
//         const iy  = curY - row * (ITEM_H + GAP);
 
//         page.drawRectangle({
//           x: ix, y: iy - ITEM_H, width: HALF_W, height: ITEM_H,
//           color: C.summaryBg, borderWidth: 0.5, borderColor: C.divider,
//         });
//         page.drawText(label, { x: ix + 8, y: iy - 10, size: FS.sumLabel, font: regular, color: C.muted });
 
//         const valStr = `Rs. ${parseFloat(value).toFixed(2)}`;
//         const vw     = bold.widthOfTextAtSize(valStr, FS.sumVal);
//         page.drawText(valStr, { x: ix + HALF_W - 8 - vw, y: iy - 10, size: FS.sumVal, font: bold, color: C.ink });
 
//         // Second line for label in tighter space
//         page.drawText('', { x: ix + 8, y: iy - 22, size: 0, font: regular, color: C.muted });
//       });
 
//       curY -= ROWS * (ITEM_H + GAP) + GAP;
 
//       // Net balance bar
//       const netBalance  = parseFloat(s.netBalance || 0).toFixed(2);
//       const balanceType = s.balanceType || 'N/A';
//       const barColor    = balanceType === 'Receivable' ? C.positive : C.negative;
 
//       page.drawRectangle({ x: ML, y: curY - NET_H, width: CONTENT_W, height: NET_H, color: barColor });
 
//       page.drawText('Net Balance:', {
//         x: ML + 12, y: curY - NET_H / 2 - 5, size: FS.netLabel, font: bold, color: C.white,
//       });
 
//       const netStr = `Rs. ${netBalance}  (${balanceType})`;
//       const nw     = bold.widthOfTextAtSize(netStr, FS.netVal);
//       page.drawText(netStr, {
//         x: ML + CONTENT_W - 12 - nw, y: curY - NET_H / 2 - 5,
//         size: FS.netVal, font: bold, color: C.white,
//       });
 
//       curY -= NET_H;
//     };
 
//     drawSummary();
 
//     // ── Footer on every page (accurate page count) ──────────────────
//     const pages      = pdfDoc.getPages();
//     const totalPages = pages.length;
 
//     pages.forEach((p, idx) => {
//       // Rule above footer
//       p.drawLine({
//         start: { x: ML,      y: MB - 3 },
//         end:   { x: PW - MR, y: MB - 3 },
//         thickness: 0.5, color: C.divider,
//       });
//       p.drawText(`${ledgerData.company.name}  |  Company Ledger`, {
//         x: ML, y: MB - 14, size: FS.footer, font: regular, color: C.muted,
//       });
//       const pg  = `Page ${idx + 1} of ${totalPages}`;
//       const pgW = regular.widthOfTextAtSize(pg, FS.footer);
//       p.drawText(pg, { x: PW - MR - pgW, y: MB - 14, size: FS.footer, font: regular, color: C.muted });
//     });
 
//     // ── Send PDF ────────────────────────────────────────────────────
//     const pdfBytes = await pdfDoc.save();
//     const fname    = `${(ledgerData.company.name || 'Company').replace(/\s+/g, '_')}_Ledger_${moment().format('YYYYMMDD')}.pdf`;
 
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
//     res.send(Buffer.from(pdfBytes));
 
//   } catch (err) {
//     console.error('PDF generation error:', err);
//     res.status(500).json({ message: 'Error generating PDF', error: err.message });
//   }
// };
 

// // @desc    Prepare company ledger data
// // @access  Private
// const prepareCompanyLedgerData = async (companyId, startDate, endDate, month, year, type, organizationId) => {
//   let dateFilter = {};
//   if (month && year) {
//     const start = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
//     const end = moment(start).endOf('month').toDate();
//     dateFilter = { $gte: start, $lte: end };
//   } else if (startDate && endDate) {
//     dateFilter = {
//       $gte: new Date(startDate),
//       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//     };
//   }

//   if (companyId === 'all') {
//     const companies = await Company.find({ organizationId });
//     let allEntries = [];
//     let totals = {
//       totalSales: 0,
//       totalPurchases: 0,
//       totalPaymentsReceived: 0,
//       totalPaymentsMade: 0,
//       totalCreditNotes: 0,
//       totalDebitNotes: 0,
//       totalInterestNotes: 0,
//       netBalance: 0
//     };

//     for (const company of companies) {
//       const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
//         Bill.find({
//           company: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { billDate: dateFilter })
//         }),
//         Purchase.find({
//           supplierCompany: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
//         }),
//         Transaction.find({
//           company: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
//         }),
//         CreditNote.find({
//           company: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
//         }),
//         DebitNote.find({
//           supplierCompany: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
//         }),
//         InterestNote.find({
//           company: company._id,
//           organizationId: req.organizationId,
//           ...(Object.keys(dateFilter).length && { interestNoteDate: dateFilter })
//         }),
//       ]);

//       const companyEntries = [];
      
//       bills.forEach(bill => {
//         companyEntries.push({
//           date: bill.billDate,
//           type: 'Sale',
//           docNo: bill.billNumber,
//           description: `Bill to ${company.name}`,
//           debit: bill.totalAmount,
//           credit: null,
//           companyName: company.name,
//           referenceId: bill._id,
//           referenceType: 'Bill'
//         });
//         totals.totalSales += bill.totalAmount;
//       });

//       purchases.forEach(purchase => {
//         companyEntries.push({
//           date: purchase.purchaseBillDate,
//           type: 'Purchase',
//           docNo: purchase.purchaseBillNumber,
//           description: `Purchase from ${company.name}`,
//           debit: null,
//           credit: purchase.amount,
//           companyName: company.name,
//           referenceId: purchase._id,
//           referenceType: 'Purchase'
//         });
//         totals.totalPurchases += purchase.amount;
//       });

//       transactions.forEach(tx => {
//         if (tx.type === 'IN') {
//           companyEntries.push({
//             date: tx.paymentDate,
//             type: 'Payment Received',
//             docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
//             description: tx.description || 'Received',
//             debit: null,
//             credit: tx.amount,
//             companyName: company.name,
//             referenceId: tx._id,
//             referenceType: 'Transaction'
//           });
//           totals.totalPaymentsReceived += tx.amount;
//         } else {
//           companyEntries.push({
//             date: tx.paymentDate,
//             type: 'Payment Made',
//             docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
//             description: tx.description || 'Paid',
//             debit: tx.amount,
//             credit: null,
//             companyName: company.name,
//             referenceId: tx._id,
//             referenceType: 'Transaction'
//           });
//           totals.totalPaymentsMade += tx.amount;
//         }
//       });

//       creditNotes.forEach(note => {
//         const isProcessed = note.status === 'Processed';
//         companyEntries.push({
//           date: note.creditNoteDate,
//           type: 'Credit Note',
//           docNo: note.creditNoteNumber,
//           description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
//           debit: isProcessed ? note.totalAmount : null,
//           credit: isProcessed ? note.totalAmount : null,
//           amount: note.totalAmount,
//           status: note.status,
//           companyName: company.name,
//           referenceId: note._id,
//           referenceType: 'CreditNote'
//         });
//         totals.totalCreditNotes += note.totalAmount;
//       });

//       debitNotes.forEach(note => {
//         const isProcessed = note.status === 'Processed';
//         companyEntries.push({
//           date: note.debitNoteDate,
//           type: 'Debit Note',
//           docNo: note.debitNoteNumber,
//           description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
//           debit: isProcessed ? note.totalAmount : null,
//           credit: isProcessed ? note.totalAmount : null,
//           amount: note.totalAmount,
//           status: note.status,
//           companyName: company.name,
//           referenceId: note._id,
//           referenceType: 'DebitNote'
//         });
//         totals.totalDebitNotes += note.totalAmount;
//       });

//       interestNotes.forEach(note => {
//         const isPaid = note.status === 'Paid';
//         companyEntries.push({
//           date: note.interestNoteDate,
//           type: 'Interest Note',
//           docNo: note.interestNoteNumber,
//           description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
//           debit: isPaid ? note.totalAmount : null,
//           credit: isPaid ? note.totalAmount : null,
//           amount: note.totalAmount,
//           status: note.status,
//           companyName: company.name,
//           referenceId: note._id,
//           referenceType: 'InterestNote'
//         });
//         totals.totalInterestNotes += note.totalAmount;
//       });

//       allEntries = [...allEntries, ...companyEntries];
//     }

//     allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

//     if (type && type !== 'all') {
//       allEntries = allEntries.filter(entry =>
//         type === 'Transaction'
//           ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
//           : entry.type === type
//       );
//     }

//     const netBalance = (totals.totalSales + totals.totalPaymentsMade + totals.totalDebitNotes) - (totals.totalPurchases + totals.totalPaymentsReceived + totals.totalCreditNotes + totals.totalInterestNotes);
//     const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

//     return {
//       company: {
//         _id: 'all',
//         name: 'All Companies',
//         gstNumber: ''
//       },
//       dateRange: {
//         start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
//         end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
//       },
//       ledgerEntries: allEntries,
//       summary: {
//         ...totals,
//         netBalance: Math.abs(netBalance),
//         balanceType
//       }
//     };
//   }

//   if (!companyId) {
//     throw new Error('Company ID is required');
//   }

//   const company = await Company.findById(companyId);
//   if (!company) {
//     throw new Error('Company not found');
//   }

//   const [bills, purchases, transactions, creditNotes, debitNotes, interestNotes] = await Promise.all([
//     Bill.find({
//       company: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { billDate: dateFilter })
//     }).sort({ billDate: 1 }),
    
//     Purchase.find({
//       supplierCompany: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
//     }).sort({ purchaseBillDate: 1 }),

//     Transaction.find({
//       company: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
//     }).sort({ paymentDate: 1 }),

//     CreditNote.find({
//       company: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
//     }).sort({ creditNoteDate: 1 }),

//     DebitNote.find({
//       supplierCompany: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
//     }).sort({ debitNoteDate: 1 }),

//     InterestNote.find({
//       company: companyId,
//       organizationId: organizationId,
//       ...(Object.keys(dateFilter).length && { interestNoteDate: dateFilter })
//     }).sort({ interestNoteDate: 1 }),
//   ]);

//   const ledgerEntries = [];

//   bills.forEach(bill => {
//     ledgerEntries.push({
//       date: bill.billDate,
//       type: 'Sale',
//       docNo: bill.billNumber,
//       description: `Bill to ${company.name}`,
//       debit: bill.totalAmount,
//       credit: null,
//       referenceId: bill._id,
//       referenceType: 'Bill'
//     });
//   });

//   purchases.forEach(purchase => {
//     ledgerEntries.push({
//       date: purchase.purchaseBillDate,
//       type: 'Purchase',
//       docNo: purchase.purchaseBillNumber,
//       description: `Purchase from ${company.name}`,
//       debit: null,
//       credit: purchase.amount,
//       referenceId: purchase._id,
//       referenceType: 'Purchase'
//     });
//   });

//   transactions.forEach(tx => {
//     if (tx.type === 'IN') {
//       ledgerEntries.push({
//         date: tx.paymentDate,
//         type: 'Payment Received',
//         docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
//         description: tx.description || 'Received',
//         debit: null,
//         credit: tx.amount,
//         referenceId: tx._id,
//         referenceType: 'Transaction'
//       });
//     } else {
//       ledgerEntries.push({
//         date: tx.paymentDate,
//         type: 'Payment Made',
//         docNo: tx.referenceNumber || `TR-${tx._id.toString().slice(-6)}`,
//         description: tx.description || 'Paid',
//         debit: tx.amount,
//         credit: null,
//         referenceId: tx._id,
//         referenceType: 'Transaction'
//       });
//     }
//   });

//   creditNotes.forEach(note => {
//     ledgerEntries.push({
//       date: note.creditNoteDate,
//       type: 'Credit Note',
//       docNo: note.creditNoteNumber,
//       description: `Credit Note against Bill ${note.originalBillNumber} - ${note.returnReason}`,
//       debit: null,
//       credit: note.totalAmount,
//       referenceId: note._id,
//       referenceType: 'CreditNote'
//     });
//   });

//   debitNotes.forEach(note => {
//     ledgerEntries.push({
//       date: note.debitNoteDate,
//       type: 'Debit Note',
//       docNo: note.debitNoteNumber,
//       description: `Debit Note against Purchase ${note.originalPurchaseBillNumber} - ${note.returnReason}`,
//       debit: note.totalAmount,
//       credit: null,
//       referenceId: note._id,
//       referenceType: 'DebitNote'
//     });
//   });

//   interestNotes.forEach(note => {
//     ledgerEntries.push({
//       date: note.interestNoteDate,
//       type: 'Interest Note',
//       docNo: note.interestNoteNumber,
//       description: `Interest on late payment for Bill ${note.originalBillNumber} (${note.lateDays} days late)`,
//       debit: null,
//       credit: note.totalAmount,
//       referenceId: note._id,
//       referenceType: 'InterestNote'
//     });
//   });

//   ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

//   if (type && type !== 'all') {
//     const filtered = ledgerEntries.filter(entry =>
//       type === 'Transaction'
//         ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
//         : entry.type === type
//     );
//     return {
//       company: {
//         _id: company._id,
//         name: company.name,
//         gstNumber: company.gstNumber
//       },
//       dateRange: {
//         start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
//         end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
//       },
//       ledgerEntries: filtered,
//       summary: {
//         totalSales,
//         totalPurchases,
//         totalPaymentsReceived,
//         totalPaymentsMade,
//         totalCreditNotes,
//         totalDebitNotes,
//         totalInterestNotes,
//         netBalance: Math.abs(netBalance),
//         balanceType
//       }
//     };
//   }

//   const totalSales = bills.reduce((sum, b) => sum + b.totalAmount, 0);
//   const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0);
//   const totalPaymentsReceived = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
//   const totalPaymentsMade = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
//   const totalCreditNotes = creditNotes.reduce((sum, n) => sum + n.totalAmount, 0);
//   const totalDebitNotes = debitNotes.reduce((sum, n) => sum + n.totalAmount, 0);
//   const totalInterestNotes = interestNotes.reduce((sum, n) => sum + n.totalAmount, 0);

//   const netBalance = (totalSales + totalPaymentsMade + totalDebitNotes) - (totalPurchases + totalPaymentsReceived + totalCreditNotes + totalInterestNotes);
//   const balanceType = netBalance >= 0 ? 'Receivable' : 'Payable';

//   return {
//     company: {
//       _id: company._id,
//       name: company.name,
//       gstNumber: company.gstNumber
//     },
//     dateRange: {
//       start: startDate || (month && year ? moment(`${year}-${month}-01`).format('YYYY-MM-DD') : null),
//       end: endDate || (month && year ? moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD') : null)
//     },
//     ledgerEntries,
//     summary: {
//       totalSales,
//       totalPurchases,
//       totalPaymentsReceived,
//       totalPaymentsMade,
//       totalCreditNotes,
//       totalDebitNotes,
//       totalInterestNotes,
//       netBalance: Math.abs(netBalance),
//       balanceType
//     }
//   };
// };

// module.exports = {
//   getCompanyLedger,
//   getCompaniesLedgerSummary,
//   downloadCompanyLedgerExcel,
//   downloadCompanyLedgerPDF
// };


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
const mongoose = require('mongoose');

const { getOrgDetails } = require('../utils/orgDetails');

// @desc    Get company ledger with filters
// @route   GET /api/ledger/company
// @access  Private/Admin
const getCompanyLedger = async (req, res) => {
  const { companyId, startDate, endDate, month, year, financialYear } = req.query;

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
    if (financialYear && financialYear !== 'all') {
      const fyParts = financialYear.split('-');
      const startYear = parseInt(fyParts[0], 10);
      const fyStart = new Date(startYear, 3, 1);
      fyStart.setHours(0, 0, 0, 0);
      const fyEnd = new Date(startYear + 1, 2, 31);
      fyEnd.setHours(23, 59, 59, 999);
      dateFilter = { $gte: fyStart, $lte: fyEnd };
    } else if (month && year) {
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
        organizationId: req.organizationId,
        ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter })
      }).sort({ billDate: 1 }),
      
      Purchase.find({
        supplierCompany: companyId,
        organizationId: req.organizationId,
        ...(Object.keys(dateFilter).length > 0 && { purchaseBillDate: dateFilter })
      }).sort({ purchaseBillDate: 1 }),
      
      Transaction.find({
        company: companyId,
        organizationId: req.organizationId,
        ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter })
      }).sort({ paymentDate: 1 }),

      CreditNote.find({
        company: companyId,
        organizationId: req.organizationId,
        ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter })
      }).sort({ creditNoteDate: 1 }),

      DebitNote.find({
        supplierCompany: companyId,
        organizationId: req.organizationId,
        ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter })
      }).sort({ debitNoteDate: 1 }),

      InterestNote.find({
        company: companyId,
        organizationId: req.organizationId,
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
        debit: null,
        credit: purchase.amount,
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

    const adjustedSales = totalSales - totalCreditNotes + totalInterestNotes;
    const adjustedPurchases = totalPurchases - totalDebitNotes;

    const netBalance = (adjustedSales - totalPaymentsReceived) - (adjustedPurchases - totalPaymentsMade);
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
        adjustedSales,
        adjustedPurchases,
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
  console.log('=== getCompaniesLedgerSummary CALLED ===');
  console.log('req.organizationId:', req.organizationId);
  console.log('req.user:', req.user ? req.user.email : 'none');
  console.log('req.query:', req.query);
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

    const companies = await Company.find({ organizationId: req.organizationId }).sort({ name: 1 });
    console.log('[LEDGER] orgId:', req.organizationId, '| companies:', companies.length);
    if (companies.length > 0) {
      console.log('[LEDGER] First company:', companies[0]._id, companies[0].name);
    }

    const companiesSummary = await Promise.all(
      companies.map(async company => {
        console.log('[LEDGER] Processing company:', company._id, company.name);

        const companyId = new mongoose.Types.ObjectId(company._id);
        console.log('[LEDGER] companyId for aggregate:', companyId, 'type:', typeof companyId);

        const purchasesSum = await Purchase.aggregate([
          { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId, ...(Object.keys(dateFilter).length > 0 && { purchaseBillDate: dateFilter }) } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        console.log('[LEDGER] purchasesSum:', purchasesSum);

        const [salesSum, paymentsInSum, paymentsOutSum, creditNotesSum, debitNotesSum, interestNotesSum, processedCreditNotesSum, processedDebitNotesSum, paidInterestNotesSum] = await Promise.all([
          Bill.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { billDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          Transaction.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, type: 'IN', ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]),
          Transaction.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, type: 'OUT', ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]),
          CreditNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          DebitNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId, ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          InterestNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          CreditNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, status: 'Processed', ...(Object.keys(dateFilter).length > 0 && { creditNoteDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          DebitNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), supplierCompany: companyId, status: 'Processed', ...(Object.keys(dateFilter).length > 0 && { debitNoteDate: dateFilter }) } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
          ]),
          InterestNote.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId), company: companyId, status: 'Paid', ...(Object.keys(dateFilter).length > 0 && { interestNoteDate: dateFilter }) } },
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

        const adjustedSales = totalSales - totalCreditNotes + totalInterestNotes;
        const adjustedPurchases = totalPurchases - totalDebitNotes;

        const netBalance = (adjustedSales - totalPaymentsReceived) - (adjustedPurchases - totalPaymentsMade);
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
            adjustedSales,
            adjustedPurchases,
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
        acc.adjustedSales += curr.totals.adjustedSales || 0;
        acc.adjustedPurchases += curr.totals.adjustedPurchases || 0;
        
        const companyNet = (curr.totals.adjustedSales - curr.totals.totalPaymentsReceived) - 
                          (curr.totals.adjustedPurchases - curr.totals.totalPaymentsMade);
        
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
        adjustedSales: 0,
        adjustedPurchases: 0,
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
    const { companyId, startDate, endDate, month, year, type } = req.query;
    
    const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year, type, req.organizationId);
    
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
// const downloadCompanyLedgerPDF = async (req, res) => {
//   try {
//     const { companyId = 'all', startDate, endDate, month, year, type } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: 'Both startDate and endDate are required' });
//     }

//     const ledgerData = await prepareCompanyLedgerData(companyId, startDate, endDate, month, year, type, organizationId);

//     if (!ledgerData?.ledgerEntries?.length) {
//       return res.status(404).json({ message: 'No ledger data found' });
//     }

//     const pdfDoc = await PDFDocument.create();
//     let page = pdfDoc.addPage([595, 842]);
//     let pageCount = 1;

//     const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     const currencySymbol = 'RS.';
//     const colors = {
//       primary: rgb(0.13, 0.27, 0.47),
//       secondary: rgb(0.2, 0.2, 0.2),
//       success: rgb(0.1, 0.6, 0.1),
//       danger: rgb(0.8, 0.1, 0.1),
//       lightGray: rgb(0.95, 0.95, 0.95),
//       border: rgb(0.7, 0.7, 0.7),
//     };

//     const margins = {
//       top: 50,
//       bottom: 50,
//       left: 30,
//       right: 30,
//     };

//     const fontSizes = {
//       title: 16,
//       subtitle: 10,
//       tableHeader: 9,
//       tableCell: 8,
//       footer: 8,
//       summaryTitle: 12,
//       summaryLabel: 10,
//     };

//     const lineHeight = 14;
//     const smallLineHeight = 10;
//     const paragraphSpacing = 8;

//     let y = page.getHeight() - margins.top;

//     const drawHeader = () => {
//       page.drawText(ledgerData.company.name, {
//         x: margins.left,
//         y,
//         size: fontSizes.title,
//         font: boldFont,
//         color: colors.primary,
//       });
//       y -= lineHeight;

//       if (ledgerData.company.gstNumber) {
//         page.drawText(`GSTIN: ${ledgerData.company.gstNumber}`, {
//           x: margins.left,
//           y,
//           size: fontSizes.subtitle,
//           font: regularFont,
//           color: colors.secondary,
//         });
//       }

//       const periodText = `Period: ${moment(ledgerData.dateRange.start).format('DD/MM/YYYY')} - ${moment(ledgerData.dateRange.end).format('DD/MM/YYYY')}`;
//       const periodWidth = regularFont.widthOfTextAtSize(periodText, fontSizes.subtitle);
//       page.drawText(periodText, {
//         x: page.getWidth() - margins.right - periodWidth,
//         y,
//         size: fontSizes.subtitle,
//         font: regularFont,
//         color: colors.secondary,
//       });
//       y -= lineHeight * 1.2;

//       page.drawLine({
//         start: { x: margins.left, y },
//         end: { x: page.getWidth() - margins.right, y },
//         thickness: 1,
//         color: colors.primary,
//       });
//       y -= paragraphSpacing;
//     };

//     drawHeader();

//     const columnDefinitions = companyId === 'all'
//       ? [
//           { header: 'Company', key: 'companyName', width: 70, align: 'left' },
//           { header: 'Date', key: 'date', width: 55, align: 'left' },
//           { header: 'Type', key: 'type', width: 55, align: 'left' },
//           { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
//           { header: 'Description', key: 'description', width: 120, align: 'left' },
//           { header: 'Debit', key: 'debit', width: 60, align: 'right' },
//           { header: 'Credit', key: 'credit', width: 60, align: 'right' },
//         ]
//       : [
//           { header: 'Date', key: 'date', width: 55, align: 'left' },
//           { header: 'Type', key: 'type', width: 55, align: 'left' },
//           { header: 'Doc No.', key: 'docNo', width: 50, align: 'left' },
//           { header: 'Description', key: 'description', width: 175, align: 'left' },
//           { header: 'Debit', key: 'debit', width: 65, align: 'right' },
//           { header: 'Credit', key: 'credit', width: 65, align: 'right' },
//         ];

//     const tableWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);
//     const tableX = (page.getWidth() - tableWidth) / 2;

//     const drawTableHeader = () => {
//       let x = tableX;
//       columnDefinitions.forEach(column => {
//         page.drawRectangle({
//           x,
//           y: y - lineHeight - 4,
//           width: column.width,
//           height: lineHeight + 4,
//           borderWidth: 0.5,
//           borderColor: colors.border,
//           color: colors.lightGray,
//         });

//         page.drawText(column.header, {
//           x: column.align === 'right' ? x + column.width - 4 - regularFont.widthOfTextAtSize(column.header, fontSizes.tableHeader) : x + 4,
//           y: y - 8,
//           size: fontSizes.tableHeader,
//           font: boldFont,
//           color: colors.primary,
//         });

//         x += column.width;
//       });
//       y -= lineHeight + 8;
//     };

//     drawTableHeader();

//     const drawTableRow = (entry) => {
//       const startY = y;
//       let maxLines = 1;

//       const linesNeeded = columnDefinitions.map((column) => {
//         const text = getCellText(entry, column.key);
//         if (!text) return 1;
//         const availableWidth = column.width - 8;
//         const words = text.split(' ');
//         let line = '';
//         let lines = 1;

//         words.forEach((word) => {
//           const testLine = line + word + ' ';
//           const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
//           if (testWidth > availableWidth) {
//             lines++;
//             line = word + ' ';
//           } else {
//             line = testLine;
//           }
//         });

//         return lines;
//       });

//       maxLines = Math.max(...linesNeeded);
//       const cellHeight = maxLines * smallLineHeight + 6;

//       if (y - cellHeight < margins.bottom + 80) {
//         page.drawText('Continued on next page...', {
//           x: margins.left,
//           y: margins.bottom + 20,
//           size: fontSizes.footer,
//           font: regularFont,
//           color: colors.secondary,
//         });
//         pageCount += 1;
//         page = pdfDoc.addPage([595, 842]);
//         y = page.getHeight() - margins.top;
//         drawHeader();
//         drawTableHeader();
//       }

//       let x = tableX;
//       columnDefinitions.forEach((column) => {
//         page.drawRectangle({
//           x,
//           y: y - cellHeight,
//           width: column.width,
//           height: cellHeight,
//           borderWidth: 0.5,
//           borderColor: colors.border,
//           color: rgb(1, 1, 1),
//         });

//         const text = getCellText(entry, column.key);
//         const words = text.split(' ');
//         let line = '';
//         let textY = y - 10;

//         words.forEach((word) => {
//           const testLine = line + word + ' ';
//           const testWidth = regularFont.widthOfTextAtSize(testLine, fontSizes.tableCell);
//           if (testWidth > column.width - 8) {
//             page.drawText(line.trim(), {
//               x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
//               y: textY,
//               size: fontSizes.tableCell,
//               font: regularFont,
//               color: 
//                     column.key === 'credit' ? colors.danger : 
//                     column.key === 'debit' ? colors.success :
//                     colors.secondary,
//             });
//             textY -= smallLineHeight;
//             line = word + ' ';
//           } else {
//             line = testLine;
//           }
//         });

//         if (line.trim() !== '') {
//           page.drawText(line.trim(), {
//             x: column.align === 'right' ? x + column.width - regularFont.widthOfTextAtSize(line.trim(), fontSizes.tableCell) - 4 : x + 4,
//             y: textY,
//             size: fontSizes.tableCell,
//             font: regularFont,
//             color:
//                   column.key === 'credit' ? colors.danger : 
//                   column.key === 'debit' ? colors.success :
//                   colors.secondary,
//           });
//         }

//         x += column.width;
//       });

//       y -= cellHeight + 2;
//     };

//     const getCellText = (entry, key) => {
//       switch (key) {
//         case 'date':
//           return moment(entry.date).format('DD/MM/YYYY');
//         case 'debit':
//           return entry.debit != null && entry.debit !== '' ? `${currencySymbol}${parseFloat(entry.debit).toFixed(2)}` : '';
//         case 'credit':
//           return entry.credit != null && entry.credit !== '' ? `${currencySymbol}${parseFloat(entry.credit).toFixed(2)}` : '';
//         case 'companyName':
//           return entry.companyName || '';
//         default:
//           return entry[key] || '';
//       }
//     };

//     ledgerData.ledgerEntries.forEach((entry) => {
//       drawTableRow(entry);
//     });

//     const drawSummary = () => {
//       y -= lineHeight * 1.5;

//       const summaryHeight = 9 * lineHeight + 16;
//       if (y - summaryHeight < margins.bottom + 60) {
//         page.drawText('Continued on next page...', {
//           x: margins.left,
//           y: margins.bottom + 20,
//           size: fontSizes.footer,
//           font: regularFont,
//           color: colors.secondary,
//         });
//         pageCount += 1;
//         page = pdfDoc.addPage([595, 842]);
//         y = page.getHeight() - margins.top;
//         drawHeader();
//       }

//       page.drawText('Summary', {
//         x: margins.left,
//         y,
//         size: fontSizes.summaryTitle,
//         font: boldFont,
//         color: colors.primary,
//       });
//       y -= lineHeight;

//       const summaryItems = [
//         { label: 'Total Sales:', value: `${currencySymbol}${(ledgerData.summary.totalSales || 0).toFixed(2)}` },
//         { label: 'Total Purchases:', value: `${currencySymbol}${(ledgerData.summary.totalPurchases || 0).toFixed(2)}` },
//         { label: 'Payments Received:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsReceived || 0).toFixed(2)}` },
//         { label: 'Payments Made:', value: `${currencySymbol}${(ledgerData.summary.totalPaymentsMade || 0).toFixed(2)}` },
//         { label: 'Credit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalCreditNotes || 0).toFixed(2)}` },
//         { label: 'Debit Notes:', value: `${currencySymbol}${(ledgerData.summary.totalDebitNotes || 0).toFixed(2)}` },
//         { label: 'Interest Notes:', value: `${currencySymbol}${(ledgerData.summary.totalInterestNotes || 0).toFixed(2)}` },
//       ];

//       const maxLabelWidth = Math.max(...summaryItems.map((item) => boldFont.widthOfTextAtSize(item.label, fontSizes.summaryLabel)));
//       const maxValueWidth = Math.max(...summaryItems.map((item) => regularFont.widthOfTextAtSize(item.value, fontSizes.summaryLabel)));
//       const netValue = `${currencySymbol}${(ledgerData.summary.netBalance || 0).toFixed(2)} (${ledgerData.summary.balanceType || 'N/A'})`;
//       const netValueWidth = boldFont.widthOfTextAtSize(netValue, fontSizes.summaryLabel);
//       const summaryWidth = Math.min(
//         page.getWidth() - margins.left - margins.right,
//         maxLabelWidth + Math.max(maxValueWidth, netValueWidth) + 40
//       );

//       const valueStartX = margins.left + maxLabelWidth + 12;

//       page.drawRectangle({
//         x: margins.left,
//         y: y - summaryHeight + lineHeight,
//         width: summaryWidth,
//         height: summaryHeight - 2,
//         borderWidth: 0.5,
//         borderColor: colors.border,
//         color: colors.lightGray,
//       });

//       summaryItems.forEach((item) => {
//         page.drawText(item.label, {
//           x: margins.left + 6,
//           y: y - 8,
//           size: fontSizes.summaryLabel,
//           font: boldFont,
//           color: colors.secondary,
//         });
//         page.drawText(item.value, {
//           x: valueStartX,
//           y: y - 8,
//           size: fontSizes.summaryLabel,
//           font: regularFont,
//           color: colors.secondary,
//         });
//         y -= lineHeight;
//       });

//       const netBalance = (ledgerData.summary.netBalance || 0).toFixed(2);
//       const balanceType = ledgerData.summary.balanceType || 'N/A';
//       const balanceColor = balanceType === 'Receivable' ? colors.success : colors.danger;

//       page.drawText('Net Balance:', {
//         x: margins.left + 6,
//         y: y - 8,
//         size: fontSizes.summaryLabel,
//         font: boldFont,
//         color: colors.secondary,
//       });
//       page.drawText(netValue, {
//         x: valueStartX,
//         y: y - 8,
//         size: fontSizes.summaryLabel,
//         font: boldFont,
//         color: balanceColor,
//       });
//       y -= lineHeight;
//     };

//     drawSummary();

//     const drawFooter = () => {
//       const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${pageCount} of ${pageCount}`;
//       const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
//       page.drawText(footerText, {
//         x: (page.getWidth() - footerWidth) / 2,
//         y: margins.bottom - 10,
//         size: fontSizes.footer,
//         font: regularFont,
//         color: colors.secondary,
//       });
//     };

//     drawFooter();

//     const pages = pdfDoc.getPages();
//     pageCount = pages.length;
//     pages.forEach((p, index) => {
//       const footerText = `Generated on ${moment().format('DD/MM/YYYY hh:mm A')} • Page ${index + 1} of ${pageCount}`;
//       const footerWidth = regularFont.widthOfTextAtSize(footerText, fontSizes.footer);
//       p.drawText(footerText, {
//         x: (p.getWidth() - footerWidth) / 2,
//         y: margins.bottom - 10,
//         size: fontSizes.footer,
//         font: regularFont,
//         color: colors.secondary,
//       });
//     });

//     const pdfBytes = await pdfDoc.save();
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=${ledgerData.company.name.replace(/ /g, '_')}_Ledger_${moment().format('YYYYMMDD')}.pdf`
//     );
//     res.send(Buffer.from(pdfBytes));
//   } catch (error) {
//     console.error('PDF generation error:', error);
//     res.status(500).json({ message: 'Error generating PDF', error: error.message });
//   }
// };

// ─── Colour palette ────────────────────────────────────────────────
const C = {
  navy:       rgb(0.09, 0.19, 0.37),
  navyLight:  rgb(0.12, 0.29, 0.54),
  ink:        rgb(0.10, 0.10, 0.18),
  muted:      rgb(0.42, 0.42, 0.50),
  white:      rgb(1, 1, 1),
  rowAlt:     rgb(0.94, 0.96, 0.98),
  divider:    rgb(0.82, 0.85, 0.91),
  positive:   rgb(0.06, 0.54, 0.31),   // credit / receivable – green
  negative:   rgb(0.77, 0.10, 0.10),   // debit  / payable   – red
  summaryBg:  rgb(0.94, 0.96, 0.98),
  bannerSub:  rgb(0.66, 0.80, 1.00),
  periodTxt:  rgb(0.78, 0.85, 1.00),
};
 
// ─── Layout constants ───────────────────────────────────────────────
const PW = 595, PH = 842;           // A4
const ML = 28, MR = 28;
const MT = 20, MB = 36;
const CONTENT_W = PW - ML - MR;
 
// ─── Font sizes ─────────────────────────────────────────────────────
const FS = {
  company:   17,
  subLabel:   8,
  colHeader:  8,
  cell:       8,
  badge:      7,
  sumLabel:   9,
  sumVal:     9,
  netLabel:  11,
  netVal:    11,
  footer:     7,
};
 
const LINE_H   = 10;   // px per text line inside a cell
const COL_PAD  = 5;    // horizontal padding inside cells
const HDR_H    = 52;   // banner height
 
// ─── Helper: wrap text into lines ──────────────────────────────────
function wrapText(text, font, size, maxW) {
  const words = String(text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
 
// ─── Helper: truncate with ellipsis ────────────────────────────────
function truncate(text, font, size, maxW) {
  let s = String(text || '');
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  while (s.length > 0 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1);
  return s + '…';
}
 
// ───────────────────────────────────────────────────────────────────
const downloadCompanyLedgerPDF = async (req, res) => {
  try {
    const { companyId = 'all', startDate, endDate, month, year, type } = req.query;
 
    if (!startDate || !endDate)
      return res.status(400).json({ message: 'Both startDate and endDate are required' });
 
    // ── Fetch data (your existing function, unchanged) ──────────────
    const ledgerData = await prepareCompanyLedgerData(
      companyId, startDate, endDate, month, year, type, req.organizationId
    );
 
    if (!ledgerData?.ledgerEntries?.length)
      return res.status(404).json({ message: 'No ledger data found' });
 
    // ── PDF document setup ──────────────────────────────────────────
    const pdfDoc    = await PDFDocument.create();
    const regular   = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const boldObliq = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
 
    let page, curY;
 
    const newPage = () => {
      page = pdfDoc.addPage([PW, PH]);
      curY = PH - MT - HDR_H - 10;
    };
    newPage();
 
    // ── Column definitions ─────────────────────────────────────────
    // Single "Amount" + "Dr/Cr" badge — no separate Debit/Credit
    const isAll = companyId === 'all';
 
    const COLS = isAll
      ? [
          { key: 'companyName', label: 'Party / Company', w: 90,  align: 'left'   },
          { key: 'date',        label: 'Date',            w: 58,  align: 'left'   },
          { key: 'type',        label: 'Type',            w: 58,  align: 'left'   },
          { key: 'docNo',       label: 'Doc No.',         w: 52,  align: 'left'   },
          { key: 'description', label: 'Narration',       w: 114, align: 'left'   },
          { key: 'amount',      label: 'Amount (Rs.)',    w: 72,  align: 'right'  },
          { key: 'drCr',        label: 'Dr/Cr',           w: 30,  align: 'center' },
        ]
      : [
          { key: 'date',        label: 'Date',            w: 62,  align: 'left'   },
          { key: 'type',        label: 'Type',            w: 62,  align: 'left'   },
          { key: 'docNo',       label: 'Doc No.',         w: 56,  align: 'left'   },
          { key: 'description', label: 'Narration',       w: 176, align: 'left'   },
          { key: 'amount',      label: 'Amount (Rs.)',    w: 76,  align: 'right'  },
          { key: 'drCr',        label: 'Dr/Cr',           w: 32,  align: 'center' },
        ];
 
    const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);
    const TABLE_X = ML + (CONTENT_W - TABLE_W) / 2;
 
    // ── Draw banner header ─────────────────────────────────────────
    const drawHeader = () => {
      // Navy banner
      page.drawRectangle({ x: 0, y: PH - MT - HDR_H, width: PW, height: HDR_H + MT, color: C.navy });
      // Right accent strip
      page.drawRectangle({ x: PW - 7, y: PH - MT - HDR_H, width: 7, height: HDR_H + MT, color: C.navyLight });
 
      // Company name
      page.drawText(ledgerData.company.name || 'Company', {
        x: ML, y: PH - MT - 22, size: FS.company, font: bold, color: C.white,
      });
 
      // "COMPANY LEDGER" sub-label
      page.drawText('COMPANY LEDGER', {
        x: ML, y: PH - MT - 40, size: FS.subLabel, font: boldObliq, color: C.bannerSub,
      });
 
      // Period — right aligned
      const periodStr = `Period: ${moment(ledgerData.dateRange.start).format('DD MMM YYYY')} – ${moment(ledgerData.dateRange.end).format('DD MMM YYYY')}`;
      const pw2 = regular.widthOfTextAtSize(periodStr, FS.subLabel);
      page.drawText(periodStr, {
        x: PW - MR - 7 - pw2, y: PH - MT - 28, size: FS.subLabel, font: regular, color: C.periodTxt,
      });
 
      // GSTIN if available
      if (ledgerData.company.gstNumber) {
        const gStr = `GSTIN: ${ledgerData.company.gstNumber}`;
        const gw2  = regular.widthOfTextAtSize(gStr, FS.subLabel);
        page.drawText(gStr, {
          x: PW - MR - 7 - gw2, y: PH - MT - 42, size: FS.subLabel, font: regular, color: C.periodTxt,
        });
      }
    };
 
    // ── Draw table column header row ───────────────────────────────
    const drawTableHeader = () => {
      const HDR_ROW_H = 20;
      let cx = TABLE_X;
      COLS.forEach(col => {
        page.drawRectangle({ x: cx, y: curY - HDR_ROW_H, width: col.w, height: HDR_ROW_H, color: C.navyLight });
        const lw = bold.widthOfTextAtSize(col.label, FS.colHeader);
        const tx =
          col.align === 'right'  ? cx + col.w - COL_PAD - lw :
          col.align === 'center' ? cx + (col.w - lw) / 2 :
          cx + COL_PAD;
        page.drawText(col.label, { x: tx, y: curY - HDR_ROW_H + 7, size: FS.colHeader, font: bold, color: C.white });
        cx += col.w;
      });
      curY -= HDR_ROW_H;
    };
 
    // ── Resolve cell value ─────────────────────────────────────────
    const cellValue = (entry, key) => {
      switch (key) {
        case 'date':   return moment(entry.date).format('DD MMM YYYY');
        case 'amount': {
          const v = entry.debit != null && entry.debit !== '' ? entry.debit
                  : entry.credit != null && entry.credit !== '' ? entry.credit : null;
          return v !== null ? `Rs. ${parseFloat(v).toFixed(2)}` : '—';
        }
        case 'drCr':
          if (entry.debit  != null && entry.debit  !== '') return 'Dr';
          if (entry.credit != null && entry.credit !== '') return 'Cr';
          return '—';
        default: return String(entry[key] || '');
      }
    };
 
    // ── Draw a single data row ─────────────────────────────────────
    let rowIdx = 0;
 
    const drawRow = (entry) => {
      const descCol  = COLS.find(c => c.key === 'description');
      const descLines = descCol
        ? wrapText(cellValue(entry, 'description'), regular, FS.cell, descCol.w - COL_PAD * 2)
        : [''];
      const rowH = Math.max(18, descLines.length * LINE_H + 8);
      const drCr = cellValue(entry, 'drCr');
 
      // Page break
      if (curY - rowH < MB + 80) {
        page.drawText('/ continued on next page /', {
          x: TABLE_X + TABLE_W / 2 - 55, y: curY - 8,
          size: FS.footer, font: regular, color: C.muted,
        });
        newPage();
        drawHeader();
        drawTableHeader();
      }
 
      const bg = rowIdx % 2 === 1 ? C.rowAlt : C.white;
      let cx = TABLE_X;
 
      COLS.forEach(col => {
        // Cell background
        page.drawRectangle({
          x: cx, y: curY - rowH, width: col.w, height: rowH,
          color: bg, borderWidth: 0.4, borderColor: C.divider,
        });
 
        const val = cellValue(entry, col.key);
 
        if (col.key === 'drCr') {
          // Coloured badge
          const bColor = drCr === 'Dr' ? C.negative : drCr === 'Cr' ? C.positive : C.muted;
          const bW = 22, bH = 13;
          const bx = cx + (col.w - bW) / 2;
          const by = curY - rowH / 2 - bH / 2;
          page.drawRectangle({ x: bx, y: by, width: bW, height: bH, color: bColor });
          const tw = bold.widthOfTextAtSize(val, FS.badge);
          page.drawText(val, { x: bx + (bW - tw) / 2, y: by + 3, size: FS.badge, font: bold, color: C.white });
 
        } else if (col.key === 'description') {
          // Multi-line narration
          let ty = curY - 9;
          descLines.forEach(ln => {
            page.drawText(ln, { x: cx + COL_PAD, y: ty, size: FS.cell, font: regular, color: C.ink });
            ty -= LINE_H;
          });
 
        } else if (col.key === 'amount') {
          // Right-aligned, colour-coded
          const amtColor = drCr === 'Dr' ? C.negative : drCr === 'Cr' ? C.positive : C.ink;
          const aw = bold.widthOfTextAtSize(val, FS.cell);
          page.drawText(val, {
            x: cx + col.w - COL_PAD - aw,
            y: curY - rowH / 2 - 3,
            size: FS.cell, font: bold, color: amtColor,
          });
 
        } else {
          // Default: single line, truncated
          const txt = truncate(val, regular, FS.cell, col.w - COL_PAD * 2);
          const tw  = regular.widthOfTextAtSize(txt, FS.cell);
          const tx  =
            col.align === 'right'  ? cx + col.w - COL_PAD - tw :
            col.align === 'center' ? cx + (col.w - tw) / 2 :
            cx + COL_PAD;
          page.drawText(txt, { x: tx, y: curY - rowH / 2 - 3, size: FS.cell, font: regular, color: C.ink });
        }
 
        cx += col.w;
      });
 
      curY -= rowH;
      rowIdx++;
    };
 
    // ── Render all rows ────────────────────────────────────────────
    drawHeader();
    drawTableHeader();
    ledgerData.ledgerEntries.forEach(drawRow);
 
    // ── Summary section ────────────────────────────────────────────
    const drawSummary = () => {
      const s       = ledgerData.summary;
      const ITEM_H  = 28;
      const GAP     = 6;
      const ITEMS   = [
        ['Total Sales',          s.totalSales          || 0],
        ['Total Purchases',      s.totalPurchases       || 0],
        ['Payments Received',    s.totalPaymentsReceived|| 0],
        ['Payments Made',        s.totalPaymentsMade    || 0],
        ['Credit Notes',         s.totalCreditNotes     || 0],
        ['Debit Notes',          s.totalDebitNotes      || 0],
        ['Interest Notes',       s.totalInterestNotes   || 0],
      ];
      const ROWS    = Math.ceil(ITEMS.length / 2);
      const NET_H   = 32;
      const TOTAL_H = ROWS * (ITEM_H + GAP) + NET_H + 60;
 
      if (curY - TOTAL_H < MB) {
        newPage();
        drawHeader();
      }
 
      curY -= 18;
 
      // Section title with left accent bar
      page.drawRectangle({ x: ML, y: curY - 14, width: 3, height: 14, color: C.navyLight });
      page.drawText('Ledger Summary', { x: ML + 8, y: curY - 13, size: 11, font: bold, color: C.navy });
      curY -= 20;
 
      // Thin rule
      page.drawLine({ start: { x: ML, y: curY }, end: { x: ML + CONTENT_W, y: curY }, thickness: 0.8, color: C.navyLight });
      curY -= GAP;
 
      // Two-column grid
      const HALF_W = (CONTENT_W - GAP) / 2;
 
      ITEMS.forEach(([label, value], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ix  = ML + col * (HALF_W + GAP);
        const iy  = curY - row * (ITEM_H + GAP);
 
        page.drawRectangle({
          x: ix, y: iy - ITEM_H, width: HALF_W, height: ITEM_H,
          color: C.summaryBg, borderWidth: 0.5, borderColor: C.divider,
        });
        page.drawText(label, { x: ix + 8, y: iy - 10, size: FS.sumLabel, font: regular, color: C.muted });
 
        const valStr = `Rs. ${parseFloat(value).toFixed(2)}`;
        const vw     = bold.widthOfTextAtSize(valStr, FS.sumVal);
        page.drawText(valStr, { x: ix + HALF_W - 8 - vw, y: iy - 10, size: FS.sumVal, font: bold, color: C.ink });
 
        // Second line for label in tighter space
        page.drawText('', { x: ix + 8, y: iy - 22, size: 0, font: regular, color: C.muted });
      });
 
      curY -= ROWS * (ITEM_H + GAP) + GAP;
 
      // Net balance bar
      const netBalance  = parseFloat(s.netBalance || 0).toFixed(2);
      const balanceType = s.balanceType || 'N/A';
      const barColor    = balanceType === 'Receivable' ? C.positive : C.negative;
 
      page.drawRectangle({ x: ML, y: curY - NET_H, width: CONTENT_W, height: NET_H, color: barColor });
 
      page.drawText('Net Balance:', {
        x: ML + 12, y: curY - NET_H / 2 - 5, size: FS.netLabel, font: bold, color: C.white,
      });
 
      const netStr = `Rs. ${netBalance}  (${balanceType})`;
      const nw     = bold.widthOfTextAtSize(netStr, FS.netVal);
      page.drawText(netStr, {
        x: ML + CONTENT_W - 12 - nw, y: curY - NET_H / 2 - 5,
        size: FS.netVal, font: bold, color: C.white,
      });
 
      curY -= NET_H;
    };
 
    drawSummary();
 
    // ── Footer on every page (accurate page count) ──────────────────
    const pages      = pdfDoc.getPages();
    const totalPages = pages.length;
 
    pages.forEach((p, idx) => {
      // Rule above footer
      p.drawLine({
        start: { x: ML,      y: MB - 3 },
        end:   { x: PW - MR, y: MB - 3 },
        thickness: 0.5, color: C.divider,
      });
      p.drawText(`${ledgerData.company.name}  |  Company Ledger`, {
        x: ML, y: MB - 14, size: FS.footer, font: regular, color: C.muted,
      });
      const pg  = `Page ${idx + 1} of ${totalPages}`;
      const pgW = regular.widthOfTextAtSize(pg, FS.footer);
      p.drawText(pg, { x: PW - MR - pgW, y: MB - 14, size: FS.footer, font: regular, color: C.muted });
    });
 
    // ── Send PDF ────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const fname    = `${(ledgerData.company.name || 'Company').replace(/\s+/g, '_')}_Ledger_${moment().format('YYYYMMDD')}.pdf`;
 
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(Buffer.from(pdfBytes));
 
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Error generating PDF', error: err.message });
  }
};
 

// @desc    Prepare company ledger data
// @access  Private
const prepareCompanyLedgerData = async (companyId, startDate, endDate, month, year, type, organizationId) => {
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
    const companies = await Company.find({ organizationId });
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
          organizationId: organizationId,
          ...(Object.keys(dateFilter).length && { billDate: dateFilter })
        }),
        Purchase.find({
          supplierCompany: company._id,
          organizationId: organizationId,
          ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
        }),
        Transaction.find({
          company: company._id,
          organizationId: organizationId,
          ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
        }),
        CreditNote.find({
          company: company._id,
          organizationId: organizationId,
          ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
        }),
        DebitNote.find({
          supplierCompany: company._id,
          organizationId: organizationId,
          ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
        }),
        InterestNote.find({
          company: company._id,
          organizationId: organizationId,
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

    if (type && type !== 'all') {
      allEntries = allEntries.filter(entry =>
        type === 'Transaction'
          ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
          : entry.type === type
      );
    }

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
      organizationId: organizationId,
      ...(Object.keys(dateFilter).length && { billDate: dateFilter })
    }).sort({ billDate: 1 }),
    
    Purchase.find({
      supplierCompany: companyId,
      organizationId: organizationId,
      ...(Object.keys(dateFilter).length && { purchaseBillDate: dateFilter })
    }).sort({ purchaseBillDate: 1 }),

    Transaction.find({
      company: companyId,
      organizationId: organizationId,
      ...(Object.keys(dateFilter).length && { paymentDate: dateFilter })
    }).sort({ paymentDate: 1 }),

    CreditNote.find({
      company: companyId,
      organizationId: organizationId,
      ...(Object.keys(dateFilter).length && { creditNoteDate: dateFilter })
    }).sort({ creditNoteDate: 1 }),

    DebitNote.find({
      supplierCompany: companyId,
      organizationId: organizationId,
      ...(Object.keys(dateFilter).length && { debitNoteDate: dateFilter })
    }).sort({ debitNoteDate: 1 }),

    InterestNote.find({
      company: companyId,
      organizationId: organizationId,
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

  if (type && type !== 'all') {
    const filtered = ledgerEntries.filter(entry =>
      type === 'Transaction'
        ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
        : entry.type === type
    );
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
      ledgerEntries: filtered,
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
  }

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

// @desc    Get company bill summary for modal
// @route   GET /api/ledger/company-bills
// @access  Private/Admin
const getCompanyBillSummary = async (req, res) => {
  const { companyId, financialYear, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required.' });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    let billDateFilter = {};
    if (financialYear && financialYear !== 'all') {
      const fyParts = financialYear.split('-');
      const startYear = parseInt(fyParts[0], 10);
      const fyStart = new Date(startYear, 3, 1);
      fyStart.setHours(0, 0, 0, 0);
      const fyEnd = new Date(startYear + 1, 2, 31);
      fyEnd.setHours(23, 59, 59, 999);
      billDateFilter = { $gte: fyStart, $lte: fyEnd };
    } else if (startDate && endDate) {
      billDateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const [allBills, filteredBills] = await Promise.all([
      Bill.find({
        company: companyId,
        organizationId: req.organizationId,
      }).sort({ billDate: -1 }),
      Bill.find({
        company: companyId,
        organizationId: req.organizationId,
        ...(Object.keys(billDateFilter).length > 0 && { billDate: billDateFilter }),
      }).sort({ billDate: -1 }),
    ]);

    const billsWithStatus = allBills.map(bill => {
      const outstanding = bill.totalAmount - bill.totalPaidAmount;
      const now = new Date();
      let computedStatus = bill.status;
      if (computedStatus !== 'Cancelled') {
        if (outstanding <= 0) {
          computedStatus = 'Paid';
        } else if (bill.dueDate && new Date(bill.dueDate) < now) {
          computedStatus = 'Overdue';
        } else if (bill.totalPaidAmount > 0) {
          computedStatus = 'Partially Paid';
        } else {
          computedStatus = 'Pending';
        }
      }
      return {
        _id: bill._id,
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        totalAmount: bill.totalAmount,
        totalPaidAmount: bill.totalPaidAmount,
        outstanding: Math.max(0, outstanding),
        status: computedStatus,
        paymentRecords: bill.paymentRecords,
        challanNumber: bill.challanNumber,
        financialYear: bill.financialYear,
      };
    });

    const filteredBillsWithStatus = filteredBills.map(bill => {
      const outstanding = bill.totalAmount - bill.totalPaidAmount;
      const now = new Date();
      let computedStatus = bill.status;
      if (computedStatus !== 'Cancelled') {
        if (outstanding <= 0) {
          computedStatus = 'Paid';
        } else if (bill.dueDate && new Date(bill.dueDate) < now) {
          computedStatus = 'Overdue';
        } else if (bill.totalPaidAmount > 0) {
          computedStatus = 'Partially Paid';
        } else {
          computedStatus = 'Pending';
        }
      }
      return {
        _id: bill._id,
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        totalAmount: bill.totalAmount,
        totalPaidAmount: bill.totalPaidAmount,
        outstanding: Math.max(0, outstanding),
        status: computedStatus,
        paymentRecords: bill.paymentRecords,
        challanNumber: bill.challanNumber,
        financialYear: bill.financialYear,
      };
    });

    const totalBills = allBills.length;
    const paidBills = billsWithStatus.filter(b => b.status === 'Paid').length;
    const outstandingBills = billsWithStatus.filter(b => b.status === 'Pending' || b.status === 'Partially Paid').length;
    const overdueBills = billsWithStatus.filter(b => b.status === 'Overdue').length;
    const totalOutstandingAmount = billsWithStatus.reduce((sum, b) => sum + b.outstanding, 0);
    const totalReceivedAmount = billsWithStatus.reduce((sum, b) => sum + b.totalPaidAmount, 0);

    let lastBillDate = null;
    let lastPaymentDate = null;
    let totalPaymentDays = 0;
    let paymentCount = 0;

    billsWithStatus.forEach(bill => {
      if (!lastBillDate || new Date(bill.billDate) > new Date(lastBillDate)) {
        lastBillDate = bill.billDate;
      }
      (bill.paymentRecords || []).forEach(rec => {
        if (!lastPaymentDate || new Date(rec.paymentDate) > new Date(lastPaymentDate)) {
          lastPaymentDate = rec.paymentDate;
        }
        const daysDiff = Math.ceil((new Date(rec.paymentDate) - new Date(bill.billDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0) {
          totalPaymentDays += daysDiff;
          paymentCount++;
        }
      });
    });

    const availableFinancialYears = [...new Set(allBills.map(b => b.financialYear).filter(Boolean))].sort().reverse();

    const response = {
      company: {
        _id: company._id,
        name: company.name,
        gstNumber: company.gstNumber,
        companyType: company.companyType || '',
      },
      summary: {
        totalBills,
        paidBills,
        outstandingBills,
        overdueBills,
        totalOutstandingAmount,
        totalReceivedAmount,
        lastBillDate,
        lastPaymentDate,
        averagePaymentDays: paymentCount > 0 ? Math.round(totalPaymentDays / paymentCount) : 0,
      },
      bills: filteredBillsWithStatus,
      availableFinancialYears,
      totalFilteredBills: filteredBillsWithStatus.length,
    };

    res.json(response);
  } catch (error) {
    log(`Error getting company bill summary: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching company bill summary.' });
  }
};

// @desc    Get outstanding bills for a company with per-bill due days
// @route   GET /api/ledger/company-outstanding
// @access  Private/Admin
const getCompanyOutstanding = async (req, res) => {
  const { companyId, financialYear, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required.' });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    let billDateFilter = {};
    if (financialYear && financialYear !== 'all') {
      const fyParts = financialYear.split('-');
      const startYear = parseInt(fyParts[0], 10);
      const fyStart = new Date(startYear, 3, 1);
      fyStart.setHours(0, 0, 0, 0);
      const fyEnd = new Date(startYear + 1, 2, 31);
      fyEnd.setHours(23, 59, 59, 999);
      billDateFilter = { $gte: fyStart, $lte: fyEnd };
    } else if (startDate && endDate) {
      billDateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const bills = await Bill.find({
      company: companyId,
      organizationId: req.organizationId,
      ...(Object.keys(billDateFilter).length > 0 && { billDate: billDateFilter }),
    }).sort({ billDate: -1 });

    const now = new Date();
    const nowTime = now.getTime();
    const DAY_MS = 1000 * 60 * 60 * 24;

    const outstandingBills = bills
      .map((bill) => {
        const outstanding = bill.totalAmount - bill.totalPaidAmount;
        if (outstanding <= 0 || bill.status === 'Cancelled') return null;

        let status = bill.status;
        if (bill.dueDate && new Date(bill.dueDate) < now) {
          status = 'Overdue';
        } else if (bill.totalPaidAmount > 0) {
          status = 'Partially Paid';
        } else {
          status = 'Pending';
        }

        let dueDays = 0;
        if (bill.dueDate) {
          const dueTime = new Date(bill.dueDate).getTime();
          dueDays = Math.ceil((dueTime - nowTime) / DAY_MS);
        }

        return {
          _id: bill._id,
          billNumber: bill.billNumber,
          billDate: bill.billDate,
          dueDate: bill.dueDate,
          challanNumber: bill.challanNumber,
          totalAmount: bill.totalAmount,
          totalPaidAmount: bill.totalPaidAmount,
          outstanding: Math.round(outstanding * 100) / 100,
          status,
          dueDays,
        };
      })
      .filter(Boolean);

    const totalBillAmount = outstandingBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalOutstanding = outstandingBills.reduce((sum, b) => sum + b.outstanding, 0);

    res.json({
      company: {
        _id: company._id,
        name: company.name,
        gstNumber: company.gstNumber,
        companyType: company.companyType || '',
      },
      summary: {
        totalBills: outstandingBills.length,
        overdueBills: outstandingBills.filter((b) => b.status === 'Overdue').length,
        pendingBills: outstandingBills.filter((b) => b.status === 'Pending').length,
        partiallyPaidBills: outstandingBills.filter((b) => b.status === 'Partially Paid').length,
        totalBillAmount: Math.round(totalBillAmount * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      },
      bills: outstandingBills,
    });
  } catch (error) {
    log(`Error getting company outstanding: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching company outstanding.' });
  }
};

// @desc    Get available financial years for a company
// @route   GET /api/ledger/company-financial-years
// @access  Private/Admin
const getCompanyFinancialYears = async (req, res) => {
  const { companyId } = req.query;

  try {
    const filter = { organizationId: req.organizationId };
    const purchaseFilter = { organizationId: req.organizationId };
    if (companyId && companyId !== 'all') {
      filter.company = companyId;
      purchaseFilter.supplierCompany = companyId;
    }

    const financialYears = await Bill.distinct('financialYear', filter);
    const purchaseFYs = await Purchase.distinct('financialYear', purchaseFilter);

    const allFYs = [...new Set([...financialYears, ...purchaseFYs])].filter(Boolean).sort().reverse();

    res.json({ financialYears: allFYs });
  } catch (error) {
    log(`Error getting financial years: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching financial years.' });
  }
};

module.exports = {
  getCompanyLedger,
  getCompaniesLedgerSummary,
  downloadCompanyLedgerExcel,
  downloadCompanyLedgerPDF,
  getCompanyBillSummary,
  getCompanyOutstanding,
  getCompanyFinancialYears
};
