// const Purchase = require('../models/Purchase');
// const Company = require('../models/Company');
// const { log } = require('../middleware/logger');
// const exceljs = require('exceljs');
// const { PDFDocument, rgb, StandardFonts, PageSizes } = require('pdf-lib');
// const fsPromises = require('fs').promises;
// const path = require('path');
// const fontkit = require('@pdf-lib/fontkit');

// // @desc    Create a new purchase record
// // @route   POST /api/purchases
// // @access  Private/Admin
// const createPurchase = async (req, res) => {
//   try {
//     const {
//       purchaseType,
//       supplierCompanyId,
//       purchaseBillNumber,
//       purchaseBillDate,

//       challanNumber,
//       challanDate,
//       denier,
//       grade,
//       totalGrossWeight,
//       tareWeight = 0,
//       ratePerUnit,
//       carteageFridgeAmount = 0,

//       productType,
//       productDescription,

//       amount,
//       cgstPercentage = 2.5,
//       sgstPercentage = 2.5,

//       notes,
//     } = req.body;

//     if (!supplierCompanyId) {
//       return res.status(400).json({ message: 'Supplier company is required.' });
//     }

//     const supplier = await Company.findById(supplierCompanyId);
//     if (!supplier) {
//       return res.status(404).json({ message: 'Supplier not found.' });
//     }

//     const purchaseData = {
//       purchaseType,
//       supplierCompany: supplierCompanyId,
//       supplierDetailsSnapshot: {
//         name: supplier.name,
//         address: supplier.address,
//         gstNumber: supplier.gstNumber,
//       },
//       purchaseBillNumber,
//       purchaseBillDate,
//       cgstPercentage: parseFloat(cgstPercentage),
//       sgstPercentage: parseFloat(sgstPercentage),
//       notes,
//       createdBy: req.user._id,
//       organizationId: req.organizationId,
//     };

//     /* ===== YARN ===== */
//     if (purchaseType === 'YARN') {
//       const netWeight = parseFloat((totalGrossWeight - tareWeight).toFixed(3));
//       const subTotal = parseFloat((netWeight * ratePerUnit).toFixed(2));
//       const baseForGst = subTotal + parseFloat(carteageFridgeAmount || 0);
//       const cgst = parseFloat(((baseForGst * parseFloat(cgstPercentage)) / 100).toFixed(2));
//       const sgst = parseFloat(((baseForGst * parseFloat(sgstPercentage)) / 100).toFixed(2));
//       const amount = Math.round(baseForGst + cgst + sgst);

//       Object.assign(purchaseData, {
//         challanNumber,
//         challanDate,
//         denier,
//         grade,
//         totalGrossWeight,
//         tareWeight,
//         netWeight,
//         ratePerUnit,
//         subTotal,
//         carteageFridgeAmount: parseFloat(carteageFridgeAmount || 0),
//         cgst,
//         sgst,
//         amount,
//       });
//     }

//     /* ===== OTHER ===== */
//     if (purchaseType === 'OTHER') {
//       Object.assign(purchaseData, {
//         productType,
//         productDescription,
//         amount: parseFloat(amount),
//       });
//     }

//     const purchase = await Purchase.create(purchaseData);
//     res.status(201).json(purchase);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Get all purchase records
// // @route   GET /api/purchases
// // @access  Private/Admin
// const getPurchases = async (req, res) => {
//   const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
//   if (paymentStatus) query.paymentStatus = paymentStatus;
//   if (purchaseType) query.purchaseType = purchaseType;

//   if (startDate && endDate) {
//     query.purchaseBillDate = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
//   } else if (startDate) {
//     query.purchaseBillDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
//   }

//   try {
//     const purchases = await Purchase.find(query)
//       .populate('supplierCompany', 'name')
//       .populate('createdBy', 'username email')
//       .sort({ purchaseBillDate: -1, createdAt: -1 });

//     log(`Fetched purchase records with query ${JSON.stringify(query)}`, 'info');
//     res.json(purchases);
//   } catch (error) {
//     log(`Error fetching purchase records: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching purchase records.' });
//   }
// };

// // @desc    Get a single purchase record by ID
// // @route   GET /api/purchases/:id
// // @access  Private/Admin
// const getPurchaseById = async (req, res) => {
//   try {
//     const purchase = await Purchase.findOne({ _id: req.params.id, organizationId: req.organizationId })
//       .populate('supplierCompany', 'name address gstNumber mobileNumber')
//       .populate('createdBy', 'username email');

//     if (!purchase) {
//       log(`Purchase record not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Purchase record not found' });
//     }
//     log(`Fetched purchase record by ID: Bill# ${purchase.purchaseBillNumber}`, 'info');
//     res.json(purchase);
//   } catch (error) {
//     log(`Error fetching purchase record ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching purchase record.' });
//   }
// };

// // @desc    Update a purchase record
// // @route   PUT /api/purchases/:id
// // @access  Private/Admin
// const updatePurchase = async (req, res) => {
//   try {
//     const purchase = await Purchase.findById(req.params.id);
//     if (!purchase) {
//       return res.status(404).json({ message: 'Purchase not found' });
//     }

//     if (purchase.organizationId && String(purchase.organizationId) !== String(req.organizationId)) {
//       return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
//     }

//     const {
//       supplierCompanyId,
//       purchaseBillNumber,
//       purchaseBillDate,

//       challanNumber,
//       challanDate,
//       denier,
//       grade,
//       totalGrossWeight,
//       tareWeight,
//       ratePerUnit,
//       carteageFridgeAmount,

//       productType,
//       productDescription,

//       amount,
//       cgstPercentage,
//       sgstPercentage,

//       notes,
//     } = req.body;

//     /* ======================
//        SUPPLIER UPDATE
//     ====================== */
//     if (supplierCompanyId) {
//       const supplier = await Company.findById(supplierCompanyId);
//       if (!supplier) {
//         return res.status(404).json({ message: 'Supplier not found' });
//       }
//       purchase.supplierCompany = supplierCompanyId;
//       purchase.supplierDetailsSnapshot = {
//         name: supplier.name,
//         address: supplier.address,
//         gstNumber: supplier.gstNumber,
//       };
//     }

//     if (purchaseBillNumber !== undefined) purchase.purchaseBillNumber = purchaseBillNumber;
//     if (purchaseBillDate !== undefined) purchase.purchaseBillDate = purchaseBillDate;
//     if (notes !== undefined) purchase.notes = notes;

//     if (cgstPercentage !== undefined) purchase.cgstPercentage = parseFloat(cgstPercentage);
//     if (sgstPercentage !== undefined) purchase.sgstPercentage = parseFloat(sgstPercentage);

//     /* ======================
//        YARN UPDATE
//     ====================== */
//     if (purchase.purchaseType === 'YARN') {
//       if (challanNumber !== undefined) purchase.challanNumber = challanNumber;
//       if (challanDate !== undefined) purchase.challanDate = challanDate;
//       if (denier !== undefined) purchase.denier = denier;
//       if (grade !== undefined) purchase.grade = grade;

//       let recalc = false;

//       if (totalGrossWeight !== undefined) {
//         purchase.totalGrossWeight = parseFloat(totalGrossWeight);
//         recalc = true;
//       }

//       if (tareWeight !== undefined) {
//         purchase.tareWeight = parseFloat(tareWeight);
//         recalc = true;
//       }

//       if (ratePerUnit !== undefined) {
//         purchase.ratePerUnit = parseFloat(ratePerUnit);
//         recalc = true;
//       }

//       if (carteageFridgeAmount !== undefined) {
//         purchase.carteageFridgeAmount = parseFloat(carteageFridgeAmount || 0);
//         recalc = true;
//       }

//       if (recalc) {
//         purchase.netWeight = parseFloat(
//           (purchase.totalGrossWeight - purchase.tareWeight).toFixed(3)
//         );
//         purchase.subTotal = parseFloat(
//           (purchase.netWeight * purchase.ratePerUnit).toFixed(2)
//         );

//         const baseForGst = purchase.subTotal + purchase.carteageFridgeAmount;
//         purchase.cgst = parseFloat(
//           ((baseForGst * purchase.cgstPercentage) / 100).toFixed(2)
//         );
//         purchase.sgst = parseFloat(
//           ((baseForGst * purchase.sgstPercentage) / 100).toFixed(2)
//         );
//       }

//       purchase.amount = Math.round(
//         purchase.subTotal + purchase.carteageFridgeAmount + purchase.cgst + purchase.sgst
//       );
//     }

//     /* ======================
//        OTHER UPDATE
//     ====================== */
//     if (purchase.purchaseType === 'OTHER') {
//       if (productType !== undefined) purchase.productType = productType;
//       if (productDescription !== undefined) purchase.productDescription = productDescription;

//       if (amount !== undefined) {
//         purchase.amount = parseFloat(amount);
//       }
//     }

//     const updatedPurchase = await purchase.save();
//     res.json(updatedPurchase);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // @desc    Delete a purchase record
// // @route   DELETE /api/purchases/:id
// // @access  Private/Admin
// const deletePurchase = async (req, res) => {
//   try {
//     const purchase = await Purchase.findById(req.params.id);
//     if (!purchase) {
//       log(`Purchase deletion failed: Not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Purchase record not found' });
//     }

//     if (purchase.organizationId && String(purchase.organizationId) !== String(req.organizationId)) {
//       return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
//     }

//     await purchase.deleteOne();
//     log(`Purchase record deleted: Bill# ${purchase.purchaseBillNumber}`, 'info');
//     res.json({ message: 'Purchase record removed successfully.' });
//   } catch (error) {
//     log(`Error deleting purchase ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while deleting purchase record.' });
//   }
// };

// // @desc    Download purchases as Excel
// // @route   GET /api/purchases/download/excel
// // @access  Private/Admin
// const downloadPurchasesExcel = async (req, res) => {
//   const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
//   if (paymentStatus) query.paymentStatus = paymentStatus;
//   if (purchaseType) query.purchaseType = purchaseType;

//   if (startDate && endDate) {
//     query.purchaseBillDate = { 
//       $gte: new Date(startDate), 
//       $lte: new Date(new Date(endDate).setHours(23,59,59,999)) 
//     };
//   } else if (startDate) {
//     query.purchaseBillDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
//   }

//   try {
//     const purchases = await Purchase.find(query)
//       .populate('supplierCompany', 'name')
//       .sort({ purchaseBillDate: 1, purchaseBillNumber: 1 });

//     if (!purchases || purchases.length === 0) {
//       return res.status(404).json({ message: 'No purchases found matching the criteria.' });
//     }

//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Purchases');

//     const hasYarn = purchases.some(p => p.purchaseType === 'YARN');
//     const hasOther = purchases.some(p => p.purchaseType === 'OTHER');

//     if (hasYarn && hasOther) {
//       worksheet.columns = [
//         { header: 'Type', key: 'type', width: 10 },
//         { header: 'Bill No.', key: 'billNumber', width: 15 },
//         { header: 'Date', key: 'billDate', width: 12 },
//         { header: 'Supplier', key: 'supplier', width: 30 },
//         { header: 'Product', key: 'product', width: 20 },
//         { header: 'Sub Total / Base', key: 'subTotal', width: 14 },
//         { header: 'CGST', key: 'cgst', width: 10 },
//         { header: 'SGST', key: 'sgst', width: 10 },
//         { header: 'Total', key: 'amount', width: 14 },
//         { header: 'Status', key: 'status', width: 12 }
//       ];
//     } else if (hasYarn) {
//       worksheet.columns = [
//         { header: 'Bill No.', key: 'billNumber', width: 15 },
//         { header: 'Date', key: 'billDate', width: 12 },
//         { header: 'Supplier', key: 'supplier', width: 30 },
//         { header: 'Sub Total', key: 'subTotal', width: 14 },
//         { header: 'CGST', key: 'cgst', width: 10 },
//         { header: 'SGST', key: 'sgst', width: 10 },
//         { header: 'Total', key: 'amount', width: 14 },
//         { header: 'Status', key: 'status', width: 12 }
//       ];
//     } else {
//       worksheet.columns = [
//         { header: 'Bill No.', key: 'billNumber', width: 15 },
//         { header: 'Date', key: 'billDate', width: 12 },
//         { header: 'Supplier', key: 'supplier', width: 30 },
//         { header: 'Base Amount', key: 'subTotal', width: 14 },
//         { header: 'CGST', key: 'cgst', width: 10 },
//         { header: 'SGST', key: 'sgst', width: 10 },
//         { header: 'Total', key: 'amount', width: 14 },
//         { header: 'Status', key: 'status', width: 12 }
//       ];
//     }

//     purchases.forEach(purchase => {
//       const supplierName =
//         purchase.supplierCompany?.name ||
//         purchase.supplierDetailsSnapshot?.name ||
//         'N/A';

//       worksheet.addRow({
//         type: purchase.purchaseType,
//         billNumber: purchase.purchaseBillNumber,
//         billDate: purchase.purchaseBillDate.toLocaleDateString('en-IN'),
//         supplier: supplierName,
//         product: purchase.productType || '-',
//         subTotal:
//           purchase.purchaseType === 'YARN'
//             ? purchase.subTotal
//             : (purchase.amount - purchase.cgst - purchase.sgst),
//         cgst: purchase.cgst,
//         sgst: purchase.sgst,
//         amount: purchase.amount,
//         status: purchase.paymentStatus
//       });
//     });

//     worksheet.addRow({});
//     const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
//     const summaryRow = worksheet.addRow({
//       billNumber: 'TOTAL:',
//       amount: totalAmount
//     });
//     summaryRow.font = { bold: true };

//     worksheet.getRow(1).font = { bold: true };

//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     );

//     let fileName = 'Purchases';
//     if (purchaseType) fileName += `_${purchaseType}`;
//     if (startDate && endDate) fileName += `_${startDate}_to_${endDate}`;
//     fileName += '.xlsx';

//     res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
//     await workbook.xlsx.write(res);
//     res.end();

//   } catch (error) {
//     log(`Error generating Excel report: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while generating Excel report.' });
//   }
// };

// // @desc    Download purchases as PDF
// // @route   GET /api/purchases/download/pdf
// // @access  Private/Admin
// // @desc    Download purchases as PDF
// // @route   GET /api/purchases/download/pdf
// // @access  Private/Admin
// const downloadPurchasesPdf = async (req, res) => {
//   const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
//   if (paymentStatus) query.paymentStatus = paymentStatus;
//   if (purchaseType) query.purchaseType = purchaseType;

//   if (startDate && endDate) {
//     query.purchaseBillDate = { 
//       $gte: new Date(startDate), 
//       $lte: new Date(new Date(endDate).setHours(23,59,59,999)) 
//     };
//   } else if (startDate) {
//     query.purchaseBillDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
//   }

//   try {
//     const purchases = await Purchase.find(query)
//       .populate('supplierCompany', 'name')
//       .sort({ purchaseBillDate: 1, purchaseBillNumber: 1 });

//     if (!purchases || purchases.length === 0) {
//       return res.status(404).json({ message: 'No purchases found matching the criteria.' });
//     }

//     const pdfDoc = await PDFDocument.create();
//     pdfDoc.registerFontkit(fontkit);

//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     let page = pdfDoc.addPage(PageSizes.A4);
//     const { width, height } = page.getSize();
//     const margin = 40;

//     const drawText = (
//       text,
//       x,
//       y,
//       size = 10,
//       isBold = false,
//       maxWidth = width - margin * 2,
//       align = 'left'
//     ) => {
//       const currentFont = isBold ? boldFont : font;
//       const textWidth = currentFont.widthOfTextAtSize(text, size);
//       let finalX = x;

//       if (align === 'center' && maxWidth) {
//         finalX = x + (maxWidth - textWidth) / 2;
//       } else if (align === 'right' && maxWidth) {
//         finalX = x + (maxWidth - textWidth);
//       }

//       page.drawText(text, {
//         x: finalX,
//         y,
//         size,
//         font: currentFont,
//         maxWidth: maxWidth || undefined,
//       });

//       return textWidth;
//     };

//     let y = height - margin;

//     /* ======================
//        TITLE
//     ====================== */
//     let reportTitle = 'PURCHASES REPORT';
//     if (purchaseType) reportTitle += ` - ${purchaseType}`;
//     if (startDate && endDate) {
//       reportTitle += ` (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`;
//     }

//     drawText(reportTitle, margin, y, 16, true, width - margin * 2, 'center');
//     y -= 30;

//     /* ======================
//        SUMMARY
//     ====================== */
//     const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
//     drawText(`Total Records: ${purchases.length}`, margin, y, 12, true);
//     drawText(
//       `Grand Total: Rs. ${totalAmount.toLocaleString('en-IN')}`,
//       width - margin - 180,
//       y,
//       12,
//       true
//     );
//     y -= 30;

//     /* ======================
//        PURCHASE LIST
//     ====================== */
//     for (const purchase of purchases) {
//       if (y < margin + 180) {
//         page = pdfDoc.addPage(PageSizes.A4);
//         y = height - margin;
//       }

//       const supplierName =
//         purchase.supplierCompany?.name ||
//         purchase.supplierDetailsSnapshot?.name ||
//         purchase.manualCompanyName ||
//         'N/A';

//       /* Header */
//       drawText(`Bill: ${purchase.purchaseBillNumber}`, margin, y, 11, true);
//       drawText(
//         `Date: ${purchase.purchaseBillDate.toLocaleDateString('en-IN')}`,
//         margin + 160,
//         y,
//         11
//       );
//       drawText(
//         `Rs. ${purchase.amount.toLocaleString('en-IN')}`,
//         width - margin - 120,
//         y,
//         11,
//         true
//       );
//       y -= 18;

//       drawText(`Supplier: ${supplierName}`, margin, y, 10);
//       drawText(`Type: ${purchase.purchaseType}`, width - margin - 160, y, 10);
//       y -= 15;

//       /* ======================
//          TYPE-SPECIFIC DETAILS
//       ====================== */
//       if (purchase.purchaseType === 'YARN') {
//         if (purchase.challanNumber) {
//           drawText(`Challan: ${purchase.challanNumber}`, margin + 20, y, 9);
//           y -= 13;
//         }
//         if (purchase.denier) {
//           drawText(`Denier: ${purchase.denier}`, margin + 20, y, 9);
//           y -= 13;
//         }
//         if (purchase.grade) {
//           drawText(`Grade: ${purchase.grade}`, margin + 20, y, 9);
//           y -= 13;
//         }

//         drawText(
//           `Weights: ${purchase.totalGrossWeight} kg (gross) - ${purchase.tareWeight} kg (tare) = ${purchase.netWeight} kg (net)`,
//           margin + 20,
//           y,
//           9
//         );
//         y -= 13;

//         drawText(
//           `Rate: Rs. ${purchase.ratePerUnit}/kg`,
//           margin + 20,
//           y,
//           9
//         );
//         y -= 13;

//         /* GST BREAKUP (YARN) */
//         drawText(`Sub Total: Rs. ${purchase.subTotal}`, margin + 20, y, 9);
//         y -= 13;
//       } else {
//         drawText(`Product: ${purchase.productType || 'N/A'}`, margin + 20, y, 9);
//         y -= 13;

//         if (purchase.productDescription) {
//           drawText(
//             `Description: ${purchase.productDescription}`,
//             margin + 20,
//             y,
//             9
//           );
//           y -= 13;
//         }

//         /* GST BREAKUP (OTHER) */
//         const baseAmount = purchase.amount - purchase.cgst - purchase.sgst;
//         drawText(`Base Amount: Rs. ${baseAmount}`, margin + 20, y, 9);
//         y -= 13;
//       }

//       /* COMMON GST */
//       drawText(`CGST: Rs. ${purchase.cgst}`, margin + 20, y, 9);
//       y -= 13;

//       drawText(`SGST: Rs. ${purchase.sgst}`, margin + 20, y, 9);
//       y -= 13;

//       drawText(`Total Amount: Rs. ${purchase.amount}`, margin + 20, y, 10, true);
//       y -= 18;

//       drawText(`Status: ${purchase.paymentStatus}`, margin + 20, y, 9);
//       y -= 18;

//       /* Separator */
//       page.drawLine({
//         start: { x: margin, y },
//         end: { x: width - margin, y },
//         thickness: 0.5,
//         color: rgb(0.7, 0.7, 0.7),
//       });
//       y -= 15;
//     }

//     const pdfBytes = await pdfDoc.save();

//     res.setHeader('Content-Type', 'application/pdf');

//     let fileName = 'Purchases';
//     if (purchaseType) fileName += `_${purchaseType}`;
//     if (startDate && endDate) fileName += `_${startDate}_to_${endDate}`;
//     fileName += '.pdf';

//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
//     res.send(Buffer.from(pdfBytes));

//   } catch (error) {
//     log(`Error generating PDF report: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while generating PDF report.' });
//   }
// };

// module.exports = {
//   createPurchase,
//   getPurchases,
//   getPurchaseById,
//   updatePurchase,
//   deletePurchase,
//   downloadPurchasesExcel,
//   downloadPurchasesPdf
// };


const Purchase = require('../models/Purchase');
const Company = require('../models/Company');
const { log } = require('../middleware/logger');
const exceljs = require('exceljs');
const { PDFDocument, rgb, StandardFonts, PageSizes } = require('pdf-lib');
const fsPromises = require('fs').promises;
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');

// @desc    Create a new purchase record
// @route   POST /api/purchases
// @access  Private/Admin
const createPurchase = async (req, res) => {
  try {
    const {
      purchaseType,
      supplierCompanyId,
      purchaseBillNumber,
      purchaseBillDate,

      challanNumber,
      challanDate,
      denier,
      grade,
      totalGrossWeight,
      tareWeight = 0,
      ratePerUnit,
      carteageFridgeAmount = 0,

      productType,
      productDescription,

      amount,
      cgstPercentage = 2.5,
      sgstPercentage = 2.5,

      notes,
    } = req.body;

    if (!supplierCompanyId) {
      return res.status(400).json({ message: 'Supplier company is required.' });
    }

    const supplier = await Company.findById(supplierCompanyId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const purchaseData = {
      purchaseType,
      supplierCompany: supplierCompanyId,
      supplierDetailsSnapshot: {
        name: supplier.name,
        address: supplier.address,
        gstNumber: supplier.gstNumber,
      },
      purchaseBillNumber,
      purchaseBillDate,
      cgstPercentage: parseFloat(cgstPercentage),
      sgstPercentage: parseFloat(sgstPercentage),
      notes,
      createdBy: req.user._id,
      organizationId: req.organizationId,
    };

    /* ===== YARN ===== */
    if (purchaseType === 'YARN') {
      const netWeight = parseFloat((totalGrossWeight - tareWeight).toFixed(3));
      const subTotal = parseFloat((netWeight * ratePerUnit).toFixed(2));
      const baseForGst = subTotal + parseFloat(carteageFridgeAmount || 0);
      const cgst = parseFloat(((baseForGst * parseFloat(cgstPercentage)) / 100).toFixed(2));
      const sgst = parseFloat(((baseForGst * parseFloat(sgstPercentage)) / 100).toFixed(2));
      const amount = Math.round(baseForGst + cgst + sgst);

      Object.assign(purchaseData, {
        challanNumber,
        challanDate,
        denier,
        grade,
        totalGrossWeight,
        tareWeight,
        netWeight,
        ratePerUnit,
        subTotal,
        carteageFridgeAmount: parseFloat(carteageFridgeAmount || 0),
        cgst,
        sgst,
        amount,
      });
    }

    /* ===== OTHER ===== */
    if (purchaseType === 'OTHER') {
      const baseAmount = parseFloat(amount);
      const cgst = parseFloat(((baseAmount * parseFloat(cgstPercentage)) / 100).toFixed(2));
      const sgst = parseFloat(((baseAmount * parseFloat(sgstPercentage)) / 100).toFixed(2));
      const finalAmount = Math.round(baseAmount + cgst + sgst);

      Object.assign(purchaseData, {
        productType,
        productDescription,
        cgst,
        sgst,
        amount: finalAmount,
      });
    }

    const purchase = await Purchase.create(purchaseData);
    res.status(201).json(purchase);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all purchase records
// @route   GET /api/purchases
// @access  Private/Admin
const getPurchases = async (req, res) => {
  const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
  const query = { organizationId: req.organizationId };

  if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (purchaseType) query.purchaseType = purchaseType;

  if (startDate && endDate) {
    query.purchaseBillDate = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
  } else if (startDate) {
    query.purchaseBillDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
  }

  try {
    const purchases = await Purchase.find(query)
      .populate('supplierCompany', 'name')
      .populate('createdBy', 'username email')
      .sort({ purchaseBillDate: -1, createdAt: -1 });

    log(`Fetched purchase records with query ${JSON.stringify(query)}`, 'info');
    res.json(purchases);
  } catch (error) {
    log(`Error fetching purchase records: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching purchase records.' });
  }
};

// @desc    Get a single purchase record by ID
// @route   GET /api/purchases/:id
// @access  Private/Admin
const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('supplierCompany', 'name address gstNumber mobileNumber')
      .populate('createdBy', 'username email');

    if (!purchase) {
      log(`Purchase record not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Purchase record not found' });
    }
    log(`Fetched purchase record by ID: Bill# ${purchase.purchaseBillNumber}`, 'info');
    res.json(purchase);
  } catch (error) {
    log(`Error fetching purchase record ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching purchase record.' });
  }
};

// @desc    Update a purchase record
// @route   PUT /api/purchases/:id
// @access  Private/Admin
const updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.organizationId && String(purchase.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    const {
      supplierCompanyId,
      purchaseBillNumber,
      purchaseBillDate,

      challanNumber,
      challanDate,
      denier,
      grade,
      totalGrossWeight,
      tareWeight,
      ratePerUnit,
      carteageFridgeAmount,

      productType,
      productDescription,

      amount,
      cgstPercentage,
      sgstPercentage,

      notes,
    } = req.body;

    /* ======================
       SUPPLIER UPDATE
    ====================== */
    if (supplierCompanyId) {
      const supplier = await Company.findById(supplierCompanyId);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      purchase.supplierCompany = supplierCompanyId;
      purchase.supplierDetailsSnapshot = {
        name: supplier.name,
        address: supplier.address,
        gstNumber: supplier.gstNumber,
      };
    }

    if (purchaseBillNumber !== undefined) purchase.purchaseBillNumber = purchaseBillNumber;
    if (purchaseBillDate !== undefined) purchase.purchaseBillDate = purchaseBillDate;
    if (notes !== undefined) purchase.notes = notes;

    if (cgstPercentage !== undefined) purchase.cgstPercentage = parseFloat(cgstPercentage);
    if (sgstPercentage !== undefined) purchase.sgstPercentage = parseFloat(sgstPercentage);

    /* ======================
       YARN UPDATE
    ====================== */
    if (purchase.purchaseType === 'YARN') {
      if (challanNumber !== undefined) purchase.challanNumber = challanNumber;
      if (challanDate !== undefined) purchase.challanDate = challanDate;
      if (denier !== undefined) purchase.denier = denier;
      if (grade !== undefined) purchase.grade = grade;

      let recalc = false;

      if (totalGrossWeight !== undefined) {
        purchase.totalGrossWeight = parseFloat(totalGrossWeight);
        recalc = true;
      }

      if (tareWeight !== undefined) {
        purchase.tareWeight = parseFloat(tareWeight);
        recalc = true;
      }

      if (ratePerUnit !== undefined) {
        purchase.ratePerUnit = parseFloat(ratePerUnit);
        recalc = true;
      }

      if (carteageFridgeAmount !== undefined) {
        purchase.carteageFridgeAmount = parseFloat(carteageFridgeAmount || 0);
        recalc = true;
      }

      if (recalc) {
        purchase.netWeight = parseFloat(
          (purchase.totalGrossWeight - purchase.tareWeight).toFixed(3)
        );
        purchase.subTotal = parseFloat(
          (purchase.netWeight * purchase.ratePerUnit).toFixed(2)
        );

        const baseForGst = purchase.subTotal + purchase.carteageFridgeAmount;
        purchase.cgst = parseFloat(
          ((baseForGst * purchase.cgstPercentage) / 100).toFixed(2)
        );
        purchase.sgst = parseFloat(
          ((baseForGst * purchase.sgstPercentage) / 100).toFixed(2)
        );
      }

      purchase.amount = Math.round(
        purchase.subTotal + purchase.carteageFridgeAmount + purchase.cgst + purchase.sgst
      );
    }

    /* ======================
       OTHER UPDATE
    ====================== */
    if (purchase.purchaseType === 'OTHER') {
      if (productType !== undefined) purchase.productType = productType;
      if (productDescription !== undefined) purchase.productDescription = productDescription;

      if (amount !== undefined) {
        const baseAmount = parseFloat(amount);
        const cgstPct = cgstPercentage !== undefined ? parseFloat(cgstPercentage) : purchase.cgstPercentage;
        const sgstPct = sgstPercentage !== undefined ? parseFloat(sgstPercentage) : purchase.sgstPercentage;
        purchase.cgst = parseFloat(((baseAmount * cgstPct) / 100).toFixed(2));
        purchase.sgst = parseFloat(((baseAmount * sgstPct) / 100).toFixed(2));
        purchase.amount = Math.round(baseAmount + purchase.cgst + purchase.sgst);
      }
    }

    const updatedPurchase = await purchase.save();
    res.json(updatedPurchase);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete a purchase record
// @route   DELETE /api/purchases/:id
// @access  Private/Admin
const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      log(`Purchase deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Purchase record not found' });
    }

    if (purchase.organizationId && String(purchase.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    await purchase.deleteOne();
    log(`Purchase record deleted: Bill# ${purchase.purchaseBillNumber}`, 'info');
    res.json({ message: 'Purchase record removed successfully.' });
  } catch (error) {
    log(`Error deleting purchase ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting purchase record.' });
  }
};

// @desc    Download purchases as Excel
// @route   GET /api/purchases/download/excel
// @access  Private/Admin
const downloadPurchasesExcel = async (req, res) => {
  const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
  const query = { organizationId: req.organizationId };

  if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (purchaseType) query.purchaseType = purchaseType;

  if (startDate && endDate) {
    query.purchaseBillDate = { 
      $gte: new Date(startDate), 
      $lte: new Date(new Date(endDate).setHours(23,59,59,999)) 
    };
  } else if (startDate) {
    query.purchaseBillDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
  }

  try {
    const purchases = await Purchase.find(query)
      .populate('supplierCompany', 'name')
      .sort({ purchaseBillDate: 1, purchaseBillNumber: 1 });

    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ message: 'No purchases found matching the criteria.' });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Purchases');

    const hasYarn = purchases.some(p => p.purchaseType === 'YARN');
    const hasOther = purchases.some(p => p.purchaseType === 'OTHER');

    if (hasYarn && hasOther) {
      worksheet.columns = [
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Bill No.', key: 'billNumber', width: 15 },
        { header: 'Date', key: 'billDate', width: 12 },
        { header: 'Supplier', key: 'supplier', width: 30 },
        { header: 'Product', key: 'product', width: 20 },
        { header: 'Sub Total / Base', key: 'subTotal', width: 14 },
        { header: 'CGST', key: 'cgst', width: 10 },
        { header: 'SGST', key: 'sgst', width: 10 },
        { header: 'Total', key: 'amount', width: 14 },
        { header: 'Status', key: 'status', width: 12 }
      ];
    } else if (hasYarn) {
      worksheet.columns = [
        { header: 'Bill No.', key: 'billNumber', width: 15 },
        { header: 'Date', key: 'billDate', width: 12 },
        { header: 'Supplier', key: 'supplier', width: 30 },
        { header: 'Sub Total', key: 'subTotal', width: 14 },
        { header: 'CGST', key: 'cgst', width: 10 },
        { header: 'SGST', key: 'sgst', width: 10 },
        { header: 'Total', key: 'amount', width: 14 },
        { header: 'Status', key: 'status', width: 12 }
      ];
    } else {
      worksheet.columns = [
        { header: 'Bill No.', key: 'billNumber', width: 15 },
        { header: 'Date', key: 'billDate', width: 12 },
        { header: 'Supplier', key: 'supplier', width: 30 },
        { header: 'Base Amount', key: 'subTotal', width: 14 },
        { header: 'CGST', key: 'cgst', width: 10 },
        { header: 'SGST', key: 'sgst', width: 10 },
        { header: 'Total', key: 'amount', width: 14 },
        { header: 'Status', key: 'status', width: 12 }
      ];
    }

    purchases.forEach(purchase => {
      const supplierName =
        purchase.supplierCompany?.name ||
        purchase.supplierDetailsSnapshot?.name ||
        'N/A';

      worksheet.addRow({
        type: purchase.purchaseType,
        billNumber: purchase.purchaseBillNumber,
        billDate: purchase.purchaseBillDate.toLocaleDateString('en-IN'),
        supplier: supplierName,
        product: purchase.productType || '-',
        subTotal:
          purchase.purchaseType === 'YARN'
            ? purchase.subTotal
            : (purchase.amount - purchase.cgst - purchase.sgst),
        cgst: purchase.cgst,
        sgst: purchase.sgst,
        amount: purchase.amount,
        status: purchase.paymentStatus
      });
    });

    worksheet.addRow({});
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
    const summaryRow = worksheet.addRow({
      billNumber: 'TOTAL:',
      amount: totalAmount
    });
    summaryRow.font = { bold: true };

    worksheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    let fileName = 'Purchases';
    if (purchaseType) fileName += `_${purchaseType}`;
    if (startDate && endDate) fileName += `_${startDate}_to_${endDate}`;
    fileName += '.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    log(`Error generating Excel report: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while generating Excel report.' });
  }
};

// @desc    Download purchases as PDF
// @route   GET /api/purchases/download/pdf
// @access  Private/Admin
// @desc    Download purchases as PDF
// @route   GET /api/purchases/download/pdf
// @access  Private/Admin
const downloadPurchasesPdf = async (req, res) => {
  const { supplierCompanyId, startDate, endDate, paymentStatus, purchaseType } = req.query;
  const query = { organizationId: req.organizationId };

  if (supplierCompanyId) query.supplierCompany = supplierCompanyId;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (purchaseType) query.purchaseType = purchaseType;

  if (startDate && endDate) {
    query.purchaseBillDate = { 
      $gte: new Date(startDate), 
      $lte: new Date(new Date(endDate).setHours(23,59,59,999)) 
    };
  } else if (startDate) {
    query.purchaseBillDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.purchaseBillDate = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
  }

  try {
    const purchases = await Purchase.find(query)
      .populate('supplierCompany', 'name')
      .sort({ purchaseBillDate: 1, purchaseBillNumber: 1 });

    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ message: 'No purchases found matching the criteria.' });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const margin = 40;

    const drawText = (
      text,
      x,
      y,
      size = 10,
      isBold = false,
      maxWidth = width - margin * 2,
      align = 'left'
    ) => {
      const currentFont = isBold ? boldFont : font;
      const textWidth = currentFont.widthOfTextAtSize(text, size);
      let finalX = x;

      if (align === 'center' && maxWidth) {
        finalX = x + (maxWidth - textWidth) / 2;
      } else if (align === 'right' && maxWidth) {
        finalX = x + (maxWidth - textWidth);
      }

      page.drawText(text, {
        x: finalX,
        y,
        size,
        font: currentFont,
        maxWidth: maxWidth || undefined,
      });

      return textWidth;
    };

    let y = height - margin;

    /* ======================
       TITLE
    ====================== */
    let reportTitle = 'PURCHASES REPORT';
    if (purchaseType) reportTitle += ` - ${purchaseType}`;
    if (startDate && endDate) {
      reportTitle += ` (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`;
    }

    drawText(reportTitle, margin, y, 16, true, width - margin * 2, 'center');
    y -= 30;

    /* ======================
       SUMMARY
    ====================== */
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
    drawText(`Total Records: ${purchases.length}`, margin, y, 12, true);
    drawText(
      `Grand Total: Rs. ${totalAmount.toLocaleString('en-IN')}`,
      width - margin - 180,
      y,
      12,
      true
    );
    y -= 30;

    /* ======================
       PURCHASE LIST
    ====================== */
    for (const purchase of purchases) {
      if (y < margin + 180) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - margin;
      }

      const supplierName =
        purchase.supplierCompany?.name ||
        purchase.supplierDetailsSnapshot?.name ||
        purchase.manualCompanyName ||
        'N/A';

      /* Header */
      drawText(`Bill: ${purchase.purchaseBillNumber}`, margin, y, 11, true);
      drawText(
        `Date: ${purchase.purchaseBillDate.toLocaleDateString('en-IN')}`,
        margin + 160,
        y,
        11
      );
      drawText(
        `Rs. ${purchase.amount.toLocaleString('en-IN')}`,
        width - margin - 120,
        y,
        11,
        true
      );
      y -= 18;

      drawText(`Supplier: ${supplierName}`, margin, y, 10);
      drawText(`Type: ${purchase.purchaseType}`, width - margin - 160, y, 10);
      y -= 15;

      /* ======================
         TYPE-SPECIFIC DETAILS
      ====================== */
      if (purchase.purchaseType === 'YARN') {
        if (purchase.challanNumber) {
          drawText(`Challan: ${purchase.challanNumber}`, margin + 20, y, 9);
          y -= 13;
        }
        if (purchase.denier) {
          drawText(`Denier: ${purchase.denier}`, margin + 20, y, 9);
          y -= 13;
        }
        if (purchase.grade) {
          drawText(`Grade: ${purchase.grade}`, margin + 20, y, 9);
          y -= 13;
        }

        drawText(
          `Weights: ${purchase.totalGrossWeight} kg (gross) - ${purchase.tareWeight} kg (tare) = ${purchase.netWeight} kg (net)`,
          margin + 20,
          y,
          9
        );
        y -= 13;

        drawText(
          `Rate: Rs. ${purchase.ratePerUnit}/kg`,
          margin + 20,
          y,
          9
        );
        y -= 13;

        /* GST BREAKUP (YARN) */
        drawText(`Sub Total: Rs. ${purchase.subTotal}`, margin + 20, y, 9);
        y -= 13;
      } else {
        drawText(`Product: ${purchase.productType || 'N/A'}`, margin + 20, y, 9);
        y -= 13;

        if (purchase.productDescription) {
          drawText(
            `Description: ${purchase.productDescription}`,
            margin + 20,
            y,
            9
          );
          y -= 13;
        }

        /* GST BREAKUP (OTHER) */
        const baseAmount = purchase.amount - purchase.cgst - purchase.sgst;
        drawText(`Base Amount: Rs. ${baseAmount}`, margin + 20, y, 9);
        y -= 13;
      }

      /* COMMON GST */
      drawText(`CGST: Rs. ${purchase.cgst}`, margin + 20, y, 9);
      y -= 13;

      drawText(`SGST: Rs. ${purchase.sgst}`, margin + 20, y, 9);
      y -= 13;

      drawText(`Total Amount: Rs. ${purchase.amount}`, margin + 20, y, 10, true);
      y -= 18;

      drawText(`Status: ${purchase.paymentStatus}`, margin + 20, y, 9);
      y -= 18;

      /* Separator */
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 15;
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');

    let fileName = 'Purchases';
    if (purchaseType) fileName += `_${purchaseType}`;
    if (startDate && endDate) fileName += `_${startDate}_to_${endDate}`;
    fileName += '.pdf';

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    log(`Error generating PDF report: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while generating PDF report.' });
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  downloadPurchasesExcel,
  downloadPurchasesPdf
};