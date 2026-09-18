
// const Bill = require('../models/Bill');
// const Company = require('../models/Company');
// const Settings = require('../models/Settings');
// const Challan = require('../models/Challan');
// const { log } = require('../middleware/logger');
// const exceljs = require('exceljs');
// const fsPromises = require('fs').promises;
// const fs = require('fs');
// const path = require('path');
// const { PDFDocument, StandardFonts, rgb, PageSizes } = require('pdf-lib');
// const fontkit = require('fontkit');
// const { getOrgDetails } = require('../utils/orgDetails');

// const getNextBillNumber = async (req, res) => {
//   try {
//     const financialYear = req.query.financialYear || getFinancialYear();
//     const billNumber = await generateBillNumber(financialYear, req.organizationId);

//     res.json({ billNumber, financialYear });
//   } catch (error) {
//     res.status(500).json({ message: 'Error generating bill number' });
//   }
// };
// const getFinancialYear = (date = new Date()) => {
//   const d = new Date(date);
//   const month = d.getMonth();
//   const year = d.getFullYear();

//   if (month >= 3) {
//     return `${year}-${String(year + 1).slice(-2)}`;
//   } else {
//     return `${year - 1}-${String(year).slice(-2)}`;
//   }
// };

// // ===============================
// // ✅ GENERATE BILL NUMBER
// // ===============================
// // const generateBillNumber = async (financialYear, organizationId) => {
// //   const prefix = `${financialYear}/`;

// //   const lastBill = await Bill.findOne({
// //     billNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
// //     organizationId,
// //   }).sort({ billNumber: -1 });

// //   let nextSeq = 1;

// //   if (lastBill) {
// //     const parts = lastBill.billNumber.split('/');
// //     const lastSeq = parseInt(parts[parts.length - 1], 10);
// //     if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
// //   }

// //   return `${prefix}${String(nextSeq).padStart(2, '0')}`;
// // };

// const generateBillNumber = async (financialYear, organizationId) => {
//   const prefix = `${financialYear}/`;

//   const bills = await Bill.find({
//     billNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
//     organizationId,
//   }).select("billNumber");

//   let maxSeq = 0;

//   bills.forEach((bill) => {
//     const parts = bill.billNumber.split('/');
//     const seq = parseInt(parts[parts.length - 1], 10);

//     if (!isNaN(seq) && seq > maxSeq) {
//       maxSeq = seq;
//     }
//   });

//   const nextSeq = maxSeq + 1;

//   return `${prefix}${String(nextSeq).padStart(2, '0')}`;
// };

// const calculateBillTotals = (

//   items,
//   discountPercentage,
//   taxType,
//   cgstPercentage,
//   sgstPercentage,
//   igstPercentage,
//   jobCgstPercentage,
//   jobSgstPercentage
// ) => {

//   let subTotalAmount = 0;

//   const calculatedItems = items.map(item => {
//     const quantity = parseFloat(item.quantity) || 0;
//     const rate = parseFloat(item.rate) || 0;

//     const amount = Number((quantity * rate).toFixed(2));
//     subTotalAmount += amount;

//     return {
//       description: item.description,
//       hsnSacCode: item.hsnSacCode,
//       quantity,
//       rate,
//       amount
//     };
//   });

//   subTotalAmount = Number(subTotalAmount.toFixed(2));

//   const discountAmount = Number(
//     (subTotalAmount * (Number(discountPercentage || 0) / 100)).toFixed(2)
//   );

//   const amountAfterDiscount = Number(
//     (subTotalAmount - discountAmount).toFixed(2)
//   );

//   let cgstAmount = 0,
//       sgstAmount = 0,
//       igstAmount = 0,
//       jobCgstAmount = 0,
//       jobSgstAmount = 0;

//   if (taxType === 'CGST_SGST') {

//     cgstAmount = Number(
//       (amountAfterDiscount * (Number(cgstPercentage || 0) / 100)).toFixed(2)
//     );

//     sgstAmount = Number(
//       (amountAfterDiscount * (Number(sgstPercentage || 0) / 100)).toFixed(2)
//     );
//   }

//   if (taxType === 'IGST') {
//     igstAmount = Number(
//       (amountAfterDiscount * (Number(igstPercentage || 0) / 100)).toFixed(2)
//     );
//   }

//   if (taxType === 'JOBCGST_JOBSGST') {

//     jobCgstAmount = Number(
//       (amountAfterDiscount * (Number(jobCgstPercentage || 0) / 100)).toFixed(2)
//     );

//     jobSgstAmount = Number(
//       (amountAfterDiscount * (Number(jobSgstPercentage || 0) / 100)).toFixed(2)
//     );
//   }

//   const totalTaxAmount = Number(
//     (cgstAmount + sgstAmount + igstAmount + jobCgstAmount + jobSgstAmount).toFixed(2)
//   );

//   const rawTotalAmount = Number(
//     (amountAfterDiscount + totalTaxAmount).toFixed(2)
//   );

//   const totalAmount = Math.round(rawTotalAmount);

//   const roundOffAmount = Number(
//     (totalAmount - rawTotalAmount).toFixed(2)
//   );

//   return {
//     items: calculatedItems,
//     subTotalAmount,
//     discountAmount,
//     amountAfterDiscount,
//     cgstAmount,
//     sgstAmount,
//     igstAmount,
//     jobCgstAmount,
//     jobSgstAmount,
//     totalTaxAmount,
//     roundOffAmount,
//     totalAmount
//   };
// };

// const getAvailableChallans = async (req, res) => {
//   const { companyId } = req.params;
//   const { financialYear } = req.query;

//   try {
//     if (!companyId) {
//       return res.status(400).json({ message: "Company ID required" });
//     }

//     const billQuery = { company: companyId };
//     if (financialYear) {
//       billQuery.financialYear = financialYear;
//     }

//     const bills = await Bill.find(billQuery).select("challan challans");

//     const usedChallanIds = new Set();

//     bills.forEach(b => {
//       if (b.challan) {
//         usedChallanIds.add(b.challan.toString());
//       }
//       if (Array.isArray(b.challans)) {
//         b.challans.forEach(id => {
//           usedChallanIds.add(id.toString());
//         });
//       }
//     });

//     const challanQuery = {
//       company: companyId,
//       isUsed: false,
//       _id: { $nin: Array.from(usedChallanIds) }
//     };

//     if (financialYear) {
//       challanQuery.financialYear = financialYear;
//     }

//     const challans = await Challan.find(challanQuery)
//       .select("challanNumber challanDate descriptionOfGoods totalNetWeight totalCops");

//     console.log("Available Challans:", challans.length);

//     res.json(challans);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error fetching challans" });
//   }
// };

// const createBill = async (req, res) => {
//   let {
//     billNumber,
//     billDate,
//     companyId,
//     challanId,
//     challanIds,
//     items,
//     rate,
//     discountPercentage = 0,
//     taxType,
//     financialYear,
//     paymentTermsDays = 30,
//     eWayBillNumber,
//     status,
//     amountInWords,
//   } = req.body;

//   if (!companyId || (!challanId && (!challanIds || challanIds.length === 0) && (!items || items.length === 0))) {
//     return res.status(400).json({ message: 'Missing required fields' });
//   }

//   try {
//     const resolvedDate = billDate ? new Date(billDate) : new Date();
//     const resolvedFY = financialYear || getFinancialYear(resolvedDate);

//     if (!billNumber) {
//       billNumber = await generateBillNumber(resolvedFY, req.organizationId);
//     }

//     // ✅ Duplicate validation
//     const existingBill = await Bill.findOne({
//       billNumber,
//       organizationId: req.organizationId,
//     });

//     if (existingBill) {
//       return res.status(400).json({
//         message: `Bill number '${billNumber}' already exists.`,
//       });
//     }

//     let finalItems = items || [];
//     let challan = null;
//     let challansList = [];
//     let challanNumbers = [];

//     if (challanIds && challanIds.length > 0) {
//       const challans = await Challan.find({ _id: { $in: challanIds } });

//       if (challans.length !== challanIds.length) {
//         return res.status(400).json({ message: 'Some challans not found' });
//       }

//       for (const ch of challans) {
//         if (ch.financialYear !== resolvedFY) {
//           return res.status(400).json({ message: `Challan ${ch.challanNumber} belongs to different financial year` });
//         }
//         if (ch.isUsed) {
//           return res.status(400).json({ message: `Challan ${ch.challanNumber} already used` });
//         }
//       }

//       const settings = await Settings.getSettings(req.organizationId);

//       const itemMap = new Map();

//       for (const ch of challans) {
//         const itemConfig = settings.itemConfigurations.find(
//           i => i.description === ch.descriptionOfGoods
//         );

//         const frontendItem = Array.isArray(items) ? items.find(it => it.description === ch.descriptionOfGoods) : null;
//         const itemRate = frontendItem?.rate || rate || itemConfig?.defaultRate || 0;
//         const itemQty = frontendItem?.quantity || ch.totalNetWeight;

//         if (itemMap.has(ch.descriptionOfGoods)) {
//           const existing = itemMap.get(ch.descriptionOfGoods);
//           existing.quantity = parseFloat((existing.quantity + itemQty).toFixed(2));
//         } else {
//           itemMap.set(ch.descriptionOfGoods, {
//             description: ch.descriptionOfGoods,
//             hsnSacCode: itemConfig?.hsnSacCode || '',
//             quantity: itemQty,
//             rate: itemRate,
//             amount: parseFloat((itemQty * itemRate).toFixed(2)),
//           });
//         }

//         challansList.push(ch._id);
//         challanNumbers.push(ch.challanNumber);
//       }

//       finalItems = Array.from(itemMap.values());
//       finalItems.forEach(item => {
//         item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
//       });

//       challan = challans[0];
//     } else if (challanId) {
//       challan = await Challan.findById(challanId);

//       if (!challan) {
//         return res.status(404).json({ message: 'Challan not found' });
//       }

//       if (challan.financialYear !== resolvedFY) {
//         return res.status(400).json({ message: 'Challan belongs to different financial year' });
//       }

//       if (challan.isUsed) {
//         return res.status(400).json({ message: `Challan ${challan.challanNumber} already used` });
//       }

//       const settings = await Settings.getSettings(req.organizationId);

//       const itemConfig = settings.itemConfigurations.find(
//         i => i.description === challan.descriptionOfGoods
//       );

//       const frontendItem = Array.isArray(items) ? items.find(it => it.description === challan.descriptionOfGoods) : null;
//       const itemRate = frontendItem?.rate || rate || itemConfig?.defaultRate || 0;
//       const itemQty = frontendItem?.quantity || challan.totalNetWeight;

//       finalItems = [{
//         description: challan.descriptionOfGoods,
//         hsnSacCode: itemConfig?.hsnSacCode || '',
//         quantity: itemQty,
//         rate: itemRate,
//         amount: parseFloat((itemQty * itemRate).toFixed(2)),
//       }];

//       challansList = [challanId];
//       challanNumbers = [challan.challanNumber];
//     }

//     const calculated = calculateBillTotals(
//       finalItems,
//       discountPercentage,
//       taxType,
//       0, 0, 0, 0, 0
//     );

//     const newBill = new Bill({
//       organizationId: req.organizationId,
//       billNumber,
//       financialYear: resolvedFY,
//       billDate: resolvedDate,
//       company: companyId,
//       challan: challanId || null,
//       challans: challansList.length > 0 ? challansList : undefined,
//       challanNumber: challanNumbers.join(', ') || challan?.challanNumber || '',
//       items: calculated.items,
//       subTotalAmount: calculated.subTotalAmount,
//       discountPercentage,
//       discountAmount: calculated.discountAmount,
//       amountAfterDiscount: calculated.amountAfterDiscount,
//       taxType,
//       totalTaxAmount: calculated.totalTaxAmount,
//       roundOffAmount: calculated.roundOffAmount,
//       totalAmount: calculated.totalAmount,
//       paymentTermsDays: parseInt(paymentTermsDays, 10) || 30,
//       eWayBillNumber: eWayBillNumber || '',
//       status: status || 'Pending',
//       amountInWords: amountInWords || '',
//       createdBy: req.user._id,
//     });

//     const savedBill = await newBill.save();

//     if (challanId) {
//       await Challan.findByIdAndUpdate(challanId, {
//         isUsed: true,
//         bill: savedBill._id,
//       });
//     }

//     if (challanIds && challanIds.length > 0) {
//       await Challan.updateMany(
//         { _id: { $in: challanIds } },
//         { isUsed: true, bill: savedBill._id }
//       );
//     }

//     res.status(201).json(savedBill);

//   } catch (error) {
//     console.error('Bill creation error:', error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         message: 'Duplicate bill number error. This bill number already exists in this organization.',
//         error: error.message 
//       });
//     }
    
//     res.status(500).json({ message: 'Error creating bill', error: error.message });
//   }
// };

// // @desc    Update bill
// // @route   PUT /api/bills/:id
// const updateBill = async (req, res) => {
//   const billId = req.params.id;
//   const {
//     billNumber,
//     billDate,
//     companyId,
//     consigneeId,
//     isConsigneeDifferent,
//     challanId,
//     challanIds,
//     challanNumber,
//     items,
//     discountPercentage,
//     taxType,
//     overrideCgstPercentage,
//     overrideSgstPercentage,
//     overrideIgstPercentage,
//     overrideJobCgstPercentage,
//     overrideJobSgstPercentage,
//     status,
//     amountInWords,
//     paymentRecords,
//     rate,
//     eWayBillNumber,
//     paymentTermsDays
//   } = req.body;

//   try {
//     const bill = await Bill.findById(billId);
//     if (!bill) {
//       log(`Bill update failed: Not found with ID: ${billId}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found' });
//     }

//     if (challanId !== undefined && challanId !== bill.challan?.toString()) {
//       if (bill.challan) {
//         await Challan.findByIdAndUpdate(
//           bill.challan,
//           { isUsed: false, bill: null },
//           { new: true }
//         );
//         log(`Previous challan ${bill.challan} reset for bill ${bill.billNumber}`, 'info');
//       }
//     }

//     if (challanIds !== undefined) {
//       const oldChallans = bill.challans || [];
//       if (oldChallans.length > 0) {
//         await Challan.updateMany(
//           { _id: { $in: oldChallans } },
//           { isUsed: false, bill: null }
//         );
//         log(`Previous challans reset for bill ${bill.billNumber}`, 'info');
//       }
//     }

//     let needsRecalculation = false;

//     if (billNumber !== undefined && bill.billNumber !== billNumber) {
//       const existingBillWithNewNumber = await Bill.findOne({ 
//         billNumber,
//         organizationId: req.organizationId 
//       });
//       if (existingBillWithNewNumber && existingBillWithNewNumber._id.toString() !== billId) {
//         return res.status(400).json({ message: `Bill number '${billNumber}' already exists in this organization.` });
//       }
//       bill.billNumber = billNumber;
//     }
//     if (billDate !== undefined) bill.billDate = new Date(billDate);
//     if (status !== undefined) bill.status = status;
//     if (amountInWords !== undefined) bill.amountInWords = amountInWords;
//     if (eWayBillNumber !== undefined) bill.eWayBillNumber = eWayBillNumber;
//     if (paymentTermsDays !== undefined) bill.paymentTermsDays = parseInt(paymentTermsDays, 10) || 30;

//     if (companyId !== undefined && bill.company.toString() !== companyId) {
//       const company = await Company.findById(companyId);
//       if (!company) {
//         return res.status(404).json({ message: 'New company not found.' });
//       }
//       bill.company = companyId;
//       bill.companyDetailsSnapshot = {
//         name: company.name,
//         address: company.address,
//         gstNumber: company.gstNumber,
//       };
//     }

//     if (isConsigneeDifferent !== undefined) {
//       bill.isConsigneeDifferent = isConsigneeDifferent;
      
//       if (isConsigneeDifferent && consigneeId) {
//         const consignee = await Company.findById(consigneeId);
//         if (!consignee) {
//           return res.status(404).json({ message: 'Consignee company not found.' });
//         }
        
//         const consigneeStateCode = consignee.gstNumber && consignee.gstNumber.length >= 2 ? 
//           consignee.gstNumber.substring(0, 2) : '';
        
//         bill.consignee = consigneeId;
//         bill.consigneeDetailsSnapshot = {
//           name: consignee.name,
//           address: consignee.address,
//           gstNumber: consignee.gstNumber,
//           stateCode: consigneeStateCode,
//         };
//       } else {
//         bill.consignee = null;
//         bill.consigneeDetailsSnapshot = null;
//       }
//     }

//     if (challanIds && challanIds.length > 0) {
//       const challans = await Challan.find({ _id: { $in: challanIds } });

//       if (challans.length !== challanIds.length) {
//         return res.status(400).json({ message: 'Some challans not found.' });
//       }

//       for (const ch of challans) {
//         if (ch.company.toString() !== (companyId || bill.company.toString())) {
//           return res.status(400).json({ message: `Challan ${ch.challanNumber} does not belong to the selected company.` });
//         }
//         if (ch.isUsed && ch.bill?.toString() !== billId) {
//           return res.status(400).json({ message: `Challan ${ch.challanNumber} is already used in another bill.` });
//         }
//       }

//       const settings = await Settings.getSettings(req.organizationId);
//       const itemMap = new Map();

//       for (const ch of challans) {
//         const itemConfig = settings.itemConfigurations.find(item => item.description === ch.descriptionOfGoods);
//         const frontendItem = Array.isArray(items) ? items.find(it => it.description === ch.descriptionOfGoods) : null;
//         const itemRate = frontendItem?.rate || parseFloat(rate) || itemConfig?.defaultRate || 0;
//         const itemQty = frontendItem?.quantity || ch.totalNetWeight;

//         if (itemMap.has(ch.descriptionOfGoods)) {
//           const existing = itemMap.get(ch.descriptionOfGoods);
//           existing.quantity = parseFloat((existing.quantity + itemQty).toFixed(2));
//         } else {
//           itemMap.set(ch.descriptionOfGoods, {
//             description: ch.descriptionOfGoods,
//             hsnSacCode: itemConfig?.hsnSacCode || '',
//             quantity: itemQty,
//             rate: itemRate,
//             amount: parseFloat((itemQty * itemRate).toFixed(2)),
//           });
//         }
//       }

//       const billItems = Array.from(itemMap.values());
//       billItems.forEach(item => {
//         item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
//       });

//       bill.challan = null;
//       bill.challans = challanIds;
//       bill.challanNumber = challans.map(c => c.challanNumber).join(', ');
//       bill.items = billItems;

//       await Challan.updateMany(
//         { _id: { $in: challanIds } },
//         { isUsed: true, bill: billId }
//       );

//       needsRecalculation = true;
//     } else if (challanId !== undefined || challanNumber !== undefined || rate !== undefined) {
//       if (challanId) {
//         const challan = await Challan.findById(challanId);
//         if (!challan) {
//           return res.status(404).json({ message: 'Challan not found.' });
//         }
//         if (challan.company.toString() !== (companyId || bill.company.toString())) {
//           return res.status(400).json({ message: 'Challan does not belong to the selected company.' });
//         }
//         if (challan.isUsed && challan.bill?.toString() !== billId) {
//           return res.status(400).json({ message: `Challan ${challan.challanNumber} is already used in another bill.` });
//         }
//         bill.challan = challanId;
//         bill.challans = [];
//         bill.challanNumber = challan.challanNumber;
//         const settings = await Settings.getSettings(req.organizationId);
//         const itemConfig = settings.itemConfigurations.find(item => item.description === challan.descriptionOfGoods);
//         const itemRate = parseFloat(rate) || itemConfig?.defaultRate || 0;
//         bill.items = [{
//           description: challan.descriptionOfGoods,
//           hsnSacCode: itemConfig?.hsnSacCode || '',
//           quantity: challan.totalNetWeight,
//           rate: itemRate,
//           amount: parseFloat((challan.totalNetWeight * itemRate).toFixed(2))
//         }];
//         await Challan.findByIdAndUpdate(
//           challanId,
//           { isUsed: true, bill: billId },
//           { new: true }
//         );
//         log(`Challan ${challan.challanNumber} marked as used for bill ${bill.billNumber}`, 'info');
//         needsRecalculation = true;
//       } else {
//         bill.challan = null;
//         bill.challans = [];
//         bill.challanNumber = challanNumber || '';
//         if (items !== undefined) {
//           bill.items = items;
//           needsRecalculation = true;
//         }
//       }
//     } else if (items !== undefined) {
//       bill.items = items;
//       needsRecalculation = true;
//     }

//     if (paymentRecords !== undefined) {
//       if (!Array.isArray(paymentRecords)) {
//         return res.status(400).json({ message: 'paymentRecords must be an array.' });
//       }
//       bill.paymentRecords = paymentRecords;
//     }

//     if (
//       needsRecalculation ||
//       discountPercentage !== undefined ||
//       taxType !== undefined ||
//       overrideCgstPercentage !== undefined ||
//       overrideSgstPercentage !== undefined ||
//       overrideIgstPercentage !== undefined ||
//       overrideJobCgstPercentage !== undefined ||
//       overrideJobSgstPercentage !== undefined
//     ) {
//       const settings = await Settings.getSettings(req.organizationId);
//       const currentItems = bill.items;
//       const currentDiscountPercentage = discountPercentage !== undefined ? parseFloat(discountPercentage) : bill.discountPercentage;
//       const currentTaxType = taxType !== undefined ? taxType : bill.taxType;
//       const cgstRate = overrideCgstPercentage !== undefined ? parseFloat(overrideCgstPercentage) : bill.cgstPercentage || settings.cgstPercentage;
//       const sgstRate = overrideSgstPercentage !== undefined ? parseFloat(overrideSgstPercentage) : bill.sgstPercentage || settings.sgstPercentage;
//       const igstRate = overrideIgstPercentage !== undefined ? parseFloat(overrideIgstPercentage) : bill.igstPercentage || settings.igstPercentage;
//       const jobCgstRate = overrideJobCgstPercentage !== undefined ? parseFloat(overrideJobCgstPercentage) : bill.jobCgstPercentage || settings.jobCgstPercentage;
//       const jobSgstRate = overrideJobSgstPercentage !== undefined ? parseFloat(overrideJobSgstPercentage) : bill.jobSgstPercentage || settings.jobSgstPercentage;

//       const calculated = calculateBillTotals(
//         currentItems,
//         currentDiscountPercentage,
//         currentTaxType,
//         cgstRate,
//         sgstRate,
//         igstRate,
//         jobCgstRate,
//         jobSgstRate
//       );

//       bill.items = calculated.items;
//       bill.subTotalAmount = calculated.subTotalAmount;
//       bill.discountPercentage = currentDiscountPercentage;
//       bill.discountAmount = calculated.discountAmount;
//       bill.amountAfterDiscount = calculated.amountAfterDiscount;
//       bill.taxType = currentTaxType;

//       bill.cgstPercentage = currentTaxType === 'CGST_SGST' ? cgstRate : 0;
//       bill.cgstAmount = calculated.cgstAmount;

//       bill.sgstPercentage = currentTaxType === 'CGST_SGST' ? sgstRate : 0;
//       bill.sgstAmount = calculated.sgstAmount;

//       bill.igstPercentage = currentTaxType === 'IGST' ? igstRate : 0;
//       bill.igstAmount = calculated.igstAmount;

//       bill.jobCgstPercentage = currentTaxType === 'JOBCGST_JOBSGST' ? jobCgstRate : 0;
//       bill.jobCgstAmount = calculated.jobCgstAmount;

//       bill.jobSgstPercentage = currentTaxType === 'JOBCGST_JOBSGST' ? jobSgstRate : 0;
//       bill.jobSgstAmount = calculated.jobSgstAmount;

//       bill.totalTaxAmount = calculated.totalTaxAmount;

//       bill.roundOffAmount = calculated.roundOffAmount;

//       bill.totalAmount = calculated.totalAmount;

//       bill.amountInWords = amountToWords(calculated.totalAmount) || '';
//     }
//     const updatedBill = await bill.save();
//     log(`Bill updated: ${updatedBill.billNumber} by ${req.user.email}`, 'info');
//     res.json(updatedBill);
//   } catch (error) {
//     log(`Error updating bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (error.code === 11000 || error.message.includes('duplicate key')) {
//       return res.status(400).json({ message: `Bill number '${req.body.billNumber}' already exists.` });
//     }
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server error while updating bill.' });
//   }
// };

// // @desc    Get all bills
// // @route   GET /api/bills
// // @access  Private/Admin
// // const getBills = async (req, res) => {
// //   const { companyId, startDate, endDate, status } = req.query;
// //   const query = {};

// //   if (companyId) query.company = companyId;
// //   if (status) query.status = status;

// //   if (startDate && endDate) {
// //     query.billDate = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
// //   } else if (startDate) {
// //     query.billDate = { $gte: new Date(startDate) };
// //   } else if (endDate) {
// //     query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
// //   }

// //   try {
// //     const bills = await Bill.find(query)
// //       .populate('company', 'name gstNumber')
// //       .populate('consignee', 'name gstNumber address')
// //       .populate('createdBy', 'username email')
// //       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
// //       .sort({ billDate: -1, createdAt: -1 });

// //     log(`Fetched bills with query ${JSON.stringify(query)} by ${req.user.email}`, 'info');
// //     res.json(bills);
// //   } catch (error) {
// //     log(`Error fetching bills: ${error.message} - Stack: ${error.stack}`, 'error');
// //     res.status(500).json({ message: 'Server error while fetching bills.' });
// //   }
// // };

// // const getBills = async (req, res) => {
// //   const { companyId, startDate, endDate, status, financialYear } = req.query;
// //   const query = {};

// //   if (companyId) query.company = companyId;
// //   if (status) query.status = status;
// //   if (financialYear) query.financialYear = financialYear;

// //   if (startDate && endDate) {
// //     query.billDate = {
// //       $gte: new Date(startDate),
// //       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
// //     };
// //   }

// //   try {
// //     const bills = await Bill.find(query)
// //       .populate('company', 'name gstNumber')
// //       .sort({ billDate: -1 });

// //     res.json(bills);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Error fetching bills' });
// //   }
// // };

// const getBills = async (req, res) => {
//   const { companyId, financialYear, startDate, endDate, status } = req.query;

//   const query = { organizationId: req.organizationId };

//   if (companyId) query.company = companyId;
//   if (financialYear) query.financialYear = financialYear;
//   if (status) query.status = status;
//   if (startDate && endDate) {
//     query.billDate = {
//       $gte: new Date(startDate),
//       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//     };
//   } else if (startDate) {
//     query.billDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//   }

//   try {
//     const bills = await Bill.find(query)
//       .populate('company', 'name')
//       .sort({ billDate: -1 });

//     res.json(bills);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching bills' });
//   }
// };
// // @desc    Get a bill by ID
// // @route   GET /api/bills/:id
// // @access  Private/Admin
// const getBillById = async (req, res) => {
//   try {
//     const bill = await Bill.findById(req.params.id)
//       .populate('company', 'name address gstNumber mobileNumber')
//       .populate('consignee', 'name address gstNumber')
//       .populate('createdBy', 'username email')
//       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
//       .populate('challans', 'challanNumber descriptionOfGoods totalNetWeight totalCops');

//     if (!bill) {
//       log(`Bill not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found' });
//     }
//     log(`Fetched bill by ID: ${bill.billNumber} by ${req.user.email}`, 'info');
//     res.json(bill);
//   } catch (error) {
//     log(`Error fetching bill ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching bill.' });
//   }
// };

// // @desc    Delete a bill
// // @route   DELETE /api/bills/:id
// // @access  Private/Admin
// const deleteBill = async (req, res) => {
//   try {
//     const bill = await Bill.findById(req.params.id);
//     if (!bill) {
//       log(`Bill deletion failed: Not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found' });
//     }

//     if (bill.challan) {
//       await Challan.findByIdAndUpdate(
//         bill.challan,
//         { isUsed: false, bill: null },
//         { new: true }
//       );
//       log(`Challan ${bill.challan} reset due to deletion of bill ${bill.billNumber}`, 'info');
//     }

//     if (Array.isArray(bill.challans) && bill.challans.length > 0) {
//       await Challan.updateMany(
//         { _id: { $in: bill.challans } },
//         { isUsed: false, bill: null }
//       );
//       log(`Challans ${bill.challans.length} reset due to deletion of bill ${bill.billNumber}`, 'info');
//     }

//     await bill.deleteOne();
//     log(`Bill deleted: ${bill.billNumber} by ${req.user.email}`, 'info');
//     res.json({ message: 'Bill removed successfully.' });
//   } catch (error) {
//     log(`Error deleting bill ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while deleting bill.' });
//   }
// };

// // @desc    Generate Excel for a bill
// // @route   GET /api/bills/:id/excel
// // @access  Private/Admin
// const generateBillExcel = async (req, res) => {
//   const billId = req.params.id;
//   const excelTemplatePath = process.env.EXCEL_TEMPLATE_PATH;

//   if (!excelTemplatePath) {
//     log('Excel generation failed: EXCEL_TEMPLATE_PATH not set in .env', 'error');
//     return res.status(500).json({ message: 'Excel template path not configured.' });
//   }

//   try {
//     const bill = await Bill.findById(billId).populate('company');
//     if (!bill) {
//       log(`Excel generation failed: Bill not found - ID: ${billId}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found.' });
//     }

//     const workbook = new exceljs.Workbook();
//     await workbook.xlsx.readFile(excelTemplatePath);
//     const worksheet = workbook.getWorksheet(1);

//     // Use only buyer data for Excel as requested
//     worksheet.getCell('C7').value = bill.companyDetailsSnapshot.name || bill.company.name;
//     worksheet.getCell('C9').value = bill.companyDetailsSnapshot.address || bill.company.address;
//     worksheet.getCell('D12').value = bill.companyDetailsSnapshot.gstNumber || bill.company.gstNumber;
//     worksheet.getCell('H7').value = new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
//     worksheet.getCell('H8').value = bill.billNumber;
//     worksheet.getCell('H9').value = bill.challanNumber || '';
//     // Place E-way and Payment Terms into template if appropriate cells exist
//     try {
//       worksheet.getCell('H10').value = bill.eWayBillNumber || '';
//       worksheet.getCell('H11').value = bill.paymentTermsDays ? `${bill.paymentTermsDays} days` : '';
//     } catch (e) {
//       // ignore if template does not have those cells
//     }

//     let currentRow = 15;
//     bill.items.forEach((item, index) => {
//       worksheet.getCell(`A${currentRow}`).value = index + 1;
//       worksheet.getCell(`B${currentRow}`).value = item.description;
//       worksheet.getCell(`E${currentRow}`).value = item.hsnSacCode;
//       worksheet.getCell(`F${currentRow}`).value = item.quantity;
//       worksheet.getCell(`G${currentRow}`).value = item.rate;
//       worksheet.getCell(`H${currentRow}`).value = item.amount;
//       currentRow++;
//     });

//     worksheet.getCell('G19').value = bill.discountPercentage > 0 ? `DISCOUNT(${bill.discountPercentage}%)` : '';
//     worksheet.getCell('H19').value = bill.discountAmount > 0 ? bill.discountAmount : '';
//     worksheet.getCell('H20').value = bill.amountAfterDiscount;

//     if (bill.taxType === 'CGST_SGST') {
//       worksheet.getCell('G21').value = 'SGST';
//       worksheet.getCell('H21').value = bill.sgstPercentage;
//       worksheet.getCell('I21').value = bill.sgstAmount;
//       worksheet.getCell('G22').value = 'CGST';
//       worksheet.getCell('H22').value = bill.cgstPercentage;
//       worksheet.getCell('I22').value = bill.cgstAmount;
//       worksheet.getCell('G20').value = '';
//       worksheet.getCell('H20').value = '';
//       worksheet.getCell('I20').value = '';
//     } else if (bill.taxType === 'IGST') {
//       worksheet.getCell('G20').value = 'IGST';
//       worksheet.getCell('H20').value = bill.igstPercentage;
//       worksheet.getCell('I20').value = bill.igstAmount;
//       worksheet.getCell('G21').value = '';
//       worksheet.getCell('H21').value = '';
//       worksheet.getCell('I21').value = '';
//       worksheet.getCell('G22').value = '';
//       worksheet.getCell('H22').value = '';
//       worksheet.getCell('I22').value = '';
//     } else if (bill.taxType === 'JOBCGST_JOBSGST') {
//       worksheet.getCell('G21').value = 'JOBSGST';
//       worksheet.getCell('H21').value = bill.jobSgstPercentage;
//       worksheet.getCell('I21').value = bill.jobSgstAmount;
//       worksheet.getCell('G22').value = 'JOBCGST';
//       worksheet.getCell('H22').value = bill.jobCgstPercentage;
//       worksheet.getCell('I22').value = bill.jobCgstAmount;
//       worksheet.getCell('G20').value = '';
//       worksheet.getCell('H20').value = '';
//       worksheet.getCell('I20').value = '';
//     }

//     worksheet.getCell('I23').value = bill.totalAmount;

//     const outputDir = path.join(__dirname, '..', 'generated_bills', 'excel');
//     await fsPromises.mkdir(outputDir, { recursive: true });
//     const excelFileName = `Bill-${bill.billNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
//     const excelFilePath = path.join(outputDir, excelFileName);

//     await workbook.xlsx.writeFile(excelFilePath);

//     bill.excelFilePath = excelFilePath;
//     await bill.save();

//     log(`Excel generated for bill ${bill.billNumber}: ${excelFilePath}`, 'info');

//     res.download(excelFilePath, excelFileName, (err) => {
//       if (err) {
//         log(`Error sending Excel file for bill ${bill.billNumber}: ${err.message}`, 'error');
//         if (!res.headersSent) {
//           res.status(500).json({ message: 'Failed to download Excel file.' });
//         }
//       } else {
//         log(`Excel file downloaded for bill ${bill.billNumber}`, 'info');
//       }
//     });
//   } catch (error) {
//     log(`Error generating Excel for bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (!res.headersSent) {
//       res.status(500).json({ message: 'Server error while generating Excel bill.' });
//     }
//   }
// };

// // @desc    Generate PDF for a bill
// // @route   GET /api/bills/:id/pdf
// // @access  Private/Admin
// const generateBillPdf = async (req, res) => {
//   const billId = req.params.id;
//   try {
//     const org = await getOrgDetails(req.organizationId);
//     const bill = await Bill.findById(billId)
//       .populate('company')
//       .populate('consignee', 'name address gstNumber')
//       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker')
//       .populate('challans', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker boxDetails');
//     if (!bill) {
//       log(`PDF generation failed: Bill not found - ID: ${billId}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found.' });
//     }

//     const pdfDoc = await PDFDocument.create();
//     let page = pdfDoc.addPage([595, 842]);
//     const { width, height } = page.getSize();
//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     let y = height - 40;
//     const lineSpacing = 18;
//     const smallLineSpacing = 12;
//     const itemLineSpacing = 16;
//     const leftMargin = 40;
//     const rightMargin = width - 40;
//     const contentWidth = rightMargin - leftMargin;

//     const drawTextAndMeasureHeight = (textToDraw, xPos, currentY, options = {}) => {
//       const textToProcess = String(textToDraw ?? '').replace(/₹/g, 'INR ');
//       const FONT_TO_USE = options.font || font;
//       const SIZE = options.size || 10;
//       const COLOR = options.color || rgb(0, 0, 0);
//       const LINE_HEIGHT = options.lineHeight || SIZE * 1.3;
//       const MAX_WIDTH = options.maxWidth;
//       const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 3;
//       const ALIGN = options.align || 'left';

//       let actualXPos = xPos;
//       if (ALIGN === 'center' && MAX_WIDTH) {
//         const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
//         actualXPos = xPos + (MAX_WIDTH - textWidth) / 2;
//       } else if (ALIGN === 'center') {
//         const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
//         actualXPos = leftMargin + (contentWidth - textWidth) / 2;
//       }

//       page.drawText(textToProcess, {
//         x: actualXPos,
//         y: currentY,
//         font: FONT_TO_USE,
//         size: SIZE,
//         color: COLOR,
//         lineHeight: LINE_HEIGHT,
//         maxWidth: MAX_WIDTH,
//         wordBreaks: [' ', '-', '/'],
//       });

//       let numLines = 1;
//       if (MAX_WIDTH && FONT_TO_USE.widthOfTextAtSize(textToProcess.replace(/\n/g, ' '), SIZE) > MAX_WIDTH) {
//         const segments = textToProcess.split('\n');
//         numLines = 0;
//         segments.forEach(segment => {
//           if (segment.trim() === '') {
//             numLines++;
//             return;
//           }
//           let currentLineForEstimation = '';
//           let linesForSegment = 1;
//           const words = segment.split(' ');
//           for (const word of words) {
//             const testLineWithWord = currentLineForEstimation ? `${currentLineForEstimation} ${word}` : word;
//             if (FONT_TO_USE.widthOfTextAtSize(testLineWithWord, SIZE) > MAX_WIDTH) {
//               linesForSegment++;
//               currentLineForEstimation = word;
//             } else {
//               currentLineForEstimation = testLineWithWord;
//             }
//           }
//           numLines += linesForSegment;
//         });
//         if (textToProcess.endsWith('\n') && segments[segments.length - 1].trim() !== '') numLines++;
//         if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
//       } else {
//         numLines = textToProcess.split('\n').length;
//         if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
//       }

//       const textHeight = textToProcess.trim() === '' ? 0 : numLines * LINE_HEIGHT;
//       return textHeight + SPACING_AFTER;
//     };

//     let currentY = y;

//     const topHeaderTextY = currentY;
//     const shreeGaneshText = 'SHREE GANESHAY NAMAH';
//     const shreeGaneshFontSize = 10;
//     const shreeGaneshOptions = { font: boldFont, size: shreeGaneshFontSize, align: 'center', color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
//     const shreeGaneshHeight = drawTextAndMeasureHeight(shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);

//     const taxInvoiceText = 'TAX INVOICE';
//     const taxInvoiceFontSize = 14;
//     const taxInvoiceWidth = boldFont.widthOfTextAtSize(taxInvoiceText, taxInvoiceFontSize);
//     const taxInvoiceOptions = { font: boldFont, size: taxInvoiceFontSize, color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
//     const taxInvoiceHeight = drawTextAndMeasureHeight(taxInvoiceText, rightMargin - taxInvoiceWidth, topHeaderTextY, taxInvoiceOptions);

//     currentY -= Math.max(shreeGaneshHeight, taxInvoiceHeight) + 18;

//     const companyNameText = org.name;
//     const companyNameFontSize = 25;
//     currentY -= drawTextAndMeasureHeight(companyNameText, leftMargin, currentY, { font: boldFont, size: companyNameFontSize, align: 'center', color: rgb(0.1, 0.3, 0.5) });

//     const addressText = org.address;
//     const addressFontSize = 9;
//     currentY -= drawTextAndMeasureHeight(addressText, leftMargin, currentY + 14, { size: addressFontSize, align: 'center', maxWidth: contentWidth, spacingAfter: 4 });

//     const companyGSTIN = org.gstin;
//     const companyStateCode = companyGSTIN.substring(0, 2);
//     const gstinWithStateText = `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`;
//     const gstinFontSize = 10;
//     currentY -= drawTextAndMeasureHeight(gstinWithStateText, leftMargin, currentY + 14, { size: gstinFontSize, align: 'center', spacingAfter: 15 });

//     y = currentY;

//     const buyerName = bill.companyDetailsSnapshot?.name || bill.company?.name || 'N/A';
//     const buyerAddress = bill.companyDetailsSnapshot?.address || bill.company?.address || 'N/A';
//     const buyerGstin = bill.companyDetailsSnapshot?.gstNumber || bill.company?.gstNumber || 'N/A';
//     const buyerStateCode = buyerGstin !== 'N/A' && buyerGstin.length >= 2 ? buyerGstin.substring(0, 2) : 'N/A';
//     const broker = bill.challan ? bill.challan.broker || 'direct' : 'direct';

//     let yLeft = y;
//     let yRight = y;

//     const detailsMaxWidth = contentWidth / 2 - 20;
//     const billDetailsColumnWidth = 180;
//     const billDetailsX = rightMargin - billDetailsColumnWidth;
//     const billDetailsMaxWidth = billDetailsColumnWidth - 10;

//     // Draw background for buyer/consignee section
//     const buyerSectionHeight = bill.isConsigneeDifferent ? 155 : 100;
//     page.drawRectangle({
//       x: leftMargin,
//       y: yLeft - (bill.isConsigneeDifferent ? 144 : 84),
//       width: detailsMaxWidth + 20,
//       height: buyerSectionHeight,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     // Draw background for bill details
//     page.drawRectangle({
//       x: billDetailsX - 5,
//       y: yRight - 64,
//       width: billDetailsColumnWidth,
//       height: 80,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     // Draw Buyer details
//     yLeft -= drawTextAndMeasureHeight(`Buyer:`, leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
//     yLeft -= drawTextAndMeasureHeight(buyerName, leftMargin + 5, yLeft, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth });
//     yLeft -= drawTextAndMeasureHeight(buyerAddress, leftMargin + 5, yLeft, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
//     yLeft -= drawTextAndMeasureHeight(`GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`, leftMargin + 5, yLeft, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });

//     // Draw Consignee details if different
//     if (bill.isConsigneeDifferent && bill.consigneeDetailsSnapshot) {
//       const consigneeName = bill.consigneeDetailsSnapshot.name || 'N/A';
//       const consigneeAddress = bill.consigneeDetailsSnapshot.address || 'N/A';
//       const consigneeGstin = bill.consigneeDetailsSnapshot.gstNumber || 'N/A';
//       const consigneeStateCode = bill.consigneeDetailsSnapshot.stateCode || 'N/A';
      
//       yLeft -= drawTextAndMeasureHeight(`Consignee:`, leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
//       yLeft -= drawTextAndMeasureHeight(consigneeName, leftMargin + 5, yLeft, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth });
//       yLeft -= drawTextAndMeasureHeight(consigneeAddress, leftMargin + 5, yLeft, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
//       yLeft -= drawTextAndMeasureHeight(`GSTIN: ${consigneeGstin}     STATE CODE: ${consigneeStateCode}`, leftMargin + 5, yLeft, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
//     }

//     // Draw bill details (right side)
//     yRight -= drawTextAndMeasureHeight(`Date : ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     yRight -= drawTextAndMeasureHeight(`Invoice No : ${bill.billNumber || 'N/A'}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     const displayChallanNumber = (bill.challanNumber || bill.challan?.challanNumber || '')
//       .split(',')
//       .map(num => num.trim().split('/').pop())
//       .join(', ');

//     yRight -= drawTextAndMeasureHeight(
//       `Challan No : ${displayChallanNumber}`,
//       billDetailsX,
//       yRight,
//       {
//         size: 10,
//         spacingAfter: 4,
//         maxWidth: billDetailsMaxWidth
//       }
//     );
//     // Print E-way bill number and Payment Terms after challan
//     if (bill.eWayBillNumber) {
//       yRight -= drawTextAndMeasureHeight(`E-way Bill No : ${bill.eWayBillNumber}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     }
//     if (bill.paymentTermsDays) {
//       yRight -= drawTextAndMeasureHeight(`Mode/Terms of Payment : ${bill.paymentTermsDays} days`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     }

//     y = Math.min(yLeft, yRight) - (bill.isConsigneeDifferent ? lineSpacing + 10 : lineSpacing);

//     // Continue with the rest of the PDF generation (items table, totals, etc.)
//     page.drawRectangle({
//       x: leftMargin,
//       y: y - 22,
//       width: contentWidth,
//       height: 20,
//       color: rgb(0.1, 0.3, 0.5),
//       opacity: 0.1,
//     });
//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing;

//     const colPositions = {
//       srNo: leftMargin + 10,
//       desc: leftMargin + 50,
//       hsn: leftMargin + 260,
//       qty: leftMargin + 340,
//       rate: leftMargin + 410,
//       amount: rightMargin - 80,
//     };
//     const headerOptions = { font: boldFont, size: 10, spacingAfter: 0, color: rgb(0.1, 0.1, 0.1) };
//     drawTextAndMeasureHeight('Sr No.', colPositions.srNo, y, headerOptions);
//     drawTextAndMeasureHeight('Description of Goods', colPositions.desc, y, { ...headerOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 });
//     drawTextAndMeasureHeight('HSN/SAC', colPositions.hsn, y, headerOptions);
//     drawTextAndMeasureHeight('Quantity', colPositions.qty, y, headerOptions);
//     drawTextAndMeasureHeight('Rate/Kgs', colPositions.rate, y, headerOptions);
//     const amountHeaderText = 'Amount';
//     const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeaderText, 10);
//     drawTextAndMeasureHeight(amountHeaderText, rightMargin - amountHeaderWidth - 10, y, headerOptions);

//     y -= smallLineSpacing;
//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= itemLineSpacing;

//     const pageBreakThreshold = 100;
//     bill.items.forEach((item, index) => {
//       if (y < pageBreakThreshold) {
//         page = pdfDoc.addPage([595, 842]);
//         y = height - 40;
//       }

//       const itemRowOptions = { size: 9, spacingAfter: 0 };
//       let maxHeightThisRow = 0;

//       if (index % 2 === 0) {
//         page.drawRectangle({
//           x: leftMargin,
//           y: y - 5,
//           width: contentWidth,
//           height: 16,
//           color: rgb(0.98, 0.98, 0.98),
//           opacity: 0.5,
//         });
//       }

//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(index + 1), colPositions.srNo, y, itemRowOptions));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.description, colPositions.desc, y, { ...itemRowOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.hsnSacCode, colPositions.hsn, y, { ...itemRowOptions, maxWidth: colPositions.qty - colPositions.hsn - 10 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.quantity.toFixed(2)), colPositions.qty, y, { ...itemRowOptions, maxWidth: colPositions.rate - colPositions.qty - 10 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(Math.round(item.rate || 0)), colPositions.rate, y, { ...itemRowOptions, maxWidth: colPositions.amount - colPositions.rate - 10 }));
//       const amountStr = String(Math.round(item.amount || 0));
//       const amountCellWidth = font.widthOfTextAtSize(amountStr, itemRowOptions.size);
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(amountStr, rightMargin - amountCellWidth - 10, y, itemRowOptions));

//       y -= maxHeightThisRow + itemLineSpacing / 2;
//     });

//     const minItemRows = bill.isConsigneeDifferent ? 4 : 7;
//     if (bill.items.length < minItemRows) {
//       for (let i = bill.items.length; i < minItemRows; i++) {
//         y -= itemLineSpacing;
//       }
//     }

//     // Get total boxes and cops from challan(s)
//     let totalBoxes = 0;
//     let totalCops = 0;

//     // if (bill.challan) {
//     //   totalBoxes = bill.challan.boxDetails ? bill.challan.boxDetails.length : 0;
//     //   totalCops = bill.challan.totalCops || 0;
//     // }
//     // if (bill.challans && bill.challans.length > 0) {
//     //   bill.challans.forEach(challan => {
//     //     totalBoxes += challan.boxDetails ? challan.boxDetails.length : 0;
//     //     totalCops += challan.totalCops || 0;
//     //   });
//     // }


//     if (bill.challans && bill.challans.length > 0) {
//       // Multiple challans — use this block only
//       bill.challans.forEach(challan => {
//         totalBoxes += challan.boxDetails ? challan.boxDetails.length : 0;
//         totalCops += challan.totalCops || 0;
//       });
//     } else if (bill.challan) {
//       // Single challan fallback
//       totalBoxes = bill.challan.boxDetails ? bill.challan.boxDetails.length : 0;
//       totalCops = bill.challan.totalCops || 0;
//     }

//     // Print boxes summary in Description column area
//     if (totalBoxes > 0 ) {
//       y -= drawTextAndMeasureHeight(`Boxes: ${totalBoxes}  |  ${org.terminology?.copsLabel || 'Cops'}: ${totalCops}`, colPositions.desc, y, { font: boldFont, size: 9, spacingAfter: 0, color: rgb(0.2, 0.2, 0.2) });
//     }

//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing + 1;

//     const totalsLabelX = rightMargin - 230;
//     const totalsValueX = rightMargin - 100;

//     const drawTotalLine = (label, valueStr, isBold = false) => {
//       const commonOpt = { size: 10, font: isBold ? boldFont : font, spacingAfter: 2 };
//       const labelMaxWidth = totalsValueX - totalsLabelX - 15;
//       const valueMaxWidth = rightMargin - totalsValueX - 10;

//       const hLabel = drawTextAndMeasureHeight(label, totalsLabelX, y, { ...commonOpt, maxWidth: labelMaxWidth });
//       const valWidth = (isBold ? boldFont : font).widthOfTextAtSize(valueStr, commonOpt.size);
//       const valXPos = rightMargin - valWidth - 10;
//       const hValue = drawTextAndMeasureHeight(valueStr, valXPos, y, { ...commonOpt, maxWidth: valueMaxWidth });

//       y -= Math.max(hLabel, hValue) + smallLineSpacing - commonOpt.spacingAfter;
//     };

//     page.drawRectangle({
//       x: totalsLabelX - 10,
//       y: y - 114,
//       width: rightMargin - totalsLabelX + 15,
//       height: 124,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     drawTotalLine('Subtotal', String(Math.round(bill.subTotalAmount || 0)));
//     if (bill.discountAmount > 0) {
//       drawTotalLine(`Discount (${bill.discountPercentage}%):`, `- ${String(Math.round(bill.discountAmount || 0))}`);
//     }
//     drawTotalLine('Amount After Discount:', String(Math.round(bill.amountAfterDiscount || 0)), true);

//     if (bill.taxType === 'CGST_SGST') {
//       drawTotalLine(`SGST (${bill.sgstPercentage}%):`, `+ ${String(Math.round(bill.sgstAmount || 0))}`);
//       drawTotalLine(`CGST (${bill.cgstPercentage}%):`, `+ ${String(Math.round(bill.cgstAmount || 0))}`);
//     } else if (bill.taxType === 'IGST') {
//       drawTotalLine(`IGST (${bill.igstPercentage}%):`, `+ ${String(Math.round(bill.igstAmount || 0))}`);
//     } else if (bill.taxType === 'JOBCGST_JOBSGST') {
//       drawTotalLine(`SGST (${bill.jobSgstPercentage}%):`, `+ ${String(Math.round(bill.jobSgstAmount || 0))}`);
//       drawTotalLine(`CGST (${bill.jobCgstPercentage}%):`, `+ ${String(Math.round(bill.jobCgstAmount || 0))}`);
//     }

//     y -= 5;
//     page.drawLine({ start: { x: totalsLabelX - 10, y: y + smallLineSpacing / 2 }, end: { x: rightMargin, y: y + smallLineSpacing / 2 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= 3;

//     drawTotalLine('Total Amount', String(Math.round(bill.totalAmount || 0)), true);

//     const currentTotalAmountInWords = amountToWords(bill.totalAmount || 0);
//     if (currentTotalAmountInWords && currentTotalAmountInWords !== 'Zero Rupees Only' && bill.totalAmount !== 0) {
//       const amountInWordsText = `Amount in Words: ${currentTotalAmountInWords}`;
//       y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
//         font: boldFont,
//         size: 10,
//         spacingAfter: 8,
//         maxWidth: contentWidth,
//         color: rgb(0.1, 0.1, 0.1),
//       });
//     } else if (bill.totalAmount === 0) {
//       const amountInWordsText = `Amount in Words: Zero Rupees Only`;
//       y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
//         font: boldFont,
//         size: 10,
//         spacingAfter: 8,
//         maxWidth: contentWidth,
//         color: rgb(0.1, 0.1, 0.1),
//       });
//     }
//     y -= 2;

//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing;

//     let bankDetailsY = y;
//     const bankDetailsMaxWidth = contentWidth * 0.5;
//     bankDetailsY -= drawTextAndMeasureHeight('Bank Details:', leftMargin, bankDetailsY, { font: boldFont, size: 12, spacingAfter: 4 });
//     bankDetailsY -= drawTextAndMeasureHeight(`Bank Name: ${org.bankName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`Account Name: ${org.accountName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`Account No.: ${org.accountNo}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`IFSC Code: ${org.ifsc}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 10, maxWidth: bankDetailsMaxWidth });

//     let declarationTitleY = bankDetailsY;
//     const forCompanyText = `For ${org.name}`;
//     const forCompanyFontSize = 11;
//     const forCompanyOptions = { font: boldFont, size: forCompanyFontSize, spacingAfter: 3, align: 'right' };
//     const forCompanyWidth = boldFont.widthOfTextAtSize(forCompanyText, forCompanyFontSize);

//     const declarationTitleHeight = drawTextAndMeasureHeight('Declaration:', leftMargin, declarationTitleY, { font: boldFont, size: 12, spacingAfter: 4 });
//     drawTextAndMeasureHeight(forCompanyText, rightMargin - forCompanyWidth, declarationTitleY, forCompanyOptions);
//     bankDetailsY -= declarationTitleHeight;

//     const declarationText = [
//       '1. Interest @ 2% will be charged on bills if not paid within 20 days.',
//       '2. All payments must be made by payee\'s A/C Cheque/Draft.',
//       '3. No claims will be entertained unless notified in writing within three days from the date of this bill.',
//       'Subject to Surat jurisdiction.',
//     ];

//     let lastDeclarationLineY = bankDetailsY;

//     declarationText.forEach((line, index) => {
//       const currentLineHeight = drawTextAndMeasureHeight(line, leftMargin, bankDetailsY, { size: 9, spacingAfter: 3, maxWidth: contentWidth * 0.6 });
//       bankDetailsY -= currentLineHeight;
//       if (index === declarationText.length - 1) {
//         lastDeclarationLineY = bankDetailsY + currentLineHeight - 3;
//       }
//     });

//     const authSignText = 'Authorised Signatory';
//     const authSignFontSize = 9;
//     const authSignOptions = { font: font, size: authSignFontSize, spacingAfter: 0, align: 'right' };
//     const authSignWidth = font.widthOfTextAtSize(authSignText, authSignFontSize);
//     drawTextAndMeasureHeight(authSignText, rightMargin - authSignWidth, lastDeclarationLineY, authSignOptions);

//     const forCompanyHeight = boldFont.heightAtSize(forCompanyFontSize) + 3;
//     const signatureSpaceY = declarationTitleY - forCompanyHeight - 30;
//     y = Math.min(bankDetailsY, signatureSpaceY) - lineSpacing;

//     const bottomMarginForContact = 30;
//     y = bottomMarginForContact;
//     page.drawRectangle({
//       x: leftMargin,
//       y: y - 8,
//       width: contentWidth,
//       height: 20,
//       color: rgb(0.1, 0.3, 0.5),
//       opacity: 0.1,
//     });
//     const contactText = `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
//     const contactTextWidth = font.widthOfTextAtSize(contactText, 9);
//     drawTextAndMeasureHeight(contactText, leftMargin + (contentWidth - contactTextWidth) / 2, y, { size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3) });

//     const pdfBytes = await pdfDoc.save();
//     const pdfFileName = `Bill-${bill.billNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

//     log(`PDF generated for bill ${bill.billNumber}`, 'info');

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
//     res.send(Buffer.from(pdfBytes));
//   } catch (error) {
//     log(`Error generating PDF for bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (!res.headersSent) {
//       res.status(500).json({ message: 'Server error while generating PDF bill.' });
//     }
//   }
// };

// const amountToWords = (number) => {
//     if (number === null || number === undefined || isNaN(parseInt(number, 10))) {
//         return ''; // Handle invalid input
//     }
//     let num = parseInt(number, 10); // Expecting a whole number
//     if (num === 0) return 'Zero Rupees Only';

//     const আচ্ছা = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
//     const থানা = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
//     let mainNum = num; // No decimal part to handle

//     let str = "";
//     const crore = Math.floor(mainNum / 10000000); mainNum %= 10000000;
//     const lakh = Math.floor(mainNum / 100000); mainNum %= 100000;
//     const thousand = Math.floor(mainNum / 1000); mainNum %= 1000;
//     const hundred = Math.floor(mainNum / 100); mainNum %= 100;

//     if (crore > 0) { str += (crore > 19 ? থানা[Math.floor(crore / 10)] + আচ্ছা[crore % 10] : আচ্ছা[crore]) + 'Crore '; }
//     if (lakh > 0) { str += (lakh > 19 ? থানা[Math.floor(lakh / 10)] + আচ্ছা[lakh % 10] : আচ্ছা[lakh]) + 'Lakh '; }
//     if (thousand > 0) { str += (thousand > 19 ? থানা[Math.floor(thousand / 10)] + আচ্ছা[thousand % 10] : আচ্ছা[thousand]) + 'Thousand '; }
//     if (hundred > 0) { str += (hundred > 19 ? থানা[Math.floor(hundred / 10)] + আচ্ছা[hundred % 10] : আচ্ছা[hundred]) + 'Hundred '; }
//     if (mainNum > 0) { str += (str !== "" && mainNum < 100 && str.trim() !== '' ? "and " : "") + (mainNum > 19 ? থানা[Math.floor(mainNum / 10)] + আচ্ছা[mainNum % 10] : আচ্ছা[mainNum]); }
    
//     // No decimal part (Paise) to handle as amounts are rounded
    
//     const finalStr = (str.trim() + " Rupees Only").trim();
//     // Ensure "Zero Rupees Only" if nothing else, or if the number was indeed zero.
//     return finalStr.length > "Rupees Only".length ? finalStr : "Zero Rupees Only";
// };

// // @desc    Download bills as Excel with filters
// // @route   GET /api/bills/download/excel
// // @access  Private/Admin
// const downloadBillsExcel = async (req, res) => {
//   const { companyId, startDate, endDate, status, month, year } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (companyId) query.company = companyId;
//   if (status) query.status = status;

//   if (month && year) {
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     query.billDate = { $gte: start, $lte: end };
//   } else if (startDate && endDate) {
//     query.billDate = {
//       $gte: new Date(startDate),
//       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//     };
//   } else if (startDate) {
//     query.billDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//   }

//   try {
//     const bills = await Bill.find(query)
//       .populate('company', 'name gstNumber address')
//       .populate('consignee', 'name gstNumber address')
//       .sort({ billDate: 1, billNumber: 1 });

//     if (!bills || bills.length === 0) {
//       return res.status(404).json({ message: 'No bills found matching the criteria' });
//     }

//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Bills');

//     worksheet.columns = [
//       { header: 'Bill No.', key: 'billNumber', width: 15 },
//       { header: 'Date', key: 'billDate', width: 12 },
//       { header: 'Challan No.', key: 'challanNumber', width: 15 },
//       { header: 'E-way Bill No.', key: 'eWayBillNumber', width: 18 },
//       { header: 'Payment Terms (days)', key: 'paymentTerms', width: 18 },
//       { header: 'Buyer Company Name', key: 'companyName', width: 30 },
//       { header: 'Buyer GST', key: 'companyGst', width: 20 },
//       { header: 'Buyer Address', key: 'companyAddress', width: 40 },
//       { header: 'Consignee Company Name', key: 'consigneeName', width: 30 },
//       { header: 'Consignee GST', key: 'consigneeGst', width: 20 },
//       { header: 'Consignee Address', key: 'consigneeAddress', width: 40 },
//       { header: 'Different Consignee', key: 'isConsigneeDifferent', width: 15 },
//       { header: 'Item Description', key: 'itemDescription', width: 30 },
//       { header: 'HSN/SAC', key: 'hsnSac', width: 15 },
//       { header: 'Quantity', key: 'quantity', width: 10 },
//       { header: 'Rate', key: 'rate', width: 12, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Subtotal', key: 'subtotal', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Discount %', key: 'discountPercent', width: 12 },
//       { header: 'Discount Amt', key: 'discountAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Taxable Amt', key: 'taxableAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'CGST %', key: 'cgstPercent', width: 10 },
//       { header: 'CGST Amt', key: 'cgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'SGST %', key: 'sgstPercent', width: 10 },
//       { header: 'SGST Amt', key: 'sgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'IGST %', key: 'igstPercent', width: 10 },
//       { header: 'IGST Amt', key: 'igstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'JOBCGST %', key: 'jobCgstPercent', width: 10 },
//       { header: 'JOBCGST Amt', key: 'jobCgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'JOBSGST %', key: 'jobSgstPercent', width: 10 },
//       { header: 'JOBSGST Amt', key: 'jobSgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Total Tax', key: 'totalTax', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Grand Total', key: 'grandTotal', width: 15, style: { numFmt: '₹#,##0.00' } },
//       { header: 'Amount in Words', key: 'amountInWords', width: 50 },
//       { header: 'Status', key: 'status', width: 12 }
//     ];

//     bills.forEach(bill => {
//       bill.items.forEach((item, index) => {
//         const rowData = {
//           billNumber: index === 0 ? bill.billNumber : '',
//           billDate: index === 0 ? bill.billDate.toLocaleDateString('en-IN') : '',
//           challanNumber: index === 0 ? bill.challanNumber : '',
//           eWayBillNumber: index === 0 ? (bill.eWayBillNumber || '') : '',
//           paymentTerms: index === 0 ? (bill.paymentTermsDays || '') : '',
//           companyName: index === 0 ? bill.company?.name || bill.companyDetailsSnapshot?.name : '',
//           companyGst: index === 0 ? bill.company?.gstNumber || bill.companyDetailsSnapshot?.gstNumber : '',
//           companyAddress: index === 0 ? bill.company?.address || bill.companyDetailsSnapshot?.address : '',
//           consigneeName: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.name || bill.consigneeDetailsSnapshot?.name) : 'Same as Buyer') : '',
//           consigneeGst: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.gstNumber || bill.consigneeDetailsSnapshot?.gstNumber) : '') : '',
//           consigneeAddress: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.address || bill.consigneeDetailsSnapshot?.address) : '') : '',
//           isConsigneeDifferent: index === 0 ? (bill.isConsigneeDifferent ? 'Yes' : 'No') : '',
//           itemDescription: item.description,
//           hsnSac: item.hsnSacCode,
//           quantity: item.quantity,
//           rate: item.rate,
//           amount: item.amount,
//           subtotal: index === 0 ? bill.subTotalAmount : '',
//           discountPercent: index === 0 ? bill.discountPercentage : '',
//           discountAmt: index === 0 ? bill.discountAmount : '',
//           taxableAmt: index === 0 ? bill.amountAfterDiscount : '',
//           cgstPercent: index === 0 ? (bill.taxType === 'CGST_SGST' ? bill.cgstPercentage : '') : '',
//           cgstAmt: index === 0 ? bill.cgstAmount : '',
//           sgstPercent: index === 0 ? (bill.taxType === 'CGST_SGST' ? bill.sgstPercentage : '') : '',
//           sgstAmt: index === 0 ? bill.sgstAmount : '',
//           igstPercent: index === 0 ? (bill.taxType === 'IGST' ? bill.igstPercentage : '') : '',
//           igstAmt: index === 0 ? bill.igstAmount : '',
//           jobCgstPercent: index === 0 ? (bill.taxType === 'JOBCGST_JOBSGST' ? bill.jobCgstPercentage : '') : '',
//           jobCgstAmt: index === 0 ? bill.jobCgstAmount : '',
//           jobSgstPercent: index === 0 ? (bill.taxType === 'JOBCGST_JOBSGST' ? bill.jobSgstPercentage : '') : '',
//           jobSgstAmt: index === 0 ? bill.jobSgstAmount : '',
//           totalTax: index === 0 ? bill.totalTaxAmount : '',
//           grandTotal: index === 0 ? bill.totalAmount : '',
//           amountInWords: index === 0 ? bill.amountInWords : '',
//           status: index === 0 ? bill.status : ''
//         };
//         worksheet.addRow(rowData);
//       });

//       worksheet.addRow([]);
//     });

//     const headerRow = worksheet.getRow(1);
//     headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
//     headerRow.fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: '4F81BD' }
//     };
//     headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

//     worksheet.views = [{ state: 'frozen', ySplit: 1 }];

//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     );

//     let fileName = 'Bills';
//     if (month && year) {
//       fileName += `_${month}-${year}`;
//     } else if (startDate && endDate) {
//       fileName += `_${startDate}_to_${endDate}`;
//     } else if (companyId) {
//       fileName += `_Company_${companyId}`;
//     }
//     fileName += '.xlsx';

//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=${fileName}`
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     log(`Error generating Excel: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Error generating Excel file' });
//   }
// };

// // @desc    Download bills as PDF with filters
// // @route   GET /api/bills/download/pdf
// // @access  Private/Admin
// const downloadBillsPdf = async (req, res) => {
//   const { companyId, startDate, endDate, status, month, year } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (companyId) query.company = companyId;
//   if (status) query.status = status;

//   if (month && year) {
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     query.billDate = { $gte: start, $lte: end };
//   } else if (startDate && endDate) {
//     query.billDate = {
//       $gte: new Date(startDate),
//       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//     };
//   } else if (startDate) {
//     query.billDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//   }

//   try {
//     const bills = await Bill.find(query)
//       .populate('company', 'name gstNumber address')
//       .populate('consignee', 'name gstNumber address')
//       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
//       .sort({ billDate: 1, billNumber: 1 });

//     if (!bills || bills.length === 0) {
//       log(`PDF generation failed: No bills found matching query ${JSON.stringify(query)}`, 'warn');
//       return res.status(404).json({ message: 'No bills found matching the criteria' });
//     }

//     const pdfDoc = await PDFDocument.create();
//     pdfDoc.registerFontkit(fontkit);

//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     let page = pdfDoc.addPage(PageSizes.A4);
//     const { width, height } = page.getSize();
//     const margin = 40;
//     const maxY = margin + 20;

//     const drawText = (text, x, y, size = 10, isBold = false) => {
//       const safeText = String(text || '').replace(/₹/g, 'Rs. ');
//       const currentFont = isBold ? boldFont : font;

//       page.drawText(safeText, {
//         x,
//         y,
//         size,
//         font: currentFont
//       });

//       return currentFont.heightAtSize(size);
//     };

//     const drawCenteredText = (text, x, width, y, size = 10, isBold = false) => {
//       const safeText = String(text || '').replace(/₹/g, 'Rs. ');
//       const currentFont = isBold ? boldFont : font;
//       const textWidth = currentFont.widthOfTextAtSize(safeText, size);
//       const centeredX = x + (width - textWidth) / 2;

//       page.drawText(safeText, {
//         x: centeredX,
//         y,
//         size,
//         font: currentFont
//       });

//       return currentFont.heightAtSize(size);
//     };

//     const drawRightAlignedText = (text, x, width, y, size = 10, isBold = false) => {
//       const safeText = String(text || '').replace(/₹/g, 'Rs. ');
//       const currentFont = isBold ? boldFont : font;
//       const textWidth = currentFont.widthOfTextAtSize(safeText, size);
//       const rightX = x + width - textWidth - 3;

//       page.drawText(safeText, {
//         x: rightX,
//         y,
//         size,
//         font: currentFont
//       });

//       return currentFont.heightAtSize(size);
//     };

//     let currentY = height - margin;
//     const checkPageBreak = (requiredHeight) => {
//       if (currentY - requiredHeight < maxY) {
//         drawCenteredText('Continued on next page...', margin, width - margin * 2, maxY, 8, false);
//         page = pdfDoc.addPage(PageSizes.A4);
//         currentY = height - margin;
//         return true;
//       }
//       return false;
//     };

//     // Draw report header
//     let reportTitle = 'BILLS REPORT';
//     if (month && year) {
//       reportTitle += ` (${month}/${year})`;
//     } else if (startDate && endDate) {
//       reportTitle += ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})`;
//     }
    
//     checkPageBreak(40);
//     currentY -= drawCenteredText(reportTitle, margin, width - margin * 2, currentY, 16, true) + 20;

//     // Calculate dynamic column widths based on A4 size
//     const tableWidth = width - margin * 2;
    
//     // Define columns with optimized widths for A4 (total = 515)
//     const colWidths = {
//       srNo: 20,
//       billNumber: 60,
//       billDate: 60,
//       companyName: 100,
//       consigneeInfo: 90,
//       taxableAmt: 50,
//       gst1: 40,
//       gst2: 40,
//       totalTax: 50,
//       grandTotal: 65
//     };

//     const totalTableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
//     const startX = margin + (tableWidth - totalTableWidth) / 2;

//     // Determine GST columns based on first bill
//     let gst1Label = 'CGST';
//     let gst2Label = 'SGST';
//     let showGst2 = true;
    
//     if (bills.length > 0) {
//       const firstBill = bills[0];
//       if (firstBill.taxType === 'IGST') {
//         gst1Label = 'IGST';
//         gst2Label = '';
//         showGst2 = false;
//       } else if (firstBill.taxType === 'JOBCGST_JOBSGST') {
//         gst1Label = 'JOBCGST';
//         gst2Label = 'JOBSGST';
//       }
//     }

//     // Build headers array
//     const headers = [
//       { key: 'srNo', label: 'Sr.', width: colWidths.srNo, align: 'center' },
//       { key: 'billNumber', label: 'Bill No.', width: colWidths.billNumber, align: 'left' },
//       { key: 'billDate', label: 'Date', width: colWidths.billDate, align: 'center' },
//       { key: 'companyName', label: 'Buyer', width: colWidths.companyName, align: 'left' },
//       { key: 'consigneeInfo', label: 'Consignee', width: colWidths.consigneeInfo, align: 'left' },
//       { key: 'taxableAmt', label: 'Taxable', width: colWidths.taxableAmt, align: 'right' },
//       { key: 'gst1', label: gst1Label, width: colWidths.gst1, align: 'right' },
//       { key: 'gst2', label: gst2Label, width: colWidths.gst2, align: 'right', show: showGst2 },
//       { key: 'totalTax', label: 'Total Tax', width: colWidths.totalTax, align: 'right' },
//       { key: 'grandTotal', label: 'Grand Total', width: colWidths.grandTotal, align: 'right' }
//     ];

//     // Calculate x positions
//     let xPos = startX;
//     headers.forEach(header => {
//       header.x = xPos;
//       xPos += header.width;
//     });

//     // Draw table header background
//     checkPageBreak(30);
//     const headerHeight = 22;
//     page.drawRectangle({
//       x: startX,
//       y: currentY - headerHeight,
//       width: totalTableWidth,
//       height: headerHeight,
//       color: rgb(0.85, 0.85, 0.85)
//     });

//     // Draw vertical lines for header
//     let lineX = startX;
//     headers.forEach((header, index) => {
//       page.drawLine({
//         start: { x: lineX, y: currentY },
//         end: { x: lineX, y: currentY - headerHeight },
//         thickness: 0.5,
//         color: rgb(0.4, 0.4, 0.4)
//       });
//       lineX += header.width;
//     });
//     // Last vertical line
//     page.drawLine({
//       start: { x: lineX, y: currentY },
//       end: { x: lineX, y: currentY - headerHeight },
//       thickness: 0.5,
//       color: rgb(0.4, 0.4, 0.4)
//     });

//     // Draw header text
//     const headerTextY = currentY - 15;
//     headers.forEach(header => {
//       if (header.show !== false) {
//         if (header.align === 'center') {
//           drawCenteredText(header.label, header.x, header.width, headerTextY, 9, true);
//         } else if (header.align === 'right') {
//           drawRightAlignedText(header.label, header.x, header.width, headerTextY, 9, true);
//         } else {
//           drawText(header.label, header.x + 3, headerTextY, 9, true);
//         }
//       }
//     });

//     currentY -= headerHeight;
    
//     // Header bottom line
//     page.drawLine({
//       start: { x: startX, y: currentY },
//       end: { x: startX + totalTableWidth, y: currentY },
//       thickness: 1.5,
//       color: rgb(0.3, 0.3, 0.3)
//     });

//     // Draw table rows
//     const rowHeight = 20;
//     bills.forEach((bill, index) => {
//       checkPageBreak(rowHeight + 5);
      
//       // Alternating row background
//       if (index % 2 === 1) {
//         page.drawRectangle({
//           x: startX,
//           y: currentY - rowHeight,
//           width: totalTableWidth,
//           height: rowHeight,
//           color: rgb(0.97, 0.97, 0.97)
//         });
//       }

//       // Draw vertical lines for row
//       lineX = startX;
//       headers.forEach((header, idx) => {
//         page.drawLine({
//           start: { x: lineX, y: currentY },
//           end: { x: lineX, y: currentY - rowHeight },
//           thickness: 0.3,
//           color: rgb(0.7, 0.7, 0.7)
//         });
//         lineX += header.width;
//       });
//       // Last vertical line
//       page.drawLine({
//         start: { x: lineX, y: currentY },
//         end: { x: lineX, y: currentY - rowHeight },
//         thickness: 0.3,
//         color: rgb(0.7, 0.7, 0.7)
//       });

//       const consigneeInfo = bill.isConsigneeDifferent ? 
//         (bill.consignee?.name?.substring(0, 12) || 'Different') : 'Same';

//       // Get GST values based on tax type
//       let gst1Value = '';
//       let gst2Value = '';
      
//       if (bill.taxType === 'CGST_SGST') {
//         gst1Value = Math.round(bill.cgstAmount || 0).toFixed(2);
//         gst2Value = Math.round(bill.sgstAmount || 0).toFixed(2);
//       } else if (bill.taxType === 'IGST') {
//         gst1Value = Math.round(bill.igstAmount || 0).toFixed(2);
//         gst2Value = '';
//       } else if (bill.taxType === 'JOBCGST_JOBSGST') {
//         gst1Value = Math.round(bill.jobCgstAmount || 0).toFixed(2);
//         gst2Value = Math.round(bill.jobSgstAmount || 0).toFixed(2);
//       }

//       const rowData = {
//         srNo: (index + 1).toString(),
//         billNumber: bill.billNumber || 'N/A',
//         billDate: bill.billDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }),
//         companyName: (bill.company?.name || bill.companyDetailsSnapshot?.name || 'N/A').substring(0, 16),
//         consigneeInfo: consigneeInfo,
//         taxableAmt: Math.round(bill.amountAfterDiscount || 0).toFixed(2),
//         gst1: gst1Value,
//         gst2: gst2Value,
//         totalTax: Math.round(bill.totalTaxAmount || 0).toFixed(2),
//         grandTotal: Math.round(bill.totalAmount || 0).toFixed(2)
//       };

//       // Draw row data with proper alignment
//       const rowTextY = currentY - 14;
//       headers.forEach(header => {
//         if (header.show !== false) {
//           const value = rowData[header.key];
//           if (header.align === 'center') {
//             drawCenteredText(value, header.x, header.width, rowTextY, 8.5, false);
//           } else if (header.align === 'right') {
//             drawRightAlignedText(value, header.x, header.width, rowTextY, 8.5, false);
//           } else {
//             drawText(value, header.x + 3, rowTextY, 8.5, false);
//           }
//         }
//       });

//       currentY -= rowHeight;
      
//       // Row bottom line
//       page.drawLine({
//         start: { x: startX, y: currentY },
//         end: { x: startX + totalTableWidth, y: currentY },
//         thickness: 0.3,
//         color: rgb(0.7, 0.7, 0.7)
//       });
//     });

//     // Draw summary section
//     checkPageBreak(rowHeight + 10);
    
//     page.drawRectangle({
//       x: startX,
//       y: currentY - rowHeight,
//       width: totalTableWidth,
//       height: rowHeight,
//       color: rgb(0.9, 0.9, 0.9)
//     });

//     // Draw vertical lines for total row
//     lineX = startX;
//     headers.forEach((header) => {
//       page.drawLine({
//         start: { x: lineX, y: currentY },
//         end: { x: lineX, y: currentY - rowHeight },
//         thickness: 0.5,
//         color: rgb(0.4, 0.4, 0.4)
//       });
//       lineX += header.width;
//     });
//     page.drawLine({
//       start: { x: lineX, y: currentY },
//       end: { x: lineX, y: currentY - rowHeight },
//       thickness: 0.5,
//       color: rgb(0.4, 0.4, 0.4)
//     });

//     const totalTaxable = bills.reduce((sum, bill) => sum + (bill.amountAfterDiscount || 0), 0);
//     const totalGst1 = bills.reduce((sum, bill) => {
//       if (bill.taxType === 'CGST_SGST') return sum + (bill.cgstAmount || 0);
//       if (bill.taxType === 'IGST') return sum + (bill.igstAmount || 0);
//       if (bill.taxType === 'JOBCGST_JOBSGST') return sum + (bill.jobCgstAmount || 0);
//       return sum;
//     }, 0);
//     const totalGst2 = bills.reduce((sum, bill) => {
//       if (bill.taxType === 'CGST_SGST') return sum + (bill.sgstAmount || 0);
//       if (bill.taxType === 'JOBCGST_JOBSGST') return sum + (bill.jobSgstAmount || 0);
//       return sum;
//     }, 0);
//     const totalTax = bills.reduce((sum, bill) => sum + (bill.totalTaxAmount || 0), 0);
//     const grandTotal = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

//     const totalY = currentY - 14;
//     drawText('TOTAL:', startX + colWidths.srNo + 3, totalY, 9, true);
    
//     // Find the taxable amount column and draw totals
//     const taxableHeader = headers.find(h => h.key === 'taxableAmt');
//     drawRightAlignedText(Math.round(totalTaxable).toFixed(2), taxableHeader.x, taxableHeader.width, totalY, 9, true);
    
//     const gst1Header = headers.find(h => h.key === 'gst1');
//     drawRightAlignedText(Math.round(totalGst1).toFixed(2), gst1Header.x, gst1Header.width, totalY, 9, true);
    
//     if (showGst2) {
//       const gst2Header = headers.find(h => h.key === 'gst2');
//       drawRightAlignedText(Math.round(totalGst2).toFixed(2), gst2Header.x, gst2Header.width, totalY, 9, true);
//     }
    
//     const totalTaxHeader = headers.find(h => h.key === 'totalTax');
//     drawRightAlignedText(Math.round(totalTax).toFixed(2), totalTaxHeader.x, totalTaxHeader.width, totalY, 9, true);
    
//     const grandTotalHeader = headers.find(h => h.key === 'grandTotal');
//     drawRightAlignedText(Math.round(grandTotal).toFixed(2), grandTotalHeader.x, grandTotalHeader.width, totalY, 9, true);

//     currentY -= rowHeight;
//     page.drawLine({
//       start: { x: startX, y: currentY },
//       end: { x: startX + totalTableWidth, y: currentY },
//       thickness: 1.5,
//       color: rgb(0.3, 0.3, 0.3)
//     });

//     currentY -= 25;

//     // Footer
//     checkPageBreak(20);
//     const footerText = `Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} by ${req.user.email}`;
//     drawCenteredText(footerText, margin, width - margin * 2, currentY, 8, false);

//     // Save PDF
//     const pdfBytes = await pdfDoc.save();

//     let fileName = 'Bills_Report';
//     if (month && year) {
//       fileName += `_${month}-${year}`;
//     } else if (startDate && endDate) {
//       fileName += `_${startDate}_to_${endDate}`;
//     } else if (companyId) {
//       fileName += `_Company_${companyId}`;
//     }
//     fileName += '.pdf';

//     log(`PDF report generated: ${fileName}`, 'info');

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
//     res.send(Buffer.from(pdfBytes));
    
//   } catch (error) {
//     log(`Error generating PDF report: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (!res.headersSent) {
//       res.status(500).json({ message: 'Server error while generating PDF report.' });
//     }
//   }
// };

// const createBillFromChallans = async (req, res) => {
//   let {
//     billNumber,
//     billDate,
//     companyId,
//     challanIds = [],
//     discountPercentage = 0,
//     taxType,
//     overrideCgstPercentage,
//     overrideSgstPercentage,
//     overrideIgstPercentage,
//     overrideJobCgstPercentage,
//     overrideJobSgstPercentage,
//     status,
//     amountInWords,
//     eWayBillNumber = '',
//     paymentTermsDays = 30,
//     financialYear
//   } = req.body;

//   if (!companyId || !challanIds.length || !taxType) {
//     return res.status(400).json({
//       message: 'companyId, challanIds and taxType are required.'
//     });
//   }

//   if (!['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'].includes(taxType)) {
//     return res.status(400).json({ message: 'Invalid tax type' });
//   }

//   try {
//     const resolvedDate = billDate ? new Date(billDate) : new Date();
//     const resolvedFY = financialYear || getFinancialYear(resolvedDate);

//     if (!billNumber) {
//       billNumber = await generateBillNumber(resolvedFY, req.organizationId);
//     } else {
//       const expectedPrefix = `${resolvedFY}/`;
//       if (!billNumber.startsWith(expectedPrefix)) {
//         return res.status(400).json({
//           message: `Bill number must follow format "${expectedPrefix}XX"`
//         });
//       }
//     }

//     const challans = await Challan.find({
//       _id: { $in: challanIds },
//       company: companyId
//     });

//     if (challans.length !== challanIds.length) {
//       return res.status(400).json({
//         message: 'Some challans not found or not belong to company'
//       });
//     }

//     for (const challan of challans) {
//       if (challan.financialYear !== resolvedFY) {
//         return res.status(400).json({
//           message: `Challan ${challan.challanNumber} belongs to different financial year`
//         });
//       }
//       if (challan.isUsed) {
//         return res.status(400).json({
//           message: `Challan ${challan.challanNumber} already used`
//         });
//       }
//     }

//     const settings = await Settings.getSettings(req.organizationId);
//     const items = [];

//     for (const challan of challans) {
//       const itemConfig = settings.itemConfigurations.find(
//         item => item.description === challan.descriptionOfGoods
//       );

//       const rate = itemConfig?.defaultRate || 0;

//       items.push({
//         description: challan.descriptionOfGoods,
//         hsnSacCode: itemConfig?.hsnSacCode || '',
//         quantity: challan.totalNetWeight,
//         rate,
//         amount: Math.round(challan.totalNetWeight * rate),
//       });
//     }

//     const calculated = calculateBillTotals(
//       items,
//       discountPercentage,
//       taxType,
//       overrideCgstPercentage ?? settings.cgstPercentage,
//       overrideSgstPercentage ?? settings.sgstPercentage,
//       overrideIgstPercentage ?? settings.igstPercentage,
//       overrideJobCgstPercentage ?? settings.jobCgstPercentage,
//       overrideJobSgstPercentage ?? settings.jobSgstPercentage
//     );

//     const newBill = new Bill({
//       organizationId: req.organizationId,
//       billNumber,
//       financialYear: resolvedFY,
//       billDate: resolvedDate,
//       company: companyId,
//       challans: challanIds,
//       challanNumber: challans.map(c => c.challanNumber).join(', '),
//       items: calculated.items,
//       subTotalAmount: calculated.subTotalAmount,
//       discountPercentage,
//       discountAmount: calculated.discountAmount,
//       amountAfterDiscount: calculated.amountAfterDiscount,
//       taxType,
//       cgstAmount: calculated.cgstAmount,
//       sgstAmount: calculated.sgstAmount,
//       igstAmount: calculated.igstAmount,
//       jobCgstAmount: calculated.jobCgstAmount,
//       jobSgstAmount: calculated.jobSgstAmount,
//       totalTaxAmount: calculated.totalTaxAmount,
//       roundOffAmount: calculated.roundOffAmount,
//       totalAmount: calculated.totalAmount,
//       amountInWords,
//       eWayBillNumber,
//       paymentTermsDays,
//       status: status || 'Pending',
//       createdBy: req.user._id,
//     });

//     const savedBill = await newBill.save();

//     await Challan.updateMany(
//       { _id: { $in: challanIds } },
//       { isUsed: true, bill: savedBill._id }
//     );

//     res.status(201).json(savedBill);

//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({
//         message: `Bill number '${billNumber}' already exists.`
//       });
//     }

//     res.status(500).json({
//       message: 'Server error while creating bill from challans.'
//     });
//   }
// };

// module.exports = {
//   createBill,
//   getBills,
//   getBillById,
//   updateBill,
//   deleteBill,
//   generateBillExcel,
//   generateBillPdf,
//   downloadBillsExcel,
//   downloadBillsPdf,
//   getAvailableChallans,
//   createBillFromChallans,
//   getNextBillNumber // ✅ IMPORTANT
// };


//

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
const fontkit = require('fontkit');
const { getOrgDetails } = require('../utils/orgDetails');

const getNextBillNumber = async (req, res) => {
  try {
    const financialYear = req.query.financialYear || getFinancialYear();
    const billNumber = await generateBillNumber(financialYear, req.organizationId);

    res.json({ billNumber, financialYear });
  } catch (error) {
    res.status(500).json({ message: 'Error generating bill number' });
  }
};
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();

  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

// ===============================
// ✅ GENERATE BILL NUMBER
// ===============================
// const generateBillNumber = async (financialYear, organizationId) => {
//   const prefix = `${financialYear}/`;

//   const lastBill = await Bill.findOne({
//     billNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
//     organizationId,
//   }).sort({ billNumber: -1 });

//   let nextSeq = 1;

//   if (lastBill) {
//     const parts = lastBill.billNumber.split('/');
//     const lastSeq = parseInt(parts[parts.length - 1], 10);
//     if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
//   }

//   return `${prefix}${String(nextSeq).padStart(2, '0')}`;
// };

const generateBillNumber = async (financialYear, organizationId) => {
  const prefix = `${financialYear}/`;

  const bills = await Bill.find({
    billNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
    organizationId,
  }).select("billNumber");

  let maxSeq = 0;

  bills.forEach((bill) => {
    const parts = bill.billNumber.split('/');
    const seq = parseInt(parts[parts.length - 1], 10);

    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;

  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
};

const calculateBillTotals = (

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

    const amount = Number((quantity * rate).toFixed(2));
    subTotalAmount += amount;

    return {
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity,
      rate,
      amount
    };
  });

  subTotalAmount = Number(subTotalAmount.toFixed(2));

  const discountAmount = Number(
    (subTotalAmount * (Number(discountPercentage || 0) / 100)).toFixed(2)
  );

  const amountAfterDiscount = Number(
    (subTotalAmount - discountAmount).toFixed(2)
  );

  let cgstAmount = 0,
      sgstAmount = 0,
      igstAmount = 0,
      jobCgstAmount = 0,
      jobSgstAmount = 0;

  if (taxType === 'CGST_SGST') {

    cgstAmount = Number(
      (amountAfterDiscount * (Number(cgstPercentage || 0) / 100)).toFixed(2)
    );

    sgstAmount = Number(
      (amountAfterDiscount * (Number(sgstPercentage || 0) / 100)).toFixed(2)
    );
  }

  if (taxType === 'IGST') {
    igstAmount = Number(
      (amountAfterDiscount * (Number(igstPercentage || 0) / 100)).toFixed(2)
    );
  }

  if (taxType === 'JOBCGST_JOBSGST') {

    jobCgstAmount = Number(
      (amountAfterDiscount * (Number(jobCgstPercentage || 0) / 100)).toFixed(2)
    );

    jobSgstAmount = Number(
      (amountAfterDiscount * (Number(jobSgstPercentage || 0) / 100)).toFixed(2)
    );
  }

  const totalTaxAmount = Number(
    (cgstAmount + sgstAmount + igstAmount + jobCgstAmount + jobSgstAmount).toFixed(2)
  );

  const rawTotalAmount = Number(
    (amountAfterDiscount + totalTaxAmount).toFixed(2)
  );

  const totalAmount = Math.round(rawTotalAmount);

  const roundOffAmount = Number(
    (totalAmount - rawTotalAmount).toFixed(2)
  );

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
    roundOffAmount,
    totalAmount
  };
};

const getAvailableChallans = async (req, res) => {
  const { companyId } = req.params;
  const { financialYear } = req.query;

  try {
    if (!companyId) {
      return res.status(400).json({ message: "Company ID required" });
    }

    const billQuery = { company: companyId };
    if (financialYear) {
      billQuery.financialYear = financialYear;
    }

    const bills = await Bill.find(billQuery).select("challan challans");

    const usedChallanIds = new Set();

    bills.forEach(b => {
      if (b.challan) {
        usedChallanIds.add(b.challan.toString());
      }
      if (Array.isArray(b.challans)) {
        b.challans.forEach(id => {
          usedChallanIds.add(id.toString());
        });
      }
    });

    const challanQuery = {
      company: companyId,
      isUsed: false,
      _id: { $nin: Array.from(usedChallanIds) }
    };

    if (financialYear) {
      challanQuery.financialYear = financialYear;
    }

    const challans = await Challan.find(challanQuery)
      .select("challanNumber challanDate descriptionOfGoods totalNetWeight totalCops");

    console.log("Available Challans:", challans.length);

    res.json(challans);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching challans" });
  }
};

const createBill = async (req, res) => {
  let {
    billNumber,
    billDate,
    companyId,
    consigneeId,
    isConsigneeDifferent,
    challanId,
    challanIds,
    items,
    rate,
    discountPercentage = 0,
    taxType,
    financialYear,
    paymentTermsDays = 30,
    eWayBillNumber,
    status,
    amountInWords,
    totalBoxes,
    totalCops,
  } = req.body;

  if (!companyId || (!challanId && (!challanIds || challanIds.length === 0) && (!items || items.length === 0))) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const resolvedDate = billDate ? new Date(billDate) : new Date();
    const resolvedFY = financialYear || getFinancialYear(resolvedDate);

    if (!billNumber) {
      billNumber = await generateBillNumber(resolvedFY, req.organizationId);
    }

    // ✅ Duplicate validation
    const existingBill = await Bill.findOne({
      billNumber,
      organizationId: req.organizationId,
    });

    if (existingBill) {
      return res.status(400).json({
        message: `Bill number '${billNumber}' already exists.`,
      });
    }

    let finalItems = items || [];
    let challan = null;
    let challansList = [];
    let challanNumbers = [];

    if (challanIds && challanIds.length > 0) {
      const challans = await Challan.find({ _id: { $in: challanIds } });

      if (challans.length !== challanIds.length) {
        return res.status(400).json({ message: 'Some challans not found' });
      }

      for (const ch of challans) {
        if (ch.financialYear !== resolvedFY) {
          return res.status(400).json({ message: `Challan ${ch.challanNumber} belongs to different financial year` });
        }
        if (ch.isUsed) {
          return res.status(400).json({ message: `Challan ${ch.challanNumber} already used` });
        }
      }

      const settings = await Settings.getSettings(req.organizationId);

      const itemMap = new Map();

      for (const ch of challans) {
        const itemConfig = settings.itemConfigurations.find(
          i => i.description === ch.descriptionOfGoods
        );

        const frontendItem = Array.isArray(items) ? items.find(it => it.description === ch.descriptionOfGoods) : null;
        const itemRate = frontendItem?.rate || rate || itemConfig?.defaultRate || 0;
        const itemQty = ch.totalNetWeight;

        if (itemMap.has(ch.descriptionOfGoods)) {
          const existing = itemMap.get(ch.descriptionOfGoods);
          existing.quantity = parseFloat((existing.quantity + itemQty).toFixed(2));
        } else {
          itemMap.set(ch.descriptionOfGoods, {
            description: ch.descriptionOfGoods,
            hsnSacCode: itemConfig?.hsnSacCode || '',
            quantity: itemQty,
            rate: itemRate,
            amount: parseFloat((itemQty * itemRate).toFixed(2)),
          });
        }

        challansList.push(ch._id);
        challanNumbers.push(ch.challanNumber);
      }

      finalItems = Array.from(itemMap.values());
      finalItems.forEach(item => {
        item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
      });

      challan = challans[0];
    } else if (challanId) {
      challan = await Challan.findById(challanId);

      if (!challan) {
        return res.status(404).json({ message: 'Challan not found' });
      }

      if (challan.financialYear !== resolvedFY) {
        return res.status(400).json({ message: 'Challan belongs to different financial year' });
      }

      if (challan.isUsed) {
        return res.status(400).json({ message: `Challan ${challan.challanNumber} already used` });
      }

      const settings = await Settings.getSettings(req.organizationId);

      const itemConfig = settings.itemConfigurations.find(
        i => i.description === challan.descriptionOfGoods
      );

      const frontendItem = Array.isArray(items) ? items.find(it => it.description === challan.descriptionOfGoods) : null;
      const itemRate = frontendItem?.rate || rate || itemConfig?.defaultRate || 0;
      const itemQty = challan.totalNetWeight;

      finalItems = [{
        description: challan.descriptionOfGoods,
        hsnSacCode: itemConfig?.hsnSacCode || '',
        quantity: itemQty,
        rate: itemRate,
        amount: parseFloat((itemQty * itemRate).toFixed(2)),
      }];

      challansList = [challanId];
      challanNumbers = [challan.challanNumber];
    }

    const calculated = calculateBillTotals(
      finalItems,
      discountPercentage,
      taxType,
      0, 0, 0, 0, 0
    );

    let consigneeDetailsSnapshot = null;
    if (isConsigneeDifferent && consigneeId) {
      const consignee = await Company.findById(consigneeId);
      if (!consignee) {
        return res.status(404).json({ message: 'Consignee company not found.' });
      }

      const consigneeStateCode = consignee.gstNumber && consignee.gstNumber.length >= 2 ?
        consignee.gstNumber.substring(0, 2) : '';

      consigneeDetailsSnapshot = {
        name: consignee.name,
        address: consignee.address,
        gstNumber: consignee.gstNumber,
        stateCode: consigneeStateCode,
      };
    }

    const resolvedChallanNumber = challanNumbers.join(', ') || challan?.challanNumber || req.body.challanNumber || '';

    const newBill = new Bill({
      organizationId: req.organizationId,
      billNumber,
      financialYear: resolvedFY,
      billDate: resolvedDate,
      company: companyId,
      isConsigneeDifferent: !!(isConsigneeDifferent && consigneeId),
      consignee: (isConsigneeDifferent && consigneeId) ? consigneeId : null,
      consigneeDetailsSnapshot,
      challan: challanId || null,
      challans: challansList.length > 0 ? challansList : undefined,
      challanNumber: resolvedChallanNumber,
      totalBoxes: totalBoxes || 0,
      totalCops: totalCops || 0,
      items: calculated.items,
      subTotalAmount: calculated.subTotalAmount,
      discountPercentage,
      discountAmount: calculated.discountAmount,
      amountAfterDiscount: calculated.amountAfterDiscount,
      taxType,
      totalTaxAmount: calculated.totalTaxAmount,
      roundOffAmount: calculated.roundOffAmount,
      totalAmount: calculated.totalAmount,
      paymentTermsDays: parseInt(paymentTermsDays, 10) || 30,
      eWayBillNumber: eWayBillNumber || '',
      status: status || 'Pending',
      amountInWords: amountInWords || '',
      createdBy: req.user._id,
    });

    const savedBill = await newBill.save();

    if (challanId) {
      await Challan.findByIdAndUpdate(challanId, {
        isUsed: true,
        bill: savedBill._id,
      });
    }

    if (challanIds && challanIds.length > 0) {
      await Challan.updateMany(
        { _id: { $in: challanIds } },
        { isUsed: true, bill: savedBill._id }
      );
    }

    res.status(201).json(savedBill);

  } catch (error) {
    console.error('Bill creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate bill number error. This bill number already exists in this organization.',
        error: error.message 
      });
    }
    
    res.status(500).json({ message: 'Error creating bill', error: error.message });
  }
};

// @desc    Update bill
// @route   PUT /api/bills/:id
const updateBill = async (req, res) => {
  const billId = req.params.id;
  const {
    billNumber,
    billDate,
    companyId,
    consigneeId,
    isConsigneeDifferent,
    challanId,
    challanIds,
    challanNumber,
    items,
    discountPercentage,
    taxType,
    overrideCgstPercentage,
    overrideSgstPercentage,
    overrideIgstPercentage,
    overrideJobCgstPercentage,
    overrideJobSgstPercentage,
    status,
    amountInWords,
    paymentRecords,
    rate,
    eWayBillNumber,
    paymentTermsDays,
    totalBoxes,
    totalCops
  } = req.body;

  try {
    const bill = await Bill.findById(billId);
    if (!bill) {
      log(`Bill update failed: Not found with ID: ${billId}`, 'warn');
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (challanId !== undefined && challanId !== bill.challan?.toString()) {
      if (bill.challan) {
        await Challan.findByIdAndUpdate(
          bill.challan,
          { isUsed: false, bill: null },
          { new: true }
        );
        log(`Previous challan ${bill.challan} reset for bill ${bill.billNumber}`, 'info');
      }
    }

    if (challanIds !== undefined) {
      const oldChallans = bill.challans || [];
      if (oldChallans.length > 0) {
        await Challan.updateMany(
          { _id: { $in: oldChallans } },
          { isUsed: false, bill: null }
        );
        log(`Previous challans reset for bill ${bill.billNumber}`, 'info');
      }
    }

    let needsRecalculation = false;

    if (billNumber !== undefined && bill.billNumber !== billNumber) {
      const existingBillWithNewNumber = await Bill.findOne({ 
        billNumber,
        organizationId: req.organizationId 
      });
      if (existingBillWithNewNumber && existingBillWithNewNumber._id.toString() !== billId) {
        return res.status(400).json({ message: `Bill number '${billNumber}' already exists in this organization.` });
      }
      bill.billNumber = billNumber;
    }
    if (billDate !== undefined) bill.billDate = new Date(billDate);
    if (status !== undefined) bill.status = status;
    if (amountInWords !== undefined) bill.amountInWords = amountInWords;
    if (eWayBillNumber !== undefined) bill.eWayBillNumber = eWayBillNumber;
    if (paymentTermsDays !== undefined) bill.paymentTermsDays = parseInt(paymentTermsDays, 10) || 30;

    if (companyId !== undefined && bill.company.toString() !== companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'New company not found.' });
      }
      bill.company = companyId;
      bill.companyDetailsSnapshot = {
        name: company.name,
        address: company.address,
        gstNumber: company.gstNumber,
      };
    }

    if (isConsigneeDifferent !== undefined) {
      bill.isConsigneeDifferent = isConsigneeDifferent;
      
      if (isConsigneeDifferent && consigneeId) {
        const consignee = await Company.findById(consigneeId);
        if (!consignee) {
          return res.status(404).json({ message: 'Consignee company not found.' });
        }
        
        const consigneeStateCode = consignee.gstNumber && consignee.gstNumber.length >= 2 ? 
          consignee.gstNumber.substring(0, 2) : '';
        
        bill.consignee = consigneeId;
        bill.consigneeDetailsSnapshot = {
          name: consignee.name,
          address: consignee.address,
          gstNumber: consignee.gstNumber,
          stateCode: consigneeStateCode,
        };
      } else {
        bill.consignee = null;
        bill.consigneeDetailsSnapshot = null;
      }
    }

    if (challanIds && challanIds.length > 0) {
      const challans = await Challan.find({ _id: { $in: challanIds } });

      if (challans.length !== challanIds.length) {
        return res.status(400).json({ message: 'Some challans not found.' });
      }

      for (const ch of challans) {
        if (ch.company.toString() !== (companyId || bill.company.toString())) {
          return res.status(400).json({ message: `Challan ${ch.challanNumber} does not belong to the selected company.` });
        }
        if (ch.isUsed && ch.bill?.toString() !== billId) {
          return res.status(400).json({ message: `Challan ${ch.challanNumber} is already used in another bill.` });
        }
      }

      const settings = await Settings.getSettings(req.organizationId);
      const itemMap = new Map();

      for (const ch of challans) {
        const itemConfig = settings.itemConfigurations.find(item => item.description === ch.descriptionOfGoods);
        const frontendItem = Array.isArray(items) ? items.find(it => it.description === ch.descriptionOfGoods) : null;
        const itemRate = frontendItem?.rate || parseFloat(rate) || itemConfig?.defaultRate || 0;
        const itemQty = ch.totalNetWeight;

        if (itemMap.has(ch.descriptionOfGoods)) {
          const existing = itemMap.get(ch.descriptionOfGoods);
          existing.quantity = parseFloat((existing.quantity + itemQty).toFixed(2));
        } else {
          itemMap.set(ch.descriptionOfGoods, {
            description: ch.descriptionOfGoods,
            hsnSacCode: itemConfig?.hsnSacCode || '',
            quantity: itemQty,
            rate: itemRate,
            amount: parseFloat((itemQty * itemRate).toFixed(2)),
          });
        }
      }

      const billItems = Array.from(itemMap.values());
      billItems.forEach(item => {
        item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
      });

      bill.challan = null;
      bill.challans = challanIds;
      bill.challanNumber = challans.map(c => c.challanNumber).join(', ');
      bill.totalBoxes = 0;
      bill.totalCops = 0;
      bill.items = billItems;

      await Challan.updateMany(
        { _id: { $in: challanIds } },
        { isUsed: true, bill: billId }
      );

      needsRecalculation = true;
    } else if (challanId !== undefined || challanNumber !== undefined || rate !== undefined) {
      if (challanId) {
        const challan = await Challan.findById(challanId);
        if (!challan) {
          return res.status(404).json({ message: 'Challan not found.' });
        }
        if (challan.company.toString() !== (companyId || bill.company.toString())) {
          return res.status(400).json({ message: 'Challan does not belong to the selected company.' });
        }
        if (challan.isUsed && challan.bill?.toString() !== billId) {
          return res.status(400).json({ message: `Challan ${challan.challanNumber} is already used in another bill.` });
        }
        bill.challan = challanId;
        bill.challans = [];
        bill.challanNumber = challan.challanNumber;
        const settings = await Settings.getSettings(req.organizationId);
        const itemConfig = settings.itemConfigurations.find(item => item.description === challan.descriptionOfGoods);
        const itemRate = parseFloat(rate) || itemConfig?.defaultRate || 0;
        bill.items = [{
          description: challan.descriptionOfGoods,
          hsnSacCode: itemConfig?.hsnSacCode || '',
          quantity: challan.totalNetWeight,
          rate: itemRate,
          amount: parseFloat((challan.totalNetWeight * itemRate).toFixed(2))
        }];
        await Challan.findByIdAndUpdate(
          challanId,
          { isUsed: true, bill: billId },
          { new: true }
        );
        log(`Challan ${challan.challanNumber} marked as used for bill ${bill.billNumber}`, 'info');
        needsRecalculation = true;
      } else {
        bill.challan = null;
        bill.challans = [];
        bill.challanNumber = challanNumber || '';
        if (totalBoxes !== undefined) bill.totalBoxes = totalBoxes;
        if (totalCops !== undefined) bill.totalCops = totalCops;
        if (items !== undefined) {
          bill.items = items;
          needsRecalculation = true;
        }
      }
    } else if (items !== undefined) {
      bill.items = items;
      needsRecalculation = true;
    }

    if (paymentRecords !== undefined) {
      if (!Array.isArray(paymentRecords)) {
        return res.status(400).json({ message: 'paymentRecords must be an array.' });
      }
      bill.paymentRecords = paymentRecords;
    }

    if (
      needsRecalculation ||
      discountPercentage !== undefined ||
      taxType !== undefined ||
      overrideCgstPercentage !== undefined ||
      overrideSgstPercentage !== undefined ||
      overrideIgstPercentage !== undefined ||
      overrideJobCgstPercentage !== undefined ||
      overrideJobSgstPercentage !== undefined
    ) {
      const settings = await Settings.getSettings(req.organizationId);
      const currentItems = bill.items;
      const currentDiscountPercentage = discountPercentage !== undefined ? parseFloat(discountPercentage) : bill.discountPercentage;
      const currentTaxType = taxType !== undefined ? taxType : bill.taxType;
      const cgstRate = overrideCgstPercentage !== undefined ? parseFloat(overrideCgstPercentage) : bill.cgstPercentage || settings.cgstPercentage;
      const sgstRate = overrideSgstPercentage !== undefined ? parseFloat(overrideSgstPercentage) : bill.sgstPercentage || settings.sgstPercentage;
      const igstRate = overrideIgstPercentage !== undefined ? parseFloat(overrideIgstPercentage) : bill.igstPercentage || settings.igstPercentage;
      const jobCgstRate = overrideJobCgstPercentage !== undefined ? parseFloat(overrideJobCgstPercentage) : bill.jobCgstPercentage || settings.jobCgstPercentage;
      const jobSgstRate = overrideJobSgstPercentage !== undefined ? parseFloat(overrideJobSgstPercentage) : bill.jobSgstPercentage || settings.jobSgstPercentage;

      const calculated = calculateBillTotals(
        currentItems,
        currentDiscountPercentage,
        currentTaxType,
        cgstRate,
        sgstRate,
        igstRate,
        jobCgstRate,
        jobSgstRate
      );

      bill.items = calculated.items;
      bill.subTotalAmount = calculated.subTotalAmount;
      bill.discountPercentage = currentDiscountPercentage;
      bill.discountAmount = calculated.discountAmount;
      bill.amountAfterDiscount = calculated.amountAfterDiscount;
      bill.taxType = currentTaxType;

      bill.cgstPercentage = currentTaxType === 'CGST_SGST' ? cgstRate : 0;
      bill.cgstAmount = calculated.cgstAmount;

      bill.sgstPercentage = currentTaxType === 'CGST_SGST' ? sgstRate : 0;
      bill.sgstAmount = calculated.sgstAmount;

      bill.igstPercentage = currentTaxType === 'IGST' ? igstRate : 0;
      bill.igstAmount = calculated.igstAmount;

      bill.jobCgstPercentage = currentTaxType === 'JOBCGST_JOBSGST' ? jobCgstRate : 0;
      bill.jobCgstAmount = calculated.jobCgstAmount;

      bill.jobSgstPercentage = currentTaxType === 'JOBCGST_JOBSGST' ? jobSgstRate : 0;
      bill.jobSgstAmount = calculated.jobSgstAmount;

      bill.totalTaxAmount = calculated.totalTaxAmount;

      bill.roundOffAmount = calculated.roundOffAmount;

      bill.totalAmount = calculated.totalAmount;

      bill.amountInWords = amountToWords(calculated.totalAmount) || '';
    }
    const updatedBill = await bill.save();
    log(`Bill updated: ${updatedBill.billNumber} by ${req.user.email}`, 'info');
    res.json(updatedBill);
  } catch (error) {
    log(`Error updating bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: `Bill number '${req.body.billNumber}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating bill.' });
  }
};

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private/Admin
// const getBills = async (req, res) => {
//   const { companyId, startDate, endDate, status } = req.query;
//   const query = {};

//   if (companyId) query.company = companyId;
//   if (status) query.status = status;

//   if (startDate && endDate) {
//     query.billDate = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//   } else if (startDate) {
//     query.billDate = { $gte: new Date(startDate) };
//   } else if (endDate) {
//     query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
//   }

//   try {
//     const bills = await Bill.find(query)
//       .populate('company', 'name gstNumber')
//       .populate('consignee', 'name gstNumber address')
//       .populate('createdBy', 'username email')
//       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
//       .sort({ billDate: -1, createdAt: -1 });

//     log(`Fetched bills with query ${JSON.stringify(query)} by ${req.user.email}`, 'info');
//     res.json(bills);
//   } catch (error) {
//     log(`Error fetching bills: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching bills.' });
//   }
// };

// const getBills = async (req, res) => {
//   const { companyId, startDate, endDate, status, financialYear } = req.query;
//   const query = {};

//   if (companyId) query.company = companyId;
//   if (status) query.status = status;
//   if (financialYear) query.financialYear = financialYear;

//   if (startDate && endDate) {
//     query.billDate = {
//       $gte: new Date(startDate),
//       $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
//     };
//   }

//   try {
//     const bills = await Bill.find(query)
//       .populate('company', 'name gstNumber')
//       .sort({ billDate: -1 });

//     res.json(bills);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching bills' });
//   }
// };

const getBills = async (req, res) => {
  const { companyId, financialYear, startDate, endDate, status } = req.query;

  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (financialYear) query.financialYear = financialYear;
  if (status) query.status = status;
  if (startDate && endDate) {
    query.billDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  } else if (startDate) {
    query.billDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const bills = await Bill.find(query)
      .populate('company', 'name')
      .sort({ billDate: -1 });

    // Re-derive status from the actual payment records at read time so that
    // a stale/inconsistent stored status does not show the wrong value
    // (e.g. "Paid" when only a partial amount was received).
    const normalizedBills = bills.map((bill) => {
      const doc = bill.toObject();
      doc.totalPaidAmount = (bill.paymentRecords || []).reduce(
        (sum, r) => sum + (r.amountPaid || 0),
        0
      );
      if (doc.status !== 'Cancelled') {
        if (doc.totalPaidAmount >= doc.totalAmount) {
          doc.status = 'Paid';
        } else if (doc.totalPaidAmount > 0) {
          doc.status = 'Partially Paid';
        } else {
          doc.status = 'Pending';
        }
      }
      return doc;
    });

    res.json(normalizedBills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills' });
  }
};
// @desc    Get a bill by ID
// @route   GET /api/bills/:id
// @access  Private/Admin
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('company', 'name address gstNumber mobileNumber')
      .populate('consignee', 'name address gstNumber')
      .populate('createdBy', 'username email')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
      .populate('challans', 'challanNumber descriptionOfGoods totalNetWeight totalCops');

    if (!bill) {
      log(`Bill not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Bill not found' });
    }
    log(`Fetched bill by ID: ${bill.billNumber} by ${req.user.email}`, 'info');
    res.json(bill);
  } catch (error) {
    log(`Error fetching bill ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching bill.' });
  }
};

// @desc    Delete a bill
// @route   DELETE /api/bills/:id
// @access  Private/Admin
const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      log(`Bill deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (bill.challan) {
      await Challan.findByIdAndUpdate(
        bill.challan,
        { isUsed: false, bill: null },
        { new: true }
      );
      log(`Challan ${bill.challan} reset due to deletion of bill ${bill.billNumber}`, 'info');
    }

    if (Array.isArray(bill.challans) && bill.challans.length > 0) {
      await Challan.updateMany(
        { _id: { $in: bill.challans } },
        { isUsed: false, bill: null }
      );
      log(`Challans ${bill.challans.length} reset due to deletion of bill ${bill.billNumber}`, 'info');
    }

    await bill.deleteOne();
    log(`Bill deleted: ${bill.billNumber} by ${req.user.email}`, 'info');
    res.json({ message: 'Bill removed successfully.' });
  } catch (error) {
    log(`Error deleting bill ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting bill.' });
  }
};

// @desc    Generate Excel for a bill
// @route   GET /api/bills/:id/excel
// @access  Private/Admin
const generateBillExcel = async (req, res) => {
  const billId = req.params.id;
  const excelTemplatePath = process.env.EXCEL_TEMPLATE_PATH;

  if (!excelTemplatePath) {
    log('Excel generation failed: EXCEL_TEMPLATE_PATH not set in .env', 'error');
    return res.status(500).json({ message: 'Excel template path not configured.' });
  }

  try {
    const bill = await Bill.findById(billId).populate('company');
    if (!bill) {
      log(`Excel generation failed: Bill not found - ID: ${billId}`, 'warn');
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(excelTemplatePath);
    const worksheet = workbook.getWorksheet(1);

    // Use only buyer data for Excel as requested
    worksheet.getCell('C7').value = bill.companyDetailsSnapshot.name || bill.company.name;
    worksheet.getCell('C9').value = bill.companyDetailsSnapshot.address || bill.company.address;
    worksheet.getCell('D12').value = bill.companyDetailsSnapshot.gstNumber || bill.company.gstNumber;
    worksheet.getCell('H7').value = new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    worksheet.getCell('H8').value = bill.billNumber;
    worksheet.getCell('H9').value = bill.challanNumber || '';
    // Place E-way and Payment Terms into template if appropriate cells exist
    try {
      worksheet.getCell('H10').value = bill.eWayBillNumber || '';
      worksheet.getCell('H11').value = bill.paymentTermsDays ? `${bill.paymentTermsDays} days` : '';
    } catch (e) {
      // ignore if template does not have those cells
    }

    let currentRow = 15;
    bill.items.forEach((item, index) => {
      worksheet.getCell(`A${currentRow}`).value = index + 1;
      worksheet.getCell(`B${currentRow}`).value = item.description;
      worksheet.getCell(`E${currentRow}`).value = item.hsnSacCode;
      worksheet.getCell(`F${currentRow}`).value = item.quantity;
      worksheet.getCell(`G${currentRow}`).value = item.rate;
      worksheet.getCell(`H${currentRow}`).value = item.amount;
      currentRow++;
    });

    worksheet.getCell('G19').value = bill.discountPercentage > 0 ? `DISCOUNT(${bill.discountPercentage}%)` : '';
    worksheet.getCell('H19').value = bill.discountAmount > 0 ? bill.discountAmount : '';
    worksheet.getCell('H20').value = bill.amountAfterDiscount;

    if (bill.taxType === 'CGST_SGST') {
      worksheet.getCell('G21').value = 'SGST';
      worksheet.getCell('H21').value = bill.sgstPercentage;
      worksheet.getCell('I21').value = bill.sgstAmount;
      worksheet.getCell('G22').value = 'CGST';
      worksheet.getCell('H22').value = bill.cgstPercentage;
      worksheet.getCell('I22').value = bill.cgstAmount;
      worksheet.getCell('G20').value = '';
      worksheet.getCell('H20').value = '';
      worksheet.getCell('I20').value = '';
    } else if (bill.taxType === 'IGST') {
      worksheet.getCell('G20').value = 'IGST';
      worksheet.getCell('H20').value = bill.igstPercentage;
      worksheet.getCell('I20').value = bill.igstAmount;
      worksheet.getCell('G21').value = '';
      worksheet.getCell('H21').value = '';
      worksheet.getCell('I21').value = '';
      worksheet.getCell('G22').value = '';
      worksheet.getCell('H22').value = '';
      worksheet.getCell('I22').value = '';
    } else if (bill.taxType === 'JOBCGST_JOBSGST') {
      worksheet.getCell('G21').value = 'JOBSGST';
      worksheet.getCell('H21').value = bill.jobSgstPercentage;
      worksheet.getCell('I21').value = bill.jobSgstAmount;
      worksheet.getCell('G22').value = 'JOBCGST';
      worksheet.getCell('H22').value = bill.jobCgstPercentage;
      worksheet.getCell('I22').value = bill.jobCgstAmount;
      worksheet.getCell('G20').value = '';
      worksheet.getCell('H20').value = '';
      worksheet.getCell('I20').value = '';
    }

    worksheet.getCell('I23').value = bill.totalAmount;

    const outputDir = path.join(__dirname, '..', 'generated_bills', 'excel');
    await fsPromises.mkdir(outputDir, { recursive: true });
    const excelFileName = `Bill-${bill.billNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    const excelFilePath = path.join(outputDir, excelFileName);

    await workbook.xlsx.writeFile(excelFilePath);

    bill.excelFilePath = excelFilePath;
    await bill.save();

    log(`Excel generated for bill ${bill.billNumber}: ${excelFilePath}`, 'info');

    res.download(excelFilePath, excelFileName, (err) => {
      if (err) {
        log(`Error sending Excel file for bill ${bill.billNumber}: ${err.message}`, 'error');
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to download Excel file.' });
        }
      } else {
        log(`Excel file downloaded for bill ${bill.billNumber}`, 'info');
      }
    });
  } catch (error) {
    log(`Error generating Excel for bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating Excel bill.' });
    }
  }
};

// @desc    Generate PDF for a bill
// @route   GET /api/bills/:id/pdf
// @access  Private/Admin
// const generateBillPdf = async (req, res) => {
//   const billId = req.params.id;
//   try {
//     const org = await getOrgDetails(req.organizationId);
//     const bill = await Bill.findById(billId)
//       .populate('company')
//       .populate('consignee', 'name address gstNumber')
//       .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker')
//       .populate('challans', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker boxDetails');
//     if (!bill) {
//       log(`PDF generation failed: Bill not found - ID: ${billId}`, 'warn');
//       return res.status(404).json({ message: 'Bill not found.' });
//     }

//     const pdfDoc = await PDFDocument.create();
//     let page = pdfDoc.addPage([595, 842]);
//     const { width, height } = page.getSize();
//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     let y = height - 40;
//     const lineSpacing = 18;
//     const smallLineSpacing = 12;
//     const itemLineSpacing = 16;
//     const leftMargin = 40;
//     const rightMargin = width - 40;
//     const contentWidth = rightMargin - leftMargin;

//     const drawTextAndMeasureHeight = (textToDraw, xPos, currentY, options = {}) => {
//       const textToProcess = String(textToDraw ?? '').replace(/₹/g, 'INR ');
//       const FONT_TO_USE = options.font || font;
//       const SIZE = options.size || 10;
//       const COLOR = options.color || rgb(0, 0, 0);
//       const LINE_HEIGHT = options.lineHeight || SIZE * 1.3;
//       const MAX_WIDTH = options.maxWidth;
//       const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 3;
//       const ALIGN = options.align || 'left';

//       let actualXPos = xPos;
//       if (ALIGN === 'center' && MAX_WIDTH) {
//         const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
//         actualXPos = xPos + (MAX_WIDTH - textWidth) / 2;
//       } else if (ALIGN === 'center') {
//         const textWidth = FONT_TO_USE.widthOfTextAtSize(textToProcess, SIZE);
//         actualXPos = leftMargin + (contentWidth - textWidth) / 2;
//       }

//       page.drawText(textToProcess, {
//         x: actualXPos,
//         y: currentY,
//         font: FONT_TO_USE,
//         size: SIZE,
//         color: COLOR,
//         lineHeight: LINE_HEIGHT,
//         maxWidth: MAX_WIDTH,
//         wordBreaks: [' ', '-', '/'],
//       });

//       let numLines = 1;
//       if (MAX_WIDTH && FONT_TO_USE.widthOfTextAtSize(textToProcess.replace(/\n/g, ' '), SIZE) > MAX_WIDTH) {
//         const segments = textToProcess.split('\n');
//         numLines = 0;
//         segments.forEach(segment => {
//           if (segment.trim() === '') {
//             numLines++;
//             return;
//           }
//           let currentLineForEstimation = '';
//           let linesForSegment = 1;
//           // Split on the same characters passed to wordBreaks below (space, hyphen, slash),
//           // keeping the break character attached to the preceding chunk, so this estimate
//           // matches where pdf-lib is actually allowed to wrap the line.
//           const words = segment.match(/[^ \-/]*[ \-/]?/g)?.filter(Boolean) || [segment];
//           for (const word of words) {
//             const testLineWithWord = currentLineForEstimation + word;
//             if (FONT_TO_USE.widthOfTextAtSize(testLineWithWord, SIZE) > MAX_WIDTH) {
//               linesForSegment++;
//               currentLineForEstimation = word;
//             } else {
//               currentLineForEstimation = testLineWithWord;
//             }
//           }
//           numLines += linesForSegment;
//         });
//         if (textToProcess.endsWith('\n') && segments[segments.length - 1].trim() !== '') numLines++;
//         if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
//       } else {
//         numLines = textToProcess.split('\n').length;
//         if (numLines === 0 && textToProcess.trim() !== '') numLines = 1;
//       }

//       const textHeight = textToProcess.trim() === '' ? 0 : numLines * LINE_HEIGHT;
//       return textHeight + SPACING_AFTER;
//     };

//     let currentY = y;

//     const topHeaderTextY = currentY;
//     const shreeGaneshText = 'SHREE GANESHAY NAMAH';
//     const shreeGaneshFontSize = 10;
//     const shreeGaneshOptions = { font: boldFont, size: shreeGaneshFontSize, align: 'center', color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
//     const shreeGaneshHeight = drawTextAndMeasureHeight(shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);

//     const taxInvoiceText = 'TAX INVOICE';
//     const taxInvoiceFontSize = 14;
//     const taxInvoiceWidth = boldFont.widthOfTextAtSize(taxInvoiceText, taxInvoiceFontSize);
//     const taxInvoiceOptions = { font: boldFont, size: taxInvoiceFontSize, color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
//     const taxInvoiceHeight = drawTextAndMeasureHeight(taxInvoiceText, rightMargin - taxInvoiceWidth, topHeaderTextY, taxInvoiceOptions);

//     currentY -= Math.max(shreeGaneshHeight, taxInvoiceHeight) + 18;

//     const companyNameText = org.name;
//     const companyNameFontSize = 25;
//     currentY -= drawTextAndMeasureHeight(companyNameText, leftMargin, currentY, { font: boldFont, size: companyNameFontSize, align: 'center', color: rgb(0.1, 0.3, 0.5) });

//     const addressText = org.address;
//     const addressFontSize = 9;
//     currentY -= drawTextAndMeasureHeight(addressText, leftMargin, currentY + 14, { size: addressFontSize, align: 'center', maxWidth: contentWidth, spacingAfter: 4 });

//     const companyGSTIN = org.gstin;
//     const companyStateCode = companyGSTIN.substring(0, 2);
//     const gstinWithStateText = `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`;
//     const gstinFontSize = 10;
//     currentY -= drawTextAndMeasureHeight(gstinWithStateText, leftMargin, currentY + 14, { size: gstinFontSize, align: 'center', spacingAfter: 15 });

//     y = currentY;

//     const buyerName = bill.companyDetailsSnapshot?.name || bill.company?.name || 'N/A';
//     const buyerAddress = bill.companyDetailsSnapshot?.address || bill.company?.address || 'N/A';
//     const buyerGstin = bill.companyDetailsSnapshot?.gstNumber || bill.company?.gstNumber || 'N/A';
//     const buyerStateCode = buyerGstin !== 'N/A' && buyerGstin.length >= 2 ? buyerGstin.substring(0, 2) : 'N/A';
//     const broker = bill.challan ? bill.challan.broker || 'direct' : 'direct';

//     let yLeft = y;
//     let yRight = y;

//     const detailsMaxWidth = contentWidth / 2 - 20;
//     const billDetailsColumnWidth = 180;
//     const billDetailsX = rightMargin - billDetailsColumnWidth;
//     const billDetailsMaxWidth = billDetailsColumnWidth - 10;

//     const hasConsignee = bill.isConsigneeDifferent && bill.consigneeDetailsSnapshot;

//     // When a consignee is present, use the full width available up to the
//     // bill-details box (instead of only half the page) so neither column
//     // has to wrap as aggressively.
//     const consigneeSectionWidth = (billDetailsX - 15) - leftMargin;

//     // Draw background for buyer/consignee section
//     const buyerSectionHeight = hasConsignee ? 150 : 100;
//     const buyerSectionWidth = hasConsignee ? consigneeSectionWidth : (detailsMaxWidth + 20);
//     page.drawRectangle({
//       x: leftMargin,
//       y: yLeft - (hasConsignee ? 140 : 84),
//       width: buyerSectionWidth,
//       height: buyerSectionHeight,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     // Draw background for bill details
//     page.drawRectangle({
//       x: billDetailsX - 5,
//       y: yRight - 64,
//       width: billDetailsColumnWidth,
//       height: 80,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     if (hasConsignee) {
//       // Buyer and Consignee printed side by side, in the SAME uniform style
//       // (just sized a touch smaller than the single-buyer block) so both
//       // columns look consistent with each other.
//       const consigneeName = bill.consigneeDetailsSnapshot.name || 'N/A';
//       const consigneeAddress = bill.consigneeDetailsSnapshot.address || 'N/A';
//       const consigneeGstin = bill.consigneeDetailsSnapshot.gstNumber || 'N/A';
//       const consigneeStateCode = bill.consigneeDetailsSnapshot.stateCode || 'N/A';

//       const colGap = 16;
//       const subColWidth = (consigneeSectionWidth - 10 - colGap) / 2;
//       const buyerColX = leftMargin + 5;
//       const consigneeColX = buyerColX + subColWidth + colGap;
//       const sectionTopY = yLeft;

//       let yBuyer = yLeft;
//       let yConsignee = yLeft;

//       const labelOptions = { font: boldFont, size: 9, spacingAfter: 3 };
//       const nameOptions = { font: boldFont, size: 9, spacingAfter: 3 };
//       const addressOptions = { size: 8, spacingAfter: 3 };
//       const gstinOptions = { font: boldFont, size: 8, spacingAfter: 3 };

//       // Buyer (left sub-column)
//       yBuyer -= drawTextAndMeasureHeight(`Buyer:`, buyerColX, yBuyer, labelOptions);
//       yBuyer -= drawTextAndMeasureHeight(buyerName, buyerColX, yBuyer, { ...nameOptions, maxWidth: subColWidth });
//       yBuyer -= drawTextAndMeasureHeight(buyerAddress, buyerColX, yBuyer, { ...addressOptions, maxWidth: subColWidth });
//       yBuyer -= drawTextAndMeasureHeight(`GSTIN: ${buyerGstin}  STATE CODE: ${buyerStateCode}`, buyerColX, yBuyer, { ...gstinOptions, maxWidth: subColWidth });

//       // Consignee (right sub-column) — same sizes as Buyer
//       yConsignee -= drawTextAndMeasureHeight(`Consignee:`, consigneeColX, yConsignee, labelOptions);
//       yConsignee -= drawTextAndMeasureHeight(consigneeName, consigneeColX, yConsignee, { ...nameOptions, maxWidth: subColWidth });
//       yConsignee -= drawTextAndMeasureHeight(consigneeAddress, consigneeColX, yConsignee, { ...addressOptions, maxWidth: subColWidth });
//       yConsignee -= drawTextAndMeasureHeight(`GSTIN: ${consigneeGstin}  STATE CODE: ${consigneeStateCode}`, consigneeColX, yConsignee, { ...gstinOptions, maxWidth: subColWidth });

//       // Divider line between the two sub-columns
//       page.drawLine({
//         start: { x: consigneeColX - colGap / 2, y: sectionTopY + 6 },
//         end: { x: consigneeColX - colGap / 2, y: Math.min(yBuyer, yConsignee) },
//         thickness: 0.5,
//         color: rgb(0.75, 0.75, 0.75)
//       });

//       yLeft = Math.min(yBuyer, yConsignee);
//     } else {
//       // Single buyer block (full width) — unchanged when there's no separate consignee
//       yLeft -= drawTextAndMeasureHeight(`Buyer:`, leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
//       yLeft -= drawTextAndMeasureHeight(buyerName, leftMargin + 5, yLeft, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth });
//       yLeft -= drawTextAndMeasureHeight(buyerAddress, leftMargin + 5, yLeft, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
//       yLeft -= drawTextAndMeasureHeight(`GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`, leftMargin + 5, yLeft, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
//     }

//     // Draw bill details (right side)
//     yRight -= drawTextAndMeasureHeight(`Date : ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     yRight -= drawTextAndMeasureHeight(`Invoice No : ${bill.billNumber || 'N/A'}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     const displayChallanNumber = (bill.challanNumber || bill.challan?.challanNumber || '')
//       .split(',')
//       .map(num => num.trim().split('/').pop())
//       .join(', ');

//     yRight -= drawTextAndMeasureHeight(
//       `Challan No : ${displayChallanNumber}`,
//       billDetailsX,
//       yRight,
//       {
//         size: 10,
//         spacingAfter: 4,
//         maxWidth: billDetailsMaxWidth
//       }
//     );
//     // Print E-way bill number and Payment Terms after challan
//     if (bill.eWayBillNumber) {
//       yRight -= drawTextAndMeasureHeight(`E-way Bill No : ${bill.eWayBillNumber}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     }
//     if (bill.paymentTermsDays) {
//       yRight -= drawTextAndMeasureHeight(`Mode/Terms of Payment : ${bill.paymentTermsDays} days`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
//     }

//     y = Math.min(yLeft, yRight) - lineSpacing;

//     // Continue with the rest of the PDF generation (items table, totals, etc.)
//     page.drawRectangle({
//       x: leftMargin,
//       y: y - 22,
//       width: contentWidth,
//       height: 20,
//       color: rgb(0.1, 0.3, 0.5),
//       opacity: 0.1,
//     });
//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing;

//     const colPositions = {
//       srNo: leftMargin + 10,
//       desc: leftMargin + 50,
//       hsn: leftMargin + 260,
//       qty: leftMargin + 340,
//       rate: leftMargin + 410,
//       amount: rightMargin - 80,
//     };
//     const headerOptions = { font: boldFont, size: 10, spacingAfter: 0, color: rgb(0.1, 0.1, 0.1) };
//     drawTextAndMeasureHeight('Sr No.', colPositions.srNo, y, headerOptions);
//     drawTextAndMeasureHeight('Description of Goods', colPositions.desc, y, { ...headerOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 });
//     drawTextAndMeasureHeight('HSN/SAC', colPositions.hsn, y, headerOptions);
//     drawTextAndMeasureHeight('Quantity', colPositions.qty, y, headerOptions);
//     drawTextAndMeasureHeight('Rate/Kgs', colPositions.rate, y, headerOptions);
//     const amountHeaderText = 'Amount';
//     const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeaderText, 10);
//     drawTextAndMeasureHeight(amountHeaderText, rightMargin - amountHeaderWidth - 10, y, headerOptions);

//     y -= smallLineSpacing;
//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= itemLineSpacing;

//     const pageBreakThreshold = 100;
//     bill.items.forEach((item, index) => {
//       if (y < pageBreakThreshold) {
//         page = pdfDoc.addPage([595, 842]);
//         y = height - 40;
//       }

//       const itemRowOptions = { size: 9, spacingAfter: 0 };
//       let maxHeightThisRow = 0;

//       if (index % 2 === 0) {
//         page.drawRectangle({
//           x: leftMargin,
//           y: y - 5,
//           width: contentWidth,
//           height: 16,
//           color: rgb(0.98, 0.98, 0.98),
//           opacity: 0.5,
//         });
//       }

//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(index + 1), colPositions.srNo, y, itemRowOptions));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.description, colPositions.desc, y, { ...itemRowOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.hsnSacCode, colPositions.hsn, y, { ...itemRowOptions, maxWidth: colPositions.qty - colPositions.hsn - 10 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.quantity.toFixed(2)), colPositions.qty, y, { ...itemRowOptions, maxWidth: colPositions.rate - colPositions.qty - 10 }));
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(Math.round(item.rate || 0)), colPositions.rate, y, { ...itemRowOptions, maxWidth: colPositions.amount - colPositions.rate - 10 }));
//       const amountStr = String(Math.round(item.amount || 0));
//       const amountCellWidth = font.widthOfTextAtSize(amountStr, itemRowOptions.size);
//       maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(amountStr, rightMargin - amountCellWidth - 10, y, itemRowOptions));

//       y -= maxHeightThisRow + itemLineSpacing / 2;
//     });

//     const minItemRows = 7;
//     if (bill.items.length < minItemRows) {
//       for (let i = bill.items.length; i < minItemRows; i++) {
//         y -= itemLineSpacing;
//       }
//     }

//     // Get total boxes and cops from challan(s)
//     let totalBoxes = 0;
//     let totalCops = 0;

//     // if (bill.challan) {
//     //   totalBoxes = bill.challan.boxDetails ? bill.challan.boxDetails.length : 0;
//     //   totalCops = bill.challan.totalCops || 0;
//     // }
//     // if (bill.challans && bill.challans.length > 0) {
//     //   bill.challans.forEach(challan => {
//     //     totalBoxes += challan.boxDetails ? challan.boxDetails.length : 0;
//     //     totalCops += challan.totalCops || 0;
//     //   });
//     // }


//     if (bill.challans && bill.challans.length > 0) {
//       // Multiple challans — use this block only
//       bill.challans.forEach(challan => {
//         totalBoxes += challan.boxDetails ? challan.boxDetails.length : 0;
//         totalCops += challan.totalCops || 0;
//       });
//     } else if (bill.challan) {
//       // Single challan fallback
//       totalBoxes = bill.challan.boxDetails ? bill.challan.boxDetails.length : 0;
//       totalCops = bill.challan.totalCops || 0;
//     }

//     // Print boxes summary in Description column area
//     if (totalBoxes > 0 ) {
//       y -= drawTextAndMeasureHeight(`Boxes: ${totalBoxes}  |  ${org.terminology?.copsLabel || 'Cops'}: ${totalCops}`, colPositions.desc, y, { font: boldFont, size: 9, spacingAfter: 0, color: rgb(0.2, 0.2, 0.2) });
//     }

//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing + 1;

//     const totalsLabelX = rightMargin - 230;
//     const totalsValueX = rightMargin - 100;

//     const drawTotalLine = (label, valueStr, isBold = false) => {
//       const commonOpt = { size: 10, font: isBold ? boldFont : font, spacingAfter: 2 };
//       const labelMaxWidth = totalsValueX - totalsLabelX - 15;
//       const valueMaxWidth = rightMargin - totalsValueX - 10;

//       const hLabel = drawTextAndMeasureHeight(label, totalsLabelX, y, { ...commonOpt, maxWidth: labelMaxWidth });
//       const valWidth = (isBold ? boldFont : font).widthOfTextAtSize(valueStr, commonOpt.size);
//       const valXPos = rightMargin - valWidth - 10;
//       const hValue = drawTextAndMeasureHeight(valueStr, valXPos, y, { ...commonOpt, maxWidth: valueMaxWidth });

//       y -= Math.max(hLabel, hValue) + smallLineSpacing - commonOpt.spacingAfter;
//     };

//     page.drawRectangle({
//       x: totalsLabelX - 10,
//       y: y - 114,
//       width: rightMargin - totalsLabelX + 15,
//       height: 124,
//       color: rgb(0.95, 0.95, 0.95),
//       opacity: 0.5,
//     });

//     drawTotalLine('Subtotal', String(Math.round(bill.subTotalAmount || 0)));
//     if (bill.discountAmount > 0) {
//       drawTotalLine(`Discount (${bill.discountPercentage}%):`, `- ${String(Math.round(bill.discountAmount || 0))}`);
//     }
//     drawTotalLine('Amount After Discount:', String(Math.round(bill.amountAfterDiscount || 0)), true);

//     if (bill.taxType === 'CGST_SGST') {
//       drawTotalLine(`SGST (${bill.sgstPercentage}%):`, `+ ${String(Math.round(bill.sgstAmount || 0))}`);
//       drawTotalLine(`CGST (${bill.cgstPercentage}%):`, `+ ${String(Math.round(bill.cgstAmount || 0))}`);
//     } else if (bill.taxType === 'IGST') {
//       drawTotalLine(`IGST (${bill.igstPercentage}%):`, `+ ${String(Math.round(bill.igstAmount || 0))}`);
//     } else if (bill.taxType === 'JOBCGST_JOBSGST') {
//       drawTotalLine(`SGST (${bill.jobSgstPercentage}%):`, `+ ${String(Math.round(bill.jobSgstAmount || 0))}`);
//       drawTotalLine(`CGST (${bill.jobCgstPercentage}%):`, `+ ${String(Math.round(bill.jobCgstAmount || 0))}`);
//     }

//     y -= 5;
//     page.drawLine({ start: { x: totalsLabelX - 10, y: y + smallLineSpacing / 2 }, end: { x: rightMargin, y: y + smallLineSpacing / 2 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= 3;

//     drawTotalLine('Total Amount', String(Math.round(bill.totalAmount || 0)), true);

//     const currentTotalAmountInWords = amountToWords(bill.totalAmount || 0);
//     if (currentTotalAmountInWords && currentTotalAmountInWords !== 'Zero Rupees Only' && bill.totalAmount !== 0) {
//       const amountInWordsText = `Amount in Words: ${currentTotalAmountInWords}`;
//       y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
//         font: boldFont,
//         size: 10,
//         spacingAfter: 8,
//         maxWidth: contentWidth,
//         color: rgb(0.1, 0.1, 0.1),
//       });
//     } else if (bill.totalAmount === 0) {
//       const amountInWordsText = `Amount in Words: Zero Rupees Only`;
//       y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
//         font: boldFont,
//         size: 10,
//         spacingAfter: 8,
//         maxWidth: contentWidth,
//         color: rgb(0.1, 0.1, 0.1),
//       });
//     }
//     y -= 2;

//     page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
//     y -= smallLineSpacing;

//     let bankDetailsY = y;
//     const bankDetailsMaxWidth = contentWidth * 0.5;
//     bankDetailsY -= drawTextAndMeasureHeight('Bank Details:', leftMargin, bankDetailsY, { font: boldFont, size: 12, spacingAfter: 4 });
//     bankDetailsY -= drawTextAndMeasureHeight(`Bank Name: ${org.bankName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`Account Name: ${org.accountName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`Account No.: ${org.accountNo}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
//     bankDetailsY -= drawTextAndMeasureHeight(`IFSC Code: ${org.ifsc}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 10, maxWidth: bankDetailsMaxWidth });

//     let declarationTitleY = bankDetailsY;
//     const forCompanyText = `For ${org.name}`;
//     const forCompanyFontSize = 11;
//     const forCompanyOptions = { font: boldFont, size: forCompanyFontSize, spacingAfter: 3, align: 'right' };
//     const forCompanyWidth = boldFont.widthOfTextAtSize(forCompanyText, forCompanyFontSize);

//     const declarationTitleHeight = drawTextAndMeasureHeight('Declaration:', leftMargin, declarationTitleY, { font: boldFont, size: 12, spacingAfter: 4 });
//     drawTextAndMeasureHeight(forCompanyText, rightMargin - forCompanyWidth, declarationTitleY, forCompanyOptions);
//     bankDetailsY -= declarationTitleHeight;

//     const declarationText = [
//       '1. Interest @ 2% will be charged on bills if not paid within 20 days.',
//       '2. All payments must be made by payee\'s A/C Cheque/Draft.',
//       '3. No claims will be entertained unless notified in writing within three days from the date of this bill.',
//       'Subject to Surat jurisdiction.',
//     ];

//     let lastDeclarationLineY = bankDetailsY;

//     declarationText.forEach((line, index) => {
//       const currentLineHeight = drawTextAndMeasureHeight(line, leftMargin, bankDetailsY, { size: 9, spacingAfter: 3, maxWidth: contentWidth * 0.6 });
//       bankDetailsY -= currentLineHeight;
//       if (index === declarationText.length - 1) {
//         lastDeclarationLineY = bankDetailsY + currentLineHeight - 3;
//       }
//     });

//     const authSignText = 'Authorised Signatory';
//     const authSignFontSize = 9;
//     const authSignOptions = { font: font, size: authSignFontSize, spacingAfter: 0, align: 'right' };
//     const authSignWidth = font.widthOfTextAtSize(authSignText, authSignFontSize);
//     drawTextAndMeasureHeight(authSignText, rightMargin - authSignWidth, lastDeclarationLineY, authSignOptions);

//     const forCompanyHeight = boldFont.heightAtSize(forCompanyFontSize) + 3;
//     const signatureSpaceY = declarationTitleY - forCompanyHeight - 30;
//     y = Math.min(bankDetailsY, signatureSpaceY) - lineSpacing;

//     const bottomMarginForContact = 30;
//     y = bottomMarginForContact;
//     page.drawRectangle({
//       x: leftMargin,
//       y: y - 8,
//       width: contentWidth,
//       height: 20,
//       color: rgb(0.1, 0.3, 0.5),
//       opacity: 0.1,
//     });
//     const contactText = `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
//     const contactTextWidth = font.widthOfTextAtSize(contactText, 9);
//     drawTextAndMeasureHeight(contactText, leftMargin + (contentWidth - contactTextWidth) / 2, y, { size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3) });

//     const pdfBytes = await pdfDoc.save();
//     const pdfFileName = `Bill-${bill.billNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

//     log(`PDF generated for bill ${bill.billNumber}`, 'info');

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
//     res.send(Buffer.from(pdfBytes));
//   } catch (error) {
//     log(`Error generating PDF for bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
//     if (!res.headersSent) {
//       res.status(500).json({ message: 'Server error while generating PDF bill.' });
//     }
//   }
// };

const generateBillPdf = async (req, res) => {
  const billId = req.params.id;
  try {
    const org = await getOrgDetails(req.organizationId);
    const bill = await Bill.findById(billId)
      .populate('company')
      .populate('consignee', 'name address gstNumber')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker')
      .populate('challans', 'challanNumber descriptionOfGoods totalNetWeight totalCops broker boxDetails');
    if (!bill) {
      log(`PDF generation failed: Bill not found - ID: ${billId}`, 'warn');
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const sanitizeForWinAnsi = (text) => {
      const greekToLatinMap = {
        '\u0391':'A','\u0392':'B','\u0393':'G','\u0394':'D','\u0395':'E','\u0396':'Z','\u0397':'H','\u0398':'U',
        '\u0399':'I','\u039A':'K','\u039B':'L','\u039C':'M','\u039D':'N','\u039E':'J','\u039F':'O','\u03A0':'P',
        '\u03A1':'R','\u03A3':'S','\u03A4':'T','\u03A5':'Y','\u03A6':'F','\u03A7':'X','\u03A8':'C','\u03A9':'W',
        '\u03AA':'I','\u03AB':'Y',
        '\u03B1':'a','\u03B2':'b','\u03B3':'g','\u03B4':'d','\u03B5':'e','\u03B6':'z','\u03B7':'h','\u03B8':'u',
        '\u03B9':'i','\u03BA':'k','\u03BB':'l','\u03BC':'m','\u03BD':'n','\u03BE':'j','\u03BF':'o','\u03C0':'p',
        '\u03C1':'r','\u03C2':'s','\u03C3':'s','\u03C4':'t','\u03C5':'y','\u03C6':'f','\u03C7':'x','\u03C8':'c',
        '\u03C9':'w','\u03CA':'i','\u03CB':'y',
      };
      return String(text ?? '')
        .replace(/[\u0391-\u03C9]/g, (ch) => greekToLatinMap[ch] || '?')
        .replace(/[^\x00-\xFF]/g, '?');
    };

    let y = height - 40;
    const lineSpacing = 18;
    const smallLineSpacing = 12;
    const itemLineSpacing = 16;
    const leftMargin = 40;
    const rightMargin = width - 40;
    const contentWidth = rightMargin - leftMargin;

    const calculateTextHeight = (textToDraw, options = {}) => {
      const textToProcess = sanitizeForWinAnsi(textToDraw);
      const FONT_TO_USE = options.font || font;
      const SIZE = options.size || 10;
      const LINE_HEIGHT = options.lineHeight || SIZE * 1.3;
      const MAX_WIDTH = options.maxWidth;
      const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 3;

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
          const words = segment.match(/[^ \-/]*[ \-/]?/g)?.filter(Boolean) || [segment];
          for (const word of words) {
            const testLineWithWord = currentLineForEstimation + word;
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

    const drawTextAndMeasureHeight = (textToDraw, xPos, currentY, options = {}) => {
      const textToProcess = sanitizeForWinAnsi(textToDraw).replace(/₹/g, 'INR ');
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

      return calculateTextHeight(textToDraw, { ...options, font: FONT_TO_USE, size: SIZE, lineHeight: LINE_HEIGHT });
    };

    let currentY = y;

    const topHeaderTextY = currentY;
    const shreeGaneshText = 'SHREE GANESHAY NAMAH';
    const shreeGaneshFontSize = 10;
    const shreeGaneshOptions = { font: boldFont, size: shreeGaneshFontSize, align: 'center', color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
    const shreeGaneshHeight = drawTextAndMeasureHeight(shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);

    const taxInvoiceText = 'TAX INVOICE';
    const taxInvoiceFontSize = 14;
    const taxInvoiceWidth = boldFont.widthOfTextAtSize(taxInvoiceText, taxInvoiceFontSize);
    const taxInvoiceOptions = { font: boldFont, size: taxInvoiceFontSize, color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
    const taxInvoiceHeight = drawTextAndMeasureHeight(taxInvoiceText, rightMargin - taxInvoiceWidth, topHeaderTextY, taxInvoiceOptions);

    currentY -= Math.max(shreeGaneshHeight, taxInvoiceHeight) + 18;

    const companyNameText = org.name;
    const companyNameFontSize = 25;
    currentY -= drawTextAndMeasureHeight(companyNameText, leftMargin, currentY, { font: boldFont, size: companyNameFontSize, align: 'center', color: rgb(0.1, 0.3, 0.5) });

    const addressText = org.address;
    const addressFontSize = 9;
    currentY -= drawTextAndMeasureHeight(addressText, leftMargin, currentY + 14, { size: addressFontSize, align: 'center', maxWidth: contentWidth, spacingAfter: 4 });

    const companyGSTIN = org.gstin;
    const companyStateCode = companyGSTIN.substring(0, 2);
    const gstinWithStateText = `GSTIN: ${companyGSTIN}     STATE CODE: ${companyStateCode}`;
    const gstinFontSize = 10;
    currentY -= drawTextAndMeasureHeight(gstinWithStateText, leftMargin, currentY + 14, { size: gstinFontSize, align: 'center', spacingAfter: 15 });

    y = currentY;

    const buyerName = bill.companyDetailsSnapshot?.name || bill.company?.name || 'N/A';
    const buyerAddress = bill.companyDetailsSnapshot?.address || bill.company?.address || 'N/A';
    const buyerGstin = bill.companyDetailsSnapshot?.gstNumber || bill.company?.gstNumber || 'N/A';
    const buyerStateCode = buyerGstin !== 'N/A' && buyerGstin.length >= 2 ? buyerGstin.substring(0, 2) : 'N/A';

    const detailsMaxWidth = contentWidth / 2 - 20;
    const billDetailsColumnWidth = 180;
    const billDetailsX = rightMargin - billDetailsColumnWidth;
    const billDetailsMaxWidth = billDetailsColumnWidth - 10;

    const hasConsignee = bill.isConsigneeDifferent && bill.consigneeDetailsSnapshot;
    const consigneeSectionWidth = (billDetailsX - 15) - leftMargin;

    // ── Pre-calculate all section heights ──────────────────────────────
    let buyerHeight = 0;
    let consigneeHeight = 0;
    let billDetailsHeight = 0;

    const bgPad = 10;

    if (hasConsignee) {
      const colGap = 16;
      const subColWidth = (consigneeSectionWidth - 10 - colGap) / 2;
      const lblOpt = { font: boldFont, size: 9, spacingAfter: 3 };
      const nmOpt = { font: boldFont, size: 9, spacingAfter: 3, maxWidth: subColWidth };
      const adrOpt = { size: 8, spacingAfter: 3, maxWidth: subColWidth };
      const gstOpt = { font: boldFont, size: 8, spacingAfter: 3, maxWidth: subColWidth };

      const consigneeName = bill.consigneeDetailsSnapshot.name || 'N/A';
      const consigneeAddress = bill.consigneeDetailsSnapshot.address || 'N/A';
      const consigneeGstin = bill.consigneeDetailsSnapshot.gstNumber || 'N/A';
      const consigneeStateCode = bill.consigneeDetailsSnapshot.stateCode || 'N/A';

      buyerHeight =
        calculateTextHeight('Buyer:', lblOpt) +
        calculateTextHeight(buyerName, nmOpt) +
        calculateTextHeight(buyerAddress, adrOpt) +
        calculateTextHeight(`GSTIN: ${buyerGstin}  STATE CODE: ${buyerStateCode}`, gstOpt);

      consigneeHeight =
        calculateTextHeight('Consignee:', lblOpt) +
        calculateTextHeight(consigneeName, nmOpt) +
        calculateTextHeight(consigneeAddress, adrOpt) +
        calculateTextHeight(`GSTIN: ${consigneeGstin}  STATE CODE: ${consigneeStateCode}`, gstOpt);
    } else {
      buyerHeight =
        calculateTextHeight('Buyer:', { font: boldFont, size: 11, spacingAfter: 4 }) +
        calculateTextHeight(buyerName, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth }) +
        calculateTextHeight(buyerAddress, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth }) +
        calculateTextHeight(`GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
    }

    const bdLabelOpt = { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth };
    billDetailsHeight =
      calculateTextHeight(`Date : ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, bdLabelOpt) +
      calculateTextHeight(`Invoice No : ${bill.billNumber || 'N/A'}`, bdLabelOpt) +
      calculateTextHeight(`Challan No : ${(bill.challanNumber || bill.challan?.challanNumber || '').split(',').map(num => num.trim().split('/').pop()).join(', ')}`, bdLabelOpt) +
      (bill.eWayBillNumber ? calculateTextHeight(`E-way Bill No : ${bill.eWayBillNumber}`, bdLabelOpt) : 0) +
      (bill.paymentTermsDays ? calculateTextHeight(`Mode/Terms of Payment : ${bill.paymentTermsDays} days`, bdLabelOpt) : 0);

    // ── Draw backgrounds sized to content ──────────────────────────────
    const maxLeftContentHeight = Math.max(buyerHeight, consigneeHeight || 0);
    const leftBgHeight = maxLeftContentHeight + bgPad * 2;
    const leftBgY = y - leftBgHeight + bgPad;

    const rightBgHeight = billDetailsHeight + bgPad * 2;
    const rightBgY = y - rightBgHeight + bgPad;

    const buyerSectionWidth = hasConsignee ? consigneeSectionWidth : (detailsMaxWidth + 20);

    page.drawRectangle({
      x: leftMargin,
      y: leftBgY,
      width: buyerSectionWidth,
      height: leftBgHeight,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    page.drawRectangle({
      x: billDetailsX - 5,
      y: rightBgY,
      width: billDetailsColumnWidth,
      height: rightBgHeight,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.5,
    });

    // ── Draw content ───────────────────────────────────────────────────
    let yLeft = y - bgPad;
    let yRight = y - bgPad;

    if (hasConsignee) {
      const consigneeName = bill.consigneeDetailsSnapshot.name || 'N/A';
      const consigneeAddress = bill.consigneeDetailsSnapshot.address || 'N/A';
      const consigneeGstin = bill.consigneeDetailsSnapshot.gstNumber || 'N/A';
      const consigneeStateCode = bill.consigneeDetailsSnapshot.stateCode || 'N/A';

      const colGap = 16;
      const subColWidth = (consigneeSectionWidth - 10 - colGap) / 2;
      const buyerColX = leftMargin + 5;
      const consigneeColX = buyerColX + subColWidth + colGap;
      const sectionTopY = yLeft;

      let yBuyer = yLeft;
      let yConsignee = yLeft;

      const labelOptions = { font: boldFont, size: 9, spacingAfter: 3 };
      const nameOptions = { font: boldFont, size: 9, spacingAfter: 3, maxWidth: subColWidth };
      const addressOptions = { size: 8, spacingAfter: 3, maxWidth: subColWidth };
      const gstinOptions = { font: boldFont, size: 8, spacingAfter: 3, maxWidth: subColWidth };

      yBuyer -= drawTextAndMeasureHeight(`Buyer:`, buyerColX, yBuyer, labelOptions);
      yBuyer -= drawTextAndMeasureHeight(buyerName, buyerColX, yBuyer, nameOptions);
      yBuyer -= drawTextAndMeasureHeight(buyerAddress, buyerColX, yBuyer, addressOptions);
      yBuyer -= drawTextAndMeasureHeight(`GSTIN: ${buyerGstin}  STATE CODE: ${buyerStateCode}`, buyerColX, yBuyer, gstinOptions);

      yConsignee -= drawTextAndMeasureHeight(`Consignee:`, consigneeColX, yConsignee, labelOptions);
      yConsignee -= drawTextAndMeasureHeight(consigneeName, consigneeColX, yConsignee, nameOptions);
      yConsignee -= drawTextAndMeasureHeight(consigneeAddress, consigneeColX, yConsignee, addressOptions);
      yConsignee -= drawTextAndMeasureHeight(`GSTIN: ${consigneeGstin}  STATE CODE: ${consigneeStateCode}`, consigneeColX, yConsignee, gstinOptions);

      page.drawLine({
        start: { x: consigneeColX - colGap / 2, y: sectionTopY + 6 },
        end: { x: consigneeColX - colGap / 2, y: Math.min(yBuyer, yConsignee) },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75)
      });

      yLeft = Math.min(yBuyer, yConsignee);
    } else {
      yLeft -= drawTextAndMeasureHeight(`Buyer:`, leftMargin + 5, yLeft, { font: boldFont, size: 11, spacingAfter: 4 });
      yLeft -= drawTextAndMeasureHeight(buyerName, leftMargin + 5, yLeft, { font: boldFont, size: 10, spacingAfter: 4, maxWidth: detailsMaxWidth });
      yLeft -= drawTextAndMeasureHeight(buyerAddress, leftMargin + 5, yLeft, { size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
      yLeft -= drawTextAndMeasureHeight(`GSTIN: ${buyerGstin}     STATE CODE: ${buyerStateCode}`, leftMargin + 5, yLeft, { font: boldFont, size: 9, spacingAfter: 4, maxWidth: detailsMaxWidth });
    }

    yRight -= drawTextAndMeasureHeight(`Date : ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
    yRight -= drawTextAndMeasureHeight(`Invoice No : ${bill.billNumber || 'N/A'}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });

    const displayChallanNumber = (bill.challanNumber || bill.challan?.challanNumber || '')
      .split(',')
      .map(num => num.trim().split('/').pop())
      .join(', ');

    yRight -= drawTextAndMeasureHeight(
      `Challan No : ${displayChallanNumber}`,
      billDetailsX,
      yRight,
      { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth }
    );

    if (bill.eWayBillNumber) {
      yRight -= drawTextAndMeasureHeight(`E-way Bill No : ${bill.eWayBillNumber}`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
    }
    if (bill.paymentTermsDays) {
      yRight -= drawTextAndMeasureHeight(`Mode/Terms of Payment : ${bill.paymentTermsDays} days`, billDetailsX, yRight, { size: 10, spacingAfter: 4, maxWidth: billDetailsMaxWidth });
    }

    y = Math.min(yLeft, yRight) - lineSpacing;

    page.drawRectangle({
      x: leftMargin,
      y: y - 22,
      width: contentWidth,
      height: 20,
      color: rgb(0.1, 0.3, 0.5),
      opacity: 0.1,
    });
    page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
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
    drawTextAndMeasureHeight('Description of Goods', colPositions.desc, y, { ...headerOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 });
    drawTextAndMeasureHeight('HSN/SAC', colPositions.hsn, y, headerOptions);
    drawTextAndMeasureHeight('Quantity', colPositions.qty, y, headerOptions);
    drawTextAndMeasureHeight('Rate/Kgs', colPositions.rate, y, headerOptions);
    const amountHeaderText = 'Amount';
    const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeaderText, 10);
    drawTextAndMeasureHeight(amountHeaderText, rightMargin - amountHeaderWidth - 10, y, headerOptions);

    y -= smallLineSpacing;
    page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= itemLineSpacing;

    const pageBreakThreshold = 100;
    bill.items.forEach((item, index) => {
      if (y < pageBreakThreshold) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 40;
      }

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
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.description, colPositions.desc, y, { ...itemRowOptions, maxWidth: colPositions.hsn - colPositions.desc - 15 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(item.hsnSacCode, colPositions.hsn, y, { ...itemRowOptions, maxWidth: colPositions.qty - colPositions.hsn - 10 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(item.quantity.toFixed(2)), colPositions.qty, y, { ...itemRowOptions, maxWidth: colPositions.rate - colPositions.qty - 10 }));
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(String(Math.round(item.rate || 0)), colPositions.rate, y, { ...itemRowOptions, maxWidth: colPositions.amount - colPositions.rate - 10 }));
      const amountStr = String(Math.round(item.amount || 0));
      const amountCellWidth = font.widthOfTextAtSize(amountStr, itemRowOptions.size);
      maxHeightThisRow = Math.max(maxHeightThisRow, drawTextAndMeasureHeight(amountStr, rightMargin - amountCellWidth - 10, y, itemRowOptions));

      y -= maxHeightThisRow + itemLineSpacing / 2;
    });

    const minItemRows = 7;
    if (bill.items.length < minItemRows) {
      for (let i = bill.items.length; i < minItemRows; i++) {
        y -= itemLineSpacing;
      }
    }

    let totalBoxes = bill.totalBoxes || 0;
    let totalCops = bill.totalCops || 0;

    if (bill.challans && bill.challans.length > 0) {
      totalBoxes = 0;
      totalCops = 0;
      bill.challans.forEach(challan => {
        totalBoxes += challan.boxDetails ? challan.boxDetails.length : 0;
        totalCops += challan.totalCops || 0;
      });
    } else if (bill.challan) {
      totalBoxes = bill.challan.boxDetails ? bill.challan.boxDetails.length : 0;
      totalCops = bill.challan.totalCops || 0;
    }

    const boxesLabel = org.terminology?.boxesLabel || 'Boxes';
    const copsLabel = org.terminology?.copsLabel || 'Cops';

    if (totalBoxes > 0) {
      y -= drawTextAndMeasureHeight(
        `${boxesLabel}: ${totalBoxes}  |  ${copsLabel}: ${totalCops}`,
        colPositions.desc,
        y,
        { font: boldFont, size: 9, spacingAfter: 0, color: rgb(0.2, 0.2, 0.2) }
      );
    }

    page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing + 1;

    const totalsLabelX = rightMargin - 230;
    const totalsValueX = rightMargin - 100;

    const drawTotalLine = (label, valueStr, isBold = false) => {
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

    drawTotalLine('Subtotal', String(Math.round(bill.subTotalAmount || 0)));
    if (bill.discountAmount > 0) {
      drawTotalLine(`Discount (${bill.discountPercentage}%):`, `- ${String(Math.round(bill.discountAmount || 0))}`);
    }
    drawTotalLine('Amount After Discount:', String(Math.round(bill.amountAfterDiscount || 0)), true);

    if (bill.taxType === 'CGST_SGST') {
      drawTotalLine(`SGST (${bill.sgstPercentage}%):`, `+ ${String(Math.round(bill.sgstAmount || 0))}`);
      drawTotalLine(`CGST (${bill.cgstPercentage}%):`, `+ ${String(Math.round(bill.cgstAmount || 0))}`);
    } else if (bill.taxType === 'IGST') {
      drawTotalLine(`IGST (${bill.igstPercentage}%):`, `+ ${String(Math.round(bill.igstAmount || 0))}`);
    } else if (bill.taxType === 'JOBCGST_JOBSGST') {
      drawTotalLine(`SGST (${bill.jobSgstPercentage}%):`, `+ ${String(Math.round(bill.jobSgstAmount || 0))}`);
      drawTotalLine(`CGST (${bill.jobCgstPercentage}%):`, `+ ${String(Math.round(bill.jobCgstAmount || 0))}`);
    }

    y -= 5;
    page.drawLine({ start: { x: totalsLabelX - 10, y: y + smallLineSpacing / 2 }, end: { x: rightMargin, y: y + smallLineSpacing / 2 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= 3;

    drawTotalLine('Total Amount', String(Math.round(bill.totalAmount || 0)), true);

    const currentTotalAmountInWords = amountToWords(bill.totalAmount || 0);
    if (currentTotalAmountInWords && currentTotalAmountInWords !== 'Zero Rupees Only' && bill.totalAmount !== 0) {
      const amountInWordsText = `Amount in Words: ${currentTotalAmountInWords}`;
      y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
        font: boldFont,
        size: 10,
        spacingAfter: 8,
        maxWidth: contentWidth,
        color: rgb(0.1, 0.1, 0.1),
      });
    } else if (bill.totalAmount === 0) {
      const amountInWordsText = `Amount in Words: Zero Rupees Only`;
      y -= drawTextAndMeasureHeight(amountInWordsText, leftMargin, y, {
        font: boldFont,
        size: 10,
        spacingAfter: 8,
        maxWidth: contentWidth,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    y -= 2;

    page.drawLine({ start: { x: leftMargin, y: y }, end: { x: rightMargin, y: y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    y -= smallLineSpacing;

    let bankDetailsY = y;
    const bankDetailsMaxWidth = contentWidth * 0.5;
    bankDetailsY -= drawTextAndMeasureHeight('Bank Details:', leftMargin, bankDetailsY, { font: boldFont, size: 12, spacingAfter: 4 });
    bankDetailsY -= drawTextAndMeasureHeight(`Bank Name: ${org.bankName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
    bankDetailsY -= drawTextAndMeasureHeight(`Account Name: ${org.accountName}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
    bankDetailsY -= drawTextAndMeasureHeight(`Account No.: ${org.accountNo}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 3, maxWidth: bankDetailsMaxWidth });
    bankDetailsY -= drawTextAndMeasureHeight(`IFSC Code: ${org.ifsc}`, leftMargin, bankDetailsY, { size: 10, spacingAfter: 10, maxWidth: bankDetailsMaxWidth });

    let declarationTitleY = bankDetailsY;
    const forCompanyText = `For ${org.name}`;
    const forCompanyFontSize = 11;
    const forCompanyOptions = { font: boldFont, size: forCompanyFontSize, spacingAfter: 3, align: 'right' };
    const forCompanyWidth = boldFont.widthOfTextAtSize(sanitizeForWinAnsi(forCompanyText), forCompanyFontSize);

    const declarationTitleHeight = drawTextAndMeasureHeight('Declaration:', leftMargin, declarationTitleY, { font: boldFont, size: 12, spacingAfter: 4 });
    drawTextAndMeasureHeight(forCompanyText, rightMargin - forCompanyWidth, declarationTitleY, forCompanyOptions);
    bankDetailsY -= declarationTitleHeight;

    const declarationText = [
      '1. Interest @ 2% will be charged on bills if not paid within 20 days.',
      '2. All payments must be made by payee\'s A/C Cheque/Draft.',
      '3. No claims will be entertained unless notified in writing within three days from the date of this bill.',
      'Subject to Surat jurisdiction.',
    ];

    let lastDeclarationLineY = bankDetailsY;

    declarationText.forEach((line, index) => {
      const currentLineHeight = drawTextAndMeasureHeight(line, leftMargin, bankDetailsY, { size: 9, spacingAfter: 3, maxWidth: contentWidth * 0.6 });
      bankDetailsY -= currentLineHeight;
      if (index === declarationText.length - 1) {
        lastDeclarationLineY = bankDetailsY + currentLineHeight - 3;
      }
    });

    const authSignText = 'Authorised Signatory';
    const authSignFontSize = 9;
    const authSignOptions = { font: font, size: authSignFontSize, spacingAfter: 0, align: 'right' };
    const authSignWidth = font.widthOfTextAtSize(authSignText, authSignFontSize);
    drawTextAndMeasureHeight(authSignText, rightMargin - authSignWidth, lastDeclarationLineY, authSignOptions);

    const forCompanyHeight = boldFont.heightAtSize(forCompanyFontSize) + 3;
    const signatureSpaceY = declarationTitleY - forCompanyHeight - 30;
    y = Math.min(bankDetailsY, signatureSpaceY) - lineSpacing;

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
    const contactText = `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
    const contactTextWidth = font.widthOfTextAtSize(sanitizeForWinAnsi(contactText), 9);
    drawTextAndMeasureHeight(contactText, leftMargin + (contentWidth - contactTextWidth) / 2, y, { size: 9, spacingAfter: 0, color: rgb(0.3, 0.3, 0.3) });

    // ✅ FIXED: Properly convert Uint8Array to Buffer to prevent binary corruption
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
    const pdfFileName = `Bill-${bill.billNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    log(`PDF generated for bill ${bill.billNumber}`, 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    log(`Error generating PDF for bill ID ${billId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF bill.' });
    }
  }
};

const amountToWords = (number) => {
    if (number === null || number === undefined || isNaN(parseInt(number, 10))) {
        return ''; // Handle invalid input
    }
    let num = parseInt(number, 10); // Expecting a whole number
    if (num === 0) return 'Zero Rupees Only';

    const আচ্ছা = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const থানা = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
    let mainNum = num; // No decimal part to handle

    let str = "";
    const crore = Math.floor(mainNum / 10000000); mainNum %= 10000000;
    const lakh = Math.floor(mainNum / 100000); mainNum %= 100000;
    const thousand = Math.floor(mainNum / 1000); mainNum %= 1000;
    const hundred = Math.floor(mainNum / 100); mainNum %= 100;

    if (crore > 0) { str += (crore > 19 ? থানা[Math.floor(crore / 10)] + আচ্ছা[crore % 10] : আচ্ছা[crore]) + 'Crore '; }
    if (lakh > 0) { str += (lakh > 19 ? থানা[Math.floor(lakh / 10)] + আচ্ছা[lakh % 10] : আচ্ছা[lakh]) + 'Lakh '; }
    if (thousand > 0) { str += (thousand > 19 ? থানা[Math.floor(thousand / 10)] + আচ্ছা[thousand % 10] : আচ্ছা[thousand]) + 'Thousand '; }
    if (hundred > 0) { str += (hundred > 19 ? থানা[Math.floor(hundred / 10)] + আচ্ছা[hundred % 10] : আচ্ছা[hundred]) + 'Hundred '; }
    if (mainNum > 0) { str += (str !== "" && mainNum < 100 && str.trim() !== '' ? "and " : "") + (mainNum > 19 ? থানা[Math.floor(mainNum / 10)] + আচ্ছা[mainNum % 10] : আচ্ছা[mainNum]); }
    
    // No decimal part (Paise) to handle as amounts are rounded
    
    const finalStr = (str.trim() + " Rupees Only").trim();
    // Ensure "Zero Rupees Only" if nothing else, or if the number was indeed zero.
    return finalStr.length > "Rupees Only".length ? finalStr : "Zero Rupees Only";
};

// @desc    Download bills as Excel with filters
// @route   GET /api/bills/download/excel
// @access  Private/Admin
const downloadBillsExcel = async (req, res) => {
  const { companyId, startDate, endDate, status, month, year } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (status) query.status = status;

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    query.billDate = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    query.billDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  } else if (startDate) {
    query.billDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const bills = await Bill.find(query)
      .populate('company', 'name gstNumber address')
      .populate('consignee', 'name gstNumber address')
      .sort({ billDate: 1, billNumber: 1 });

    if (!bills || bills.length === 0) {
      return res.status(404).json({ message: 'No bills found matching the criteria' });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Bills');

    worksheet.columns = [
      { header: 'Bill No.', key: 'billNumber', width: 15 },
      { header: 'Date', key: 'billDate', width: 12 },
      { header: 'Challan No.', key: 'challanNumber', width: 15 },
      { header: 'E-way Bill No.', key: 'eWayBillNumber', width: 18 },
      { header: 'Payment Terms (days)', key: 'paymentTerms', width: 18 },
      { header: 'Buyer Company Name', key: 'companyName', width: 30 },
      { header: 'Buyer GST', key: 'companyGst', width: 20 },
      { header: 'Buyer Address', key: 'companyAddress', width: 40 },
      { header: 'Consignee Company Name', key: 'consigneeName', width: 30 },
      { header: 'Consignee GST', key: 'consigneeGst', width: 20 },
      { header: 'Consignee Address', key: 'consigneeAddress', width: 40 },
      { header: 'Different Consignee', key: 'isConsigneeDifferent', width: 15 },
      { header: 'Item Description', key: 'itemDescription', width: 30 },
      { header: 'HSN/SAC', key: 'hsnSac', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Rate', key: 'rate', width: 12, style: { numFmt: '₹#,##0.00' } },
      { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Subtotal', key: 'subtotal', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Discount %', key: 'discountPercent', width: 12 },
      { header: 'Discount Amt', key: 'discountAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Taxable Amt', key: 'taxableAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'CGST %', key: 'cgstPercent', width: 10 },
      { header: 'CGST Amt', key: 'cgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'SGST %', key: 'sgstPercent', width: 10 },
      { header: 'SGST Amt', key: 'sgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'IGST %', key: 'igstPercent', width: 10 },
      { header: 'IGST Amt', key: 'igstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'JOBCGST %', key: 'jobCgstPercent', width: 10 },
      { header: 'JOBCGST Amt', key: 'jobCgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'JOBSGST %', key: 'jobSgstPercent', width: 10 },
      { header: 'JOBSGST Amt', key: 'jobSgstAmt', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Total Tax', key: 'totalTax', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Grand Total', key: 'grandTotal', width: 15, style: { numFmt: '₹#,##0.00' } },
      { header: 'Amount in Words', key: 'amountInWords', width: 50 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    bills.forEach(bill => {
      bill.items.forEach((item, index) => {
        const rowData = {
          billNumber: index === 0 ? bill.billNumber : '',
          billDate: index === 0 ? bill.billDate.toLocaleDateString('en-IN') : '',
          challanNumber: index === 0 ? bill.challanNumber : '',
          eWayBillNumber: index === 0 ? (bill.eWayBillNumber || '') : '',
          paymentTerms: index === 0 ? (bill.paymentTermsDays || '') : '',
          companyName: index === 0 ? bill.company?.name || bill.companyDetailsSnapshot?.name : '',
          companyGst: index === 0 ? bill.company?.gstNumber || bill.companyDetailsSnapshot?.gstNumber : '',
          companyAddress: index === 0 ? bill.company?.address || bill.companyDetailsSnapshot?.address : '',
          consigneeName: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.name || bill.consigneeDetailsSnapshot?.name) : 'Same as Buyer') : '',
          consigneeGst: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.gstNumber || bill.consigneeDetailsSnapshot?.gstNumber) : '') : '',
          consigneeAddress: index === 0 ? (bill.isConsigneeDifferent ? (bill.consignee?.address || bill.consigneeDetailsSnapshot?.address) : '') : '',
          isConsigneeDifferent: index === 0 ? (bill.isConsigneeDifferent ? 'Yes' : 'No') : '',
          itemDescription: item.description,
          hsnSac: item.hsnSacCode,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          subtotal: index === 0 ? bill.subTotalAmount : '',
          discountPercent: index === 0 ? bill.discountPercentage : '',
          discountAmt: index === 0 ? bill.discountAmount : '',
          taxableAmt: index === 0 ? bill.amountAfterDiscount : '',
          cgstPercent: index === 0 ? (bill.taxType === 'CGST_SGST' ? bill.cgstPercentage : '') : '',
          cgstAmt: index === 0 ? bill.cgstAmount : '',
          sgstPercent: index === 0 ? (bill.taxType === 'CGST_SGST' ? bill.sgstPercentage : '') : '',
          sgstAmt: index === 0 ? bill.sgstAmount : '',
          igstPercent: index === 0 ? (bill.taxType === 'IGST' ? bill.igstPercentage : '') : '',
          igstAmt: index === 0 ? bill.igstAmount : '',
          jobCgstPercent: index === 0 ? (bill.taxType === 'JOBCGST_JOBSGST' ? bill.jobCgstPercentage : '') : '',
          jobCgstAmt: index === 0 ? bill.jobCgstAmount : '',
          jobSgstPercent: index === 0 ? (bill.taxType === 'JOBCGST_JOBSGST' ? bill.jobSgstPercentage : '') : '',
          jobSgstAmt: index === 0 ? bill.jobSgstAmount : '',
          totalTax: index === 0 ? bill.totalTaxAmount : '',
          grandTotal: index === 0 ? bill.totalAmount : '',
          amountInWords: index === 0 ? bill.amountInWords : '',
          status: index === 0 ? bill.status : ''
        };
        worksheet.addRow(rowData);
      });

      worksheet.addRow([]);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    let fileName = 'Bills';
    if (month && year) {
      fileName += `_${month}-${year}`;
    } else if (startDate && endDate) {
      fileName += `_${startDate}_to_${endDate}`;
    } else if (companyId) {
      fileName += `_Company_${companyId}`;
    }
    fileName += '.xlsx';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    log(`Error generating Excel: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Error generating Excel file' });
  }
};

// @desc    Download bills as PDF with filters
// @route   GET /api/bills/download/pdf
// @access  Private/Admin
const downloadBillsPdf = async (req, res) => {
  const { companyId, startDate, endDate, status, month, year } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (status) query.status = status;

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    query.billDate = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    query.billDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  } else if (startDate) {
    query.billDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.billDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const bills = await Bill.find(query)
      .populate('company', 'name gstNumber address')
      .populate('consignee', 'name gstNumber address')
      .populate('challan', 'challanNumber descriptionOfGoods totalNetWeight totalCops')
      .sort({ billDate: 1, billNumber: 1 });

    if (!bills || bills.length === 0) {
      log(`PDF generation failed: No bills found matching query ${JSON.stringify(query)}`, 'warn');
      return res.status(404).json({ message: 'No bills found matching the criteria' });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const sanitizeForWinAnsi = (text) => {
      const greekToLatinMap = {
        '\u0391':'A','\u0392':'B','\u0393':'G','\u0394':'D','\u0395':'E','\u0396':'Z','\u0397':'H','\u0398':'U',
        '\u0399':'I','\u039A':'K','\u039B':'L','\u039C':'M','\u039D':'N','\u039E':'J','\u039F':'O','\u03A0':'P',
        '\u03A1':'R','\u03A3':'S','\u03A4':'T','\u03A5':'Y','\u03A6':'F','\u03A7':'X','\u03A8':'C','\u03A9':'W',
        '\u03AA':'I','\u03AB':'Y',
        '\u03B1':'a','\u03B2':'b','\u03B3':'g','\u03B4':'d','\u03B5':'e','\u03B6':'z','\u03B7':'h','\u03B8':'u',
        '\u03B9':'i','\u03BA':'k','\u03BB':'l','\u03BC':'m','\u03BD':'n','\u03BE':'j','\u03BF':'o','\u03C0':'p',
        '\u03C1':'r','\u03C2':'s','\u03C3':'s','\u03C4':'t','\u03C5':'y','\u03C6':'f','\u03C7':'x','\u03C8':'c',
        '\u03C9':'w','\u03CA':'i','\u03CB':'y',
      };
      return String(text ?? '')
        .replace(/[\u0391-\u03C9]/g, (ch) => greekToLatinMap[ch] || '?')
        .replace(/[^\x00-\xFF]/g, '?');
    };

    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const margin = 40;
    const maxY = margin + 20;

    const drawText = (text, x, y, size = 10, isBold = false) => {
      const safeText = sanitizeForWinAnsi(text).replace(/₹/g, 'Rs. ');
      const currentFont = isBold ? boldFont : font;

      page.drawText(safeText, {
        x,
        y,
        size,
        font: currentFont
      });

      return currentFont.heightAtSize(size);
    };

    const drawCenteredText = (text, x, width, y, size = 10, isBold = false) => {
      const safeText = sanitizeForWinAnsi(text).replace(/₹/g, 'Rs. ');
      const currentFont = isBold ? boldFont : font;
      const textWidth = currentFont.widthOfTextAtSize(safeText, size);
      const centeredX = x + (width - textWidth) / 2;

      page.drawText(safeText, {
        x: centeredX,
        y,
        size,
        font: currentFont
      });

      return currentFont.heightAtSize(size);
    };

    const drawRightAlignedText = (text, x, width, y, size = 10, isBold = false) => {
      const safeText = sanitizeForWinAnsi(text).replace(/₹/g, 'Rs. ');
      const currentFont = isBold ? boldFont : font;
      const textWidth = currentFont.widthOfTextAtSize(safeText, size);
      const rightX = x + width - textWidth - 3;

      page.drawText(safeText, {
        x: rightX,
        y,
        size,
        font: currentFont
      });

      return currentFont.heightAtSize(size);
    };

    let currentY = height - margin;
    const checkPageBreak = (requiredHeight) => {
      if (currentY - requiredHeight < maxY) {
        drawCenteredText('Continued on next page...', margin, width - margin * 2, maxY, 8, false);
        page = pdfDoc.addPage(PageSizes.A4);
        currentY = height - margin;
        return true;
      }
      return false;
    };

    // Draw report header
    let reportTitle = 'BILLS REPORT';
    if (month && year) {
      reportTitle += ` (${month}/${year})`;
    } else if (startDate && endDate) {
      reportTitle += ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})`;
    }
    
    checkPageBreak(40);
    currentY -= drawCenteredText(reportTitle, margin, width - margin * 2, currentY, 16, true) + 20;

    // Calculate dynamic column widths based on A4 size
    const tableWidth = width - margin * 2;
    
    // Define columns with optimized widths for A4 (total = 515)
    const colWidths = {
      srNo: 20,
      billNumber: 60,
      billDate: 60,
      companyName: 100,
      consigneeInfo: 90,
      taxableAmt: 50,
      gst1: 40,
      gst2: 40,
      totalTax: 50,
      grandTotal: 65
    };

    const totalTableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
    const startX = margin + (tableWidth - totalTableWidth) / 2;

    // Determine GST columns based on first bill
    let gst1Label = 'CGST';
    let gst2Label = 'SGST';
    let showGst2 = true;
    
    if (bills.length > 0) {
      const firstBill = bills[0];
      if (firstBill.taxType === 'IGST') {
        gst1Label = 'IGST';
        gst2Label = '';
        showGst2 = false;
      } else if (firstBill.taxType === 'JOBCGST_JOBSGST') {
        gst1Label = 'JOBCGST';
        gst2Label = 'JOBSGST';
      }
    }

    // Build headers array
    const headers = [
      { key: 'srNo', label: 'Sr.', width: colWidths.srNo, align: 'center' },
      { key: 'billNumber', label: 'Bill No.', width: colWidths.billNumber, align: 'left' },
      { key: 'billDate', label: 'Date', width: colWidths.billDate, align: 'center' },
      { key: 'companyName', label: 'Buyer', width: colWidths.companyName, align: 'left' },
      { key: 'consigneeInfo', label: 'Consignee', width: colWidths.consigneeInfo, align: 'left' },
      { key: 'taxableAmt', label: 'Taxable', width: colWidths.taxableAmt, align: 'right' },
      { key: 'gst1', label: gst1Label, width: colWidths.gst1, align: 'right' },
      { key: 'gst2', label: gst2Label, width: colWidths.gst2, align: 'right', show: showGst2 },
      { key: 'totalTax', label: 'Total Tax', width: colWidths.totalTax, align: 'right' },
      { key: 'grandTotal', label: 'Grand Total', width: colWidths.grandTotal, align: 'right' }
    ];

    // Calculate x positions
    let xPos = startX;
    headers.forEach(header => {
      header.x = xPos;
      xPos += header.width;
    });

    // Draw table header background
    checkPageBreak(30);
    const headerHeight = 22;
    page.drawRectangle({
      x: startX,
      y: currentY - headerHeight,
      width: totalTableWidth,
      height: headerHeight,
      color: rgb(0.85, 0.85, 0.85)
    });

    // Draw vertical lines for header
    let lineX = startX;
    headers.forEach((header, index) => {
      page.drawLine({
        start: { x: lineX, y: currentY },
        end: { x: lineX, y: currentY - headerHeight },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4)
      });
      lineX += header.width;
    });
    // Last vertical line
    page.drawLine({
      start: { x: lineX, y: currentY },
      end: { x: lineX, y: currentY - headerHeight },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Draw header text
    const headerTextY = currentY - 15;
    headers.forEach(header => {
      if (header.show !== false) {
        if (header.align === 'center') {
          drawCenteredText(header.label, header.x, header.width, headerTextY, 9, true);
        } else if (header.align === 'right') {
          drawRightAlignedText(header.label, header.x, header.width, headerTextY, 9, true);
        } else {
          drawText(header.label, header.x + 3, headerTextY, 9, true);
        }
      }
    });

    currentY -= headerHeight;
    
    // Header bottom line
    page.drawLine({
      start: { x: startX, y: currentY },
      end: { x: startX + totalTableWidth, y: currentY },
      thickness: 1.5,
      color: rgb(0.3, 0.3, 0.3)
    });

    // Draw table rows
    const rowHeight = 20;
    bills.forEach((bill, index) => {
      checkPageBreak(rowHeight + 5);
      
      // Alternating row background
      if (index % 2 === 1) {
        page.drawRectangle({
          x: startX,
          y: currentY - rowHeight,
          width: totalTableWidth,
          height: rowHeight,
          color: rgb(0.97, 0.97, 0.97)
        });
      }

      // Draw vertical lines for row
      lineX = startX;
      headers.forEach((header, idx) => {
        page.drawLine({
          start: { x: lineX, y: currentY },
          end: { x: lineX, y: currentY - rowHeight },
          thickness: 0.3,
          color: rgb(0.7, 0.7, 0.7)
        });
        lineX += header.width;
      });
      // Last vertical line
      page.drawLine({
        start: { x: lineX, y: currentY },
        end: { x: lineX, y: currentY - rowHeight },
        thickness: 0.3,
        color: rgb(0.7, 0.7, 0.7)
      });

      const consigneeInfo = bill.isConsigneeDifferent ? 
        (bill.consignee?.name?.substring(0, 12) || 'Different') : 'Same';

      // Get GST values based on tax type
      let gst1Value = '';
      let gst2Value = '';
      
      if (bill.taxType === 'CGST_SGST') {
        gst1Value = Math.round(bill.cgstAmount || 0).toFixed(2);
        gst2Value = Math.round(bill.sgstAmount || 0).toFixed(2);
      } else if (bill.taxType === 'IGST') {
        gst1Value = Math.round(bill.igstAmount || 0).toFixed(2);
        gst2Value = '';
      } else if (bill.taxType === 'JOBCGST_JOBSGST') {
        gst1Value = Math.round(bill.jobCgstAmount || 0).toFixed(2);
        gst2Value = Math.round(bill.jobSgstAmount || 0).toFixed(2);
      }

      const rowData = {
        srNo: (index + 1).toString(),
        billNumber: bill.billNumber || 'N/A',
        billDate: bill.billDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        companyName: (bill.company?.name || bill.companyDetailsSnapshot?.name || 'N/A').substring(0, 16),
        consigneeInfo: consigneeInfo,
        taxableAmt: Math.round(bill.amountAfterDiscount || 0).toFixed(2),
        gst1: gst1Value,
        gst2: gst2Value,
        totalTax: Math.round(bill.totalTaxAmount || 0).toFixed(2),
        grandTotal: Math.round(bill.totalAmount || 0).toFixed(2)
      };

      // Draw row data with proper alignment
      const rowTextY = currentY - 14;
      headers.forEach(header => {
        if (header.show !== false) {
          const value = rowData[header.key];
          if (header.align === 'center') {
            drawCenteredText(value, header.x, header.width, rowTextY, 8.5, false);
          } else if (header.align === 'right') {
            drawRightAlignedText(value, header.x, header.width, rowTextY, 8.5, false);
          } else {
            drawText(value, header.x + 3, rowTextY, 8.5, false);
          }
        }
      });

      currentY -= rowHeight;
      
      // Row bottom line
      page.drawLine({
        start: { x: startX, y: currentY },
        end: { x: startX + totalTableWidth, y: currentY },
        thickness: 0.3,
        color: rgb(0.7, 0.7, 0.7)
      });
    });

    // Draw summary section
    checkPageBreak(rowHeight + 10);
    
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: totalTableWidth,
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9)
    });

    // Draw vertical lines for total row
    lineX = startX;
    headers.forEach((header) => {
      page.drawLine({
        start: { x: lineX, y: currentY },
        end: { x: lineX, y: currentY - rowHeight },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4)
      });
      lineX += header.width;
    });
    page.drawLine({
      start: { x: lineX, y: currentY },
      end: { x: lineX, y: currentY - rowHeight },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4)
    });

    const totalTaxable = bills.reduce((sum, bill) => sum + (bill.amountAfterDiscount || 0), 0);
    const totalGst1 = bills.reduce((sum, bill) => {
      if (bill.taxType === 'CGST_SGST') return sum + (bill.cgstAmount || 0);
      if (bill.taxType === 'IGST') return sum + (bill.igstAmount || 0);
      if (bill.taxType === 'JOBCGST_JOBSGST') return sum + (bill.jobCgstAmount || 0);
      return sum;
    }, 0);
    const totalGst2 = bills.reduce((sum, bill) => {
      if (bill.taxType === 'CGST_SGST') return sum + (bill.sgstAmount || 0);
      if (bill.taxType === 'JOBCGST_JOBSGST') return sum + (bill.jobSgstAmount || 0);
      return sum;
    }, 0);
    const totalTax = bills.reduce((sum, bill) => sum + (bill.totalTaxAmount || 0), 0);
    const grandTotal = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    const totalY = currentY - 14;
    drawText('TOTAL:', startX + colWidths.srNo + 3, totalY, 9, true);
    
    // Find the taxable amount column and draw totals
    const taxableHeader = headers.find(h => h.key === 'taxableAmt');
    drawRightAlignedText(Math.round(totalTaxable).toFixed(2), taxableHeader.x, taxableHeader.width, totalY, 9, true);
    
    const gst1Header = headers.find(h => h.key === 'gst1');
    drawRightAlignedText(Math.round(totalGst1).toFixed(2), gst1Header.x, gst1Header.width, totalY, 9, true);
    
    if (showGst2) {
      const gst2Header = headers.find(h => h.key === 'gst2');
      drawRightAlignedText(Math.round(totalGst2).toFixed(2), gst2Header.x, gst2Header.width, totalY, 9, true);
    }
    
    const totalTaxHeader = headers.find(h => h.key === 'totalTax');
    drawRightAlignedText(Math.round(totalTax).toFixed(2), totalTaxHeader.x, totalTaxHeader.width, totalY, 9, true);
    
    const grandTotalHeader = headers.find(h => h.key === 'grandTotal');
    drawRightAlignedText(Math.round(grandTotal).toFixed(2), grandTotalHeader.x, grandTotalHeader.width, totalY, 9, true);

    currentY -= rowHeight;
    page.drawLine({
      start: { x: startX, y: currentY },
      end: { x: startX + totalTableWidth, y: currentY },
      thickness: 1.5,
      color: rgb(0.3, 0.3, 0.3)
    });

    currentY -= 25;

    // Footer
    checkPageBreak(20);
    const footerText = `Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} by ${req.user.email}`;
    drawCenteredText(footerText, margin, width - margin * 2, currentY, 8, false);

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    let fileName = 'Bills_Report';
    if (month && year) {
      fileName += `_${month}-${year}`;
    } else if (startDate && endDate) {
      fileName += `_${startDate}_to_${endDate}`;
    } else if (companyId) {
      fileName += `_Company_${companyId}`;
    }
    fileName += '.pdf';

    log(`PDF report generated: ${fileName}`, 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    // res.send(Buffer.from(pdfBytes));
    const pdfBuffer = Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    log(`Error generating PDF report: ${error.message} - Stack: ${error.stack}`, 'error');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF report.' });
    }
  }
};

const createBillFromChallans = async (req, res) => {
  let {
    billNumber,
    billDate,
    companyId,
    challanIds = [],
    discountPercentage = 0,
    taxType,
    overrideCgstPercentage,
    overrideSgstPercentage,
    overrideIgstPercentage,
    overrideJobCgstPercentage,
    overrideJobSgstPercentage,
    status,
    amountInWords,
    eWayBillNumber = '',
    paymentTermsDays = 30,
    financialYear
  } = req.body;

  if (!companyId || !challanIds.length || !taxType) {
    return res.status(400).json({
      message: 'companyId, challanIds and taxType are required.'
    });
  }

  if (!['CGST_SGST', 'IGST', 'JOBCGST_JOBSGST'].includes(taxType)) {
    return res.status(400).json({ message: 'Invalid tax type' });
  }

  try {
    const resolvedDate = billDate ? new Date(billDate) : new Date();
    const resolvedFY = financialYear || getFinancialYear(resolvedDate);

    if (!billNumber) {
      billNumber = await generateBillNumber(resolvedFY, req.organizationId);
    } else {
      const expectedPrefix = `${resolvedFY}/`;
      if (!billNumber.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: `Bill number must follow format "${expectedPrefix}XX"`
        });
      }
    }

    const challans = await Challan.find({
      _id: { $in: challanIds },
      company: companyId
    });

    if (challans.length !== challanIds.length) {
      return res.status(400).json({
        message: 'Some challans not found or not belong to company'
      });
    }

    for (const challan of challans) {
      if (challan.financialYear !== resolvedFY) {
        return res.status(400).json({
          message: `Challan ${challan.challanNumber} belongs to different financial year`
        });
      }
      if (challan.isUsed) {
        return res.status(400).json({
          message: `Challan ${challan.challanNumber} already used`
        });
      }
    }

    const settings = await Settings.getSettings(req.organizationId);
    const items = [];

    for (const challan of challans) {
      const itemConfig = settings.itemConfigurations.find(
        item => item.description === challan.descriptionOfGoods
      );

      const rate = itemConfig?.defaultRate || 0;

      items.push({
        description: challan.descriptionOfGoods,
        hsnSacCode: itemConfig?.hsnSacCode || '',
        quantity: challan.totalNetWeight,
        rate,
        amount: Math.round(challan.totalNetWeight * rate),
      });
    }

    const calculated = calculateBillTotals(
      items,
      discountPercentage,
      taxType,
      overrideCgstPercentage ?? settings.cgstPercentage,
      overrideSgstPercentage ?? settings.sgstPercentage,
      overrideIgstPercentage ?? settings.igstPercentage,
      overrideJobCgstPercentage ?? settings.jobCgstPercentage,
      overrideJobSgstPercentage ?? settings.jobSgstPercentage
    );

    const newBill = new Bill({
      organizationId: req.organizationId,
      billNumber,
      financialYear: resolvedFY,
      billDate: resolvedDate,
      company: companyId,
      challans: challanIds,
      challanNumber: challans.map(c => c.challanNumber).join(', '),
      items: calculated.items,
      subTotalAmount: calculated.subTotalAmount,
      discountPercentage,
      discountAmount: calculated.discountAmount,
      amountAfterDiscount: calculated.amountAfterDiscount,
      taxType,
      cgstAmount: calculated.cgstAmount,
      sgstAmount: calculated.sgstAmount,
      igstAmount: calculated.igstAmount,
      jobCgstAmount: calculated.jobCgstAmount,
      jobSgstAmount: calculated.jobSgstAmount,
      totalTaxAmount: calculated.totalTaxAmount,
      roundOffAmount: calculated.roundOffAmount,
      totalAmount: calculated.totalAmount,
      amountInWords,
      eWayBillNumber,
      paymentTermsDays,
      status: status || 'Pending',
      createdBy: req.user._id,
    });

    const savedBill = await newBill.save();

    await Challan.updateMany(
      { _id: { $in: challanIds } },
      { isUsed: true, bill: savedBill._id }
    );

    res.status(201).json(savedBill);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: `Bill number '${billNumber}' already exists.`
      });
    }

    res.status(500).json({
      message: 'Server error while creating bill from challans.'
    });
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  generateBillExcel,
  generateBillPdf,
  downloadBillsExcel,
  downloadBillsPdf,
  getAvailableChallans,
  createBillFromChallans,
  getNextBillNumber // ✅ IMPORTANT
};


//