const Challan = require('../models/Challan');
const Company = require('../models/Company');
const Settings = require('../models/Settings');
const Bill = require('../models/Bill');
const { log } = require('../middleware/logger');
const Box = require('../models/Box');
const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const ExcelJS = require('exceljs');

const { getOrgDetails } = require('../utils/orgDetails');

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

const getNextChallanNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;

    const fy = financialYear || getFinancialYear();
    const challanNumber = await generateChallanNumber(fy, req.organizationId);

    res.json({ challanNumber, financialYear: fy });

  } catch (error) {
    res.status(500).json({ message: 'Error generating challan number' });
  }
};

const generateChallanNumber = async (financialYear, organizationId) => {
  const prefix = `${financialYear}/`;

  const lastChallan = await Challan.findOne({
    challanNumber: { $regex: `^${prefix.replace('-', '\\-')}` },
    organizationId,
  }).sort({ challanNumber: -1 });

  let nextSeq = 1;

  if (lastChallan) {
    const parts = lastChallan.challanNumber.split('/');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
};

// Helper function to calculate challan totals
// const calculateChallanTotals = (boxDetails) => {
//   const totalNetWeight = boxDetails.reduce((acc, box) => acc + box.netWeight, 0);
//   const totalCops = boxDetails.reduce((acc, box) => acc + box.cops, 0);
//   return {
//     totalNetWeight: parseFloat(totalNetWeight.toFixed(2)),
//     totalCops,
//   };
// };

const calculateChallanTotals = (boxDetails) => {
  const totalNetWeight = boxDetails.reduce((acc, box) => {
    const weight = parseFloat(box.netWeight) || 0; // ✅ FIX
    return acc + weight;
  }, 0);

  const totalCops = boxDetails.reduce((acc, box) => {
    const cops = parseInt(box.cops) || 0; // ✅ FIX
    return acc + cops;
  }, 0);

  return {
    totalNetWeight: Number(totalNetWeight.toFixed(2)), // ✅ SAFE
    totalCops,
  };
};

const createChallan = async (req, res) => {
  let {
    challanNumber,
    challanDate,
    companyId,
    descriptionOfGoods,
    broker = 'direct',
    boxDetails,
    boxIds = [],
    financialYear
  } = req.body;

  if (!companyId || !descriptionOfGoods || (!boxDetails && !boxIds.length)) {
    return res.status(400).json({
      message: 'Missing required fields: companyId, descriptionOfGoods, and either boxDetails or boxIds.',
    });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      log(`Challan creation failed: Company not found - ID: ${companyId}`, 'warn');
      return res.status(404).json({ message: 'Company not found.' });
    }

    const settings = await Settings.getSettings(req.organizationId);
    const validDescription = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
    if (!validDescription) {
      return res.status(400).json({ message: 'Description of Goods must be from predefined settings.' });
    }

    const companyDetailsSnapshot = {
      name: company.name,
      address: company.address,
      gstNumber: company.gstNumber,
    };

    let finalBoxDetails = [];

    if (boxIds && boxIds.length > 0) {
      const boxes = await Box.find({ _id: { $in: boxIds }, isUsed: false, organizationId: req.organizationId });

      if (boxes.length !== boxIds.length) {
        return res.status(400).json({ message: 'One or more boxes are already used or not found.' });
      }

      finalBoxDetails = boxes.map(box => ({
        boxNumber: box.boxNumber,
        netWeight: parseFloat(box.netWeight) || 0,
        cops: parseInt(box.cops) || 0,
      }));

      await Box.updateMany(
        { _id: { $in: boxIds }, organizationId: req.organizationId },
        { $set: { isUsed: true } }
      );
    } else if (boxDetails && Array.isArray(boxDetails) && boxDetails.length > 0) {
      finalBoxDetails = boxDetails.map(box => ({
        boxNumber: box.boxNumber,
        netWeight: parseFloat(box.netWeight) || 0,
        cops: parseInt(box.cops) || 0,
      }));
    }

    const calculated = calculateChallanTotals(finalBoxDetails);

    const resolvedDate = challanDate ? new Date(challanDate) : new Date();
    const resolvedFY = financialYear || getFinancialYear(resolvedDate);

    if (!challanNumber) {
      challanNumber = await generateChallanNumber(resolvedFY, req.organizationId);
    }

    const newChallan = new Challan({
      challanNumber,
      financialYear: resolvedFY,
      challanDate: resolvedDate,
      company: companyId,
      companyDetailsSnapshot,
      descriptionOfGoods,
      broker,
      boxDetails: finalBoxDetails,
      totalNetWeight: calculated.totalNetWeight,
      totalCops: calculated.totalCops,
      createdBy: req.user._id,
      isUsed: false,
      organizationId: req.organizationId,
    });

    const savedChallan = await newChallan.save();
    log(`Challan created successfully: ${savedChallan.challanNumber} by ${req.user.email}`, 'info');
    res.status(201).json(savedChallan);
  } catch (error) {
    log(`Error creating challan: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: `Challan number '${challanNumber}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating challan.' });
  }
};
const getChallans = async (req, res) => {
  const { companyId, startDate, endDate, financialYear } = req.query;

  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;

  // ✅ ADD THIS (VERY IMPORTANT)
  if (financialYear) query.financialYear = financialYear;

  if (startDate && endDate) {
    query.challanDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.challanDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.challanDate = {
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  }

  try {
    const challans = await Challan.find(query)
      .populate('company', 'name gstNumber')
      .populate('createdBy', 'username email')
      .sort({ challanNumber: -1 });

    res.json(challans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challans' });
  }
};

const getChallansByCompany = async (req, res) => {
  try {
    const { companyId, financialYear } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID required" });
    }

    const bills = await Bill.find({
      company: companyId,
      financialYear,
      organizationId: req.organizationId
    }).select("challan challans");

    const usedChallanIds = [];

    bills.forEach((bill) => {
      if (bill.challan) {
        usedChallanIds.push(bill.challan.toString());
      }

      if (Array.isArray(bill.challans)) {
        bill.challans.forEach((id) => {
          usedChallanIds.push(id);
        });
      }
    });

    const challans = await Challan.find({
      company: companyId,
      financialYear,
      isUsed: false,
      _id: { $nin: usedChallanIds },
      organizationId: req.organizationId
    }).sort({ challanNumber: 1 });

    res.json(challans);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching challans" });
  }
};


// @desc    Get a single challan by ID
// @route   GET /api/challans/:id
// @access  Private/Admin
const getChallanById = async (req, res) => {
  try {
    const challan = await Challan.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('company', 'name address gstNumber')
      .populate('createdBy', 'username email');

    if (!challan) {
      log(`Challan not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Challan not found' });
    }
    log(`Fetched challan by ID: ${challan.challanNumber} by ${req.user.email}`, 'info');
    res.json(challan);
  } catch (error) {
    log(`Error fetching challan ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching challan.' });
  }
};

// @desc    Update a challan
// @route   PUT /api/challans/:id
// @access  Private/Admin
const updateChallan = async (req, res) => {
  const challanId = req.params.id;
  const { challanNumber, challanDate, companyId, descriptionOfGoods, broker, boxDetails } = req.body;

  try {
    const challan = await Challan.findById(challanId);
    if (!challan) {
      log(`Challan update failed: Not found with ID: ${challanId}`, 'warn');
      return res.status(404).json({ message: 'Challan not found' });
    }

    if (challan.organizationId && String(challan.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    if (challan.isUsed) {
      return res.status(400).json({ message: 'Cannot modify a challan that is used in a bill.' });
    }

    if (challanNumber && challanNumber !== challan.challanNumber) {
      const existingChallan = await Challan.findOne({ challanNumber, organizationId: req.organizationId });
      if (existingChallan && existingChallan._id.toString() !== challanId) {
        return res.status(400).json({ message: `Challan number '${challanNumber}' already exists.` });
      }
      challan.challanNumber = challanNumber;
    }
    if (challanDate) challan.challanDate = new Date(challanDate);
    if (broker !== undefined) challan.broker = broker;

    if (companyId && companyId !== challan.company.toString()) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found.' });
      }
      challan.company = companyId;
      challan.companyDetailsSnapshot = {
        name: company.name,
        address: company.address,
        gstNumber: company.gstNumber,
      };
    }

    if (descriptionOfGoods) {
      const settings = await Settings.getSettings(req.organizationId);
      const validDescription = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
      if (!validDescription) {
        return res.status(400).json({ message: 'Description of Goods must be from predefined settings.' });
      }
      challan.descriptionOfGoods = descriptionOfGoods;
    }

    if (boxDetails && Array.isArray(boxDetails)) {
      challan.boxDetails = boxDetails;
      const calculated = calculateChallanTotals(boxDetails);
      challan.totalNetWeight = calculated.totalNetWeight;
      challan.totalCops = calculated.totalCops;
    }

    const updatedChallan = await challan.save();
    log(`Challan updated: ${updatedChallan.challanNumber} by ${req.user.email}`, 'info');
    res.json(updatedChallan);
  } catch (error) {
    log(`Error updating challan ID ${challanId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: `Challan number '${challanNumber}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating challan.' });
  }
};

const deleteChallan = async (req, res) => {
  const challanId = req.params.id;
  try {
    const challan = await Challan.findById(challanId);
    if (!challan) {
      log(`Challan deletion failed: Not found with ID: ${challanId}`, 'warn');
      return res.status(404).json({ message: 'Challan not found' });
    }

    if (challan.organizationId && String(challan.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    if (challan.isUsed) {
      return res.status(400).json({ message: 'Cannot delete a challan that is used in a bill.' });
    }

    if (challan.boxDetails && challan.boxDetails.length > 0) {
      const boxNumbers = challan.boxDetails.map(b => b.boxNumber);
      await Box.updateMany(
        { boxNumber: { $in: boxNumbers }, isUsed: true, organizationId: req.organizationId },
        { $set: { isUsed: false } }
      );
      log(`Boxes ${boxNumbers.join(', ')} marked as Available after challan deletion`, 'info');
    }

    await challan.deleteOne();
    log(`Challan deleted: ${challan.challanNumber} by ${req.user.email}`, 'info');
    res.json({ message: 'Challan deleted successfully' });
  } catch (error) {
    log(`Error deleting challan ID ${challanId}: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while deleting challan.' });
  }
};


const generateChallanPdf = async (req, res) => {
  const challanId = req.params.id;
  try {
    const org = await getOrgDetails(req.organizationId);
    const challan = await Challan.findOne({ _id: challanId, organizationId: req.organizationId }).populate('company');
    if (!challan) {
      log(`PDF generation failed: Challan not found - ID: ${challanId}`, 'warn');
      return res.status(404).json({ message: 'Challan not found.' });
    }
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 420;
    const pageHeight = 595;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    const contentWidth = rightMargin - leftMargin;
    
    const CONFIG = {
      leftMargin: 20,
      rightMargin: pageWidth - 20,
      contentWidth: pageWidth - 40,
      lineSpacing: 10,
      smallLineSpacing: 6,
      itemLineSpacing: 10,
      itemFontSize: 8,
      headerFontSize: 7,
      textFontSize: 8,
      titleFontSize: 20,
      columnGap: 8,
      boxPerColumn: 25,
      columnsPerPage: 2,
      detailsRightMargin: pageWidth - 150,
      footerHeight: 100 // Fixed height for footer section
    };

    const drawTextAndMeasureHeight = (page, text, xPos, currentY, options = {}) => {
      const textToDraw = String(text ?? '').replace(/₹/g, 'INR ');
      const FONT_TO_USE = options.font || font;
      const SIZE = options.size || CONFIG.textFontSize;
      const COLOR = options.color || rgb(0, 0, 0);
      const LINE_HEIGHT = options.lineHeight || SIZE * 1.2;
      const MAX_WIDTH = options.maxWidth;
      const SPACING_AFTER = options.spacingAfter !== undefined ? options.spacingAfter : 2;
      const ALIGN = options.align || 'left';
      let actualXPos = xPos;
      if (ALIGN === 'center' && MAX_WIDTH) {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToDraw, SIZE);
        actualXPos = xPos + (MAX_WIDTH - textWidth) / 2;
      } else if (ALIGN === 'center') {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToDraw, SIZE);
        actualXPos = CONFIG.leftMargin + (CONFIG.contentWidth - textWidth) / 2;
      } else if (ALIGN === 'right') {
        const textWidth = FONT_TO_USE.widthOfTextAtSize(textToDraw, SIZE);
        actualXPos = xPos - textWidth;
      }
      page.drawText(textToDraw, {
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
      if (MAX_WIDTH && FONT_TO_USE.widthOfTextAtSize(textToDraw.replace(/\n/g, ' '), SIZE) > MAX_WIDTH) {
        const segments = textToDraw.split('\n');
        numLines = 0;
        segments.forEach(segment => {
          if (segment.trim() === '') {
            numLines++;
            return;
          }
          let currentLine = '';
          let linesForSegment = 1;
          const words = segment.split(' ');
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (FONT_TO_USE.widthOfTextAtSize(testLine, SIZE) > MAX_WIDTH) {
              linesForSegment++;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          numLines += linesForSegment;
        });
        if (textToDraw.endsWith('\n') && segments[segments.length - 1].trim() !== '') numLines++;
        if (numLines === 0 && textToDraw.trim() !== '') numLines = 1;
      } else {
        numLines = textToDraw.split('\n').length;
        if (numLines === 0 && textToDraw.trim() !== '') numLines = 1;
      }
      const textHeight = textToDraw.trim() === '' ? 0 : numLines * LINE_HEIGHT;
      return textHeight + SPACING_AFTER;
    };

    // Function to draw header on a page
    const drawHeader = (page) => {
      let currentY = pageHeight - 30;
      
      // Line 1: "SHREE GANESHAY NAMAH" (Center) and "TEXT CHALLAN" (Right)
      const topHeaderTextY = currentY;
      const shreeGaneshText = 'SHREE GANESHAY NAMAH';
      const shreeGaneshFontSize = 8;
      const shreeGaneshOptions = { font: boldFont, size: shreeGaneshFontSize, align: 'center', color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
      const shreeGaneshHeight = drawTextAndMeasureHeight(page, shreeGaneshText, leftMargin, topHeaderTextY, shreeGaneshOptions);
      
      const taxInvoiceText = 'TEXT CHALLAN';
      const taxInvoiceFontSize = 12;
      const taxInvoiceWidth = boldFont.widthOfTextAtSize(taxInvoiceText, taxInvoiceFontSize);
      const taxInvoiceOptions = { font: boldFont, size: taxInvoiceFontSize, color: rgb(0.2, 0.2, 0.2), spacingAfter: 0 };
      const taxInvoiceHeight = drawTextAndMeasureHeight(page, taxInvoiceText, rightMargin - taxInvoiceWidth, topHeaderTextY, taxInvoiceOptions);
      currentY -= Math.max(shreeGaneshHeight, taxInvoiceHeight) + 12;
      
      // Company Name
      const companyNameText = org.name;
      const companyNameFontSize = 20;
      currentY -= drawTextAndMeasureHeight(page, companyNameText, leftMargin, currentY, { font: boldFont, size: companyNameFontSize, align: 'center', color: rgb(0.1, 0.3, 0.5) });
      
      // Address
      const addressText = org.address;
      const addressFontSize = 8;
      currentY -= drawTextAndMeasureHeight(page, addressText, leftMargin, currentY + 10, { size: addressFontSize, align: 'center', maxWidth: contentWidth, spacingAfter: 3 });
      
      // GSTIN
      const gstinText = `GSTIN: ${org.gstin}`;
      const gstinFontSize = 9;
      currentY -= drawTextAndMeasureHeight(page, gstinText, leftMargin, currentY + 10, { size: gstinFontSize, align: 'center', spacingAfter: 10 });
      
      // Consignee and Challan Details
      const clientName = challan.companyDetailsSnapshot?.name || challan.company?.name || 'N/A';
      const clientAddress = challan.companyDetailsSnapshot?.address || challan.company?.address || 'N/A';
      const clientGstin = challan.companyDetailsSnapshot?.gstNumber || challan.company?.gstNumber || 'N/A';
      
      // Consignee Section (left side)
      const consigneeRectY = currentY - 70;
      page.drawRectangle({
        x: CONFIG.leftMargin,
        y: consigneeRectY,
        width: CONFIG.contentWidth / 2 + 15,
        height: 80,
        color: rgb(0.95, 0.95, 0.95),
        opacity: 0.5,
      });
      
      let consigneeY = currentY;
      consigneeY -= drawTextAndMeasureHeight(page, `Consignee:`, CONFIG.leftMargin + 5, consigneeY, {
        font: boldFont,
        size: 9,
        spacingAfter: 3
      });
      consigneeY -= drawTextAndMeasureHeight(page, clientName, CONFIG.leftMargin + 5, consigneeY, {
        font: boldFont,
        size: 9,
        spacingAfter: 3,
        maxWidth: CONFIG.contentWidth / 2
      });
      consigneeY -= drawTextAndMeasureHeight(page, clientAddress, CONFIG.leftMargin + 5, consigneeY, {
        size: CONFIG.textFontSize,
        spacingAfter: 3,
        maxWidth: CONFIG.contentWidth / 2
      });
      consigneeY -= drawTextAndMeasureHeight(page, `GSTIN: ${clientGstin}`, CONFIG.leftMargin + 5, consigneeY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 3,
        maxWidth: CONFIG.contentWidth / 2
      });
      
      // Challan Details (right side)
      const detailsRectWidth = 150;
      const detailsRectX = CONFIG.rightMargin - detailsRectWidth;
      const detailsRectY = currentY - 55;
      page.drawRectangle({
        x: detailsRectX,
        y: detailsRectY,
        width: detailsRectWidth,
        height: 65,
        color: rgb(0.95, 0.95, 0.95),
        opacity: 0.5,
      });
      
      let detailsY = currentY;
      const detailsTextX = CONFIG.rightMargin - 5; // Right aligned within the box
      
      detailsY -= drawTextAndMeasureHeight(page, `Challan No.: ${challan.challanNumber || 'N/A'}`, detailsTextX, detailsY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 3,
        align: 'right'
      });
      detailsY -= drawTextAndMeasureHeight(page, `Date: ${new Date(challan.challanDate).toLocaleDateString('en-IN')}`, detailsTextX, detailsY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 3,
        align: 'right'
      });
      detailsY -= drawTextAndMeasureHeight(page, `Description: ${challan.descriptionOfGoods || 'N/A'}`, detailsTextX, detailsY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 3,
        align: 'right',
        maxWidth: 140
      });
      
      // Return the Y position where content can start
      return Math.min(consigneeY, detailsY) - CONFIG.lineSpacing;
    };

    // Function to draw footer on a page
    const drawFooter = (page, totalItems) => {
      const fixedY = CONFIG.footerHeight;
      const totalsY = fixedY;
      
      page.drawLine({
        start: { x: CONFIG.leftMargin, y: totalsY },
        end: { x: CONFIG.rightMargin, y: totalsY },
        thickness: 1.5,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      let totalsTextY = totalsY - CONFIG.smallLineSpacing - 2;
      const totalsOptions = {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 0
      };
      drawTextAndMeasureHeight(page, `Total Boxes: ${totalItems}`, CONFIG.leftMargin, totalsTextY, totalsOptions);
      drawTextAndMeasureHeight(page, `Total ${org.terminology?.copsLabel || 'Cops'}: ${challan.totalCops}`, CONFIG.leftMargin + (CONFIG.contentWidth / 3), totalsTextY, totalsOptions);
      drawTextAndMeasureHeight(page, `Total Weight: ${challan.totalNetWeight.toFixed(2)}`, CONFIG.leftMargin + (CONFIG.contentWidth / 3) * 2, totalsTextY, totalsOptions);
      
      const conditionsY = totalsTextY - CONFIG.smallLineSpacing;
      page.drawLine({
        start: { x: CONFIG.leftMargin, y: conditionsY },
        end: { x: CONFIG.rightMargin, y: conditionsY },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      let declarationY = conditionsY - CONFIG.smallLineSpacing;
      declarationY -= drawTextAndMeasureHeight(page, 'Conditions of Sale:', CONFIG.leftMargin, declarationY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 3
      });
      declarationY -= drawTextAndMeasureHeight(page, 'Complaint regarding Goods Should be reported within 24 hours on the receipt of goods.', CONFIG.leftMargin, declarationY, {
        size: CONFIG.textFontSize,
        spacingAfter: 6,
        maxWidth: CONFIG.contentWidth
      });
      
      const stampY = declarationY - 15;
      drawTextAndMeasureHeight(page, `For ${org.name}`, CONFIG.rightMargin - 120, stampY, {
        font: boldFont,
        size: CONFIG.textFontSize,
        spacingAfter: 0
      });
      
      const contactY = fixedY - 8 * CONFIG.lineSpacing;
      page.drawRectangle({
        x: CONFIG.leftMargin,
        y: contactY - 6,
        width: CONFIG.contentWidth,
        height: 15,
        color: rgb(0.1, 0.3, 0.5),
        opacity: 0.1,
      });
      const contactText = `Contact: ${org.contactPerson} | Phone: ${org.phone} | Email: ${org.email}`;
      const contactTextWidth = font.widthOfTextAtSize(contactText, CONFIG.textFontSize);
      drawTextAndMeasureHeight(page, contactText, CONFIG.leftMargin + (CONFIG.contentWidth - contactTextWidth) / 2, contactY, {
        size: CONFIG.textFontSize,
        spacingAfter: 0,
        color: rgb(0.3, 0.3, 0.3)
      });
    };

    // Function to draw table headers
    const drawTableHeaders = (page, tableStartY, columnPositions, columnWidth) => {
      columnPositions.forEach(colX => {
        const headerOptions = {
          font: boldFont,
          size: CONFIG.headerFontSize,
          spacingAfter: 0,
          color: rgb(0.1, 0.1, 0.1)
        };
        const colHeaderX = colX + 5;
        const headerSpacing = (columnWidth - 15) / 4;
        drawTextAndMeasureHeight(page, 'Sr No.', colHeaderX, tableStartY, headerOptions);
        drawTextAndMeasureHeight(page, 'Box No.', colHeaderX + headerSpacing, tableStartY, headerOptions);
        drawTextAndMeasureHeight(page, 'Weight', colHeaderX + headerSpacing * 2, tableStartY, headerOptions);
        drawTextAndMeasureHeight(page, org.terminology?.copsLabel || 'Cops', colHeaderX + headerSpacing * 3, tableStartY, headerOptions);
      });
      
      const headerLineY = tableStartY - CONFIG.smallLineSpacing;
      page.drawLine({
        start: { x: CONFIG.leftMargin, y: headerLineY },
        end: { x: CONFIG.rightMargin, y: headerLineY },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      return headerLineY;
    };

    // Main PDF generation logic
    const totalItems = challan.boxDetails.length;
    const columnWidth = (CONFIG.contentWidth - (CONFIG.columnGap * (CONFIG.columnsPerPage - 1))) / CONFIG.columnsPerPage;
    const columnPositions = Array.from({ length: CONFIG.columnsPerPage }, (_, i) =>
      CONFIG.leftMargin + (i * (columnWidth + CONFIG.columnGap))
    );
    
    let currentItem = 0;
    let pageNumber = 0;

    while (currentItem < totalItems) {
      // Create new page
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Draw header
      const tableStartY = drawHeader(page);
      
      // Draw table headers
      const headerLineY = drawTableHeaders(page, tableStartY, columnPositions, columnWidth);
      const itemsStartY = headerLineY - CONFIG.itemLineSpacing;
      
      // Fill columns with items (up to 50 items per page: 25 per column × 2 columns)
      const itemsPerPage = CONFIG.boxPerColumn * CONFIG.columnsPerPage;
      
      for (let col = 0; col < CONFIG.columnsPerPage && currentItem < totalItems; col++) {
        const colX = columnPositions[col];
        let columnY = itemsStartY;
        const itemsInThisColumn = Math.min(CONFIG.boxPerColumn, totalItems - currentItem);
        
        for (let i = 0; i < itemsInThisColumn; i++) {
          const box = challan.boxDetails[currentItem];
          const itemRowOptions = {
            size: CONFIG.itemFontSize,
            spacingAfter: 0
          };
          const colItemX = colX + 5;
          const itemSpacing = (columnWidth - 15) / 4;
          
          drawTextAndMeasureHeight(page, String(currentItem + 1), colItemX, columnY, itemRowOptions);
          drawTextAndMeasureHeight(page, box.boxNumber.split('/').pop(), colItemX + itemSpacing, columnY, itemRowOptions);
          drawTextAndMeasureHeight(page, String(box.netWeight.toFixed(2)), colItemX + itemSpacing * 2, columnY, itemRowOptions);
          drawTextAndMeasureHeight(page, String(box.cops), colItemX + itemSpacing * 3, columnY, itemRowOptions);
          
          columnY -= CONFIG.itemLineSpacing;
          currentItem++;
        }
      }
      
      // Draw footer
      drawFooter(page, totalItems);
      
      pageNumber++;
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfFileName = `Challan-${challan.challanNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    log(`PDF generated for challan ${challan.challanNumber}`, 'info');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    log(`Error generating PDF for challan ID ${challanId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF challan.' });
    }
  }
};
// @desc    Download challans as Excel with filters
// @route   GET /api/challans/download/excel
// @access  Private/Admin
const downloadChallansExcel = async (req, res) => {
  const { companyId, startDate, endDate, status, month, year } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;
  if (status) query.status = status;

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    query.challanDate = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    query.challanDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.challanDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.challanDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const challans = await Challan.find(query)
      .populate('company', 'name gstNumber address')
      .sort({ challanDate: 1, challanNumber: 1 });

    if (!challans || challans.length === 0) {
      return res.status(404).json({ message: 'No challans found matching the criteria' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Challans');

    worksheet.columns = [
      { header: 'Challan No.', key: 'challanNumber', width: 15 },
      { header: 'Date', key: 'challanDate', width: 12 },
      { header: 'Company Name', key: 'companyName', width: 30 },
      { header: 'Company GST', key: 'companyGst', width: 20 },
      { header: 'Company Address', key: 'companyAddress', width: 40 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Total Weight', key: 'totalWeight', width: 12 },
      { header: 'Total Cops', key: 'totalCops', width: 12 },
      { header: 'Used', key: 'isUsed', width: 10 },
    ];

    challans.forEach((challan) => {
      const rowData = {
        challanNumber: challan.challanNumber,
        challanDate: challan.challanDate.toLocaleDateString('en-IN'),
        companyName: challan.company?.name || challan.companyDetailsSnapshot?.name,
        companyGst: challan.company?.gstNumber || challan.companyDetailsSnapshot?.gstNumber,
        companyAddress: challan.company?.address || challan.companyDetailsSnapshot?.address,
        description: challan.descriptionOfGoods,
        totalWeight: challan.totalNetWeight.toFixed(2),
        totalCops: challan.totalCops,
        isUsed: challan.isUsed ? 'Yes' : 'No',
      };
      worksheet.addRow(rowData);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    let fileName = 'Challans';
    if (month && year) {
      fileName += `_${month}-${year}`;
    } else if (startDate && endDate) {
      fileName += `_${startDate}_to_${endDate}`;
    } else if (companyId) {
      fileName += `_Company_${companyId}`;
    }
    fileName += '.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    log(`Error generating Excel: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error generating Excel file', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Download challans as PDF with filters
// @route   GET /api/challans/download/pdf
// @access  Private/Admin
const downloadChallansPdf = async (req, res) => {
  const { companyId, startDate, endDate, month, year } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyId) query.company = companyId;

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    query.challanDate = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    query.challanDate = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else if (startDate) {
    query.challanDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.challanDate = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
  }

  try {
    const challans = await Challan.find(query)
      .populate('company', 'name gstNumber address')
      .sort({ challanDate: 1, challanNumber: 1 });

    if (!challans || challans.length === 0) {
      return res.status(404).json({ message: 'No challans found matching the criteria' });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 40;
    const tableWidth = width - margin * 2;
    const contentWidth = tableWidth;

    const drawText = (text, x, y, size = 10, isBold = false, maxWidth = contentWidth, align = 'left') => {
      const safeText = String(text || '').replace(/₹/g, 'Rs. ');
      const currentFont = isBold ? boldFont : font;
      const textWidth = currentFont.widthOfTextAtSize(safeText, size);
      let finalX = x;

      if (align === 'center' && maxWidth) {
        finalX = x + (maxWidth - textWidth) / 2;
      } else if (align === 'right' && maxWidth) {
        finalX = x + (maxWidth - textWidth);
      }

      page.drawText(safeText, {
        x: finalX,
        y,
        size,
        font: currentFont,
        maxWidth: maxWidth || undefined,
        lineHeight: size * 1.3,
        wordBreaks: [' ', '/', '-', ','],
      });

      let numLines = 1;
      if (maxWidth && currentFont.widthOfTextAtSize(safeText.replace(/\n/g, ' '), size) > maxWidth) {
        const segments = safeText.split('\n');
        numLines = 0;
        segments.forEach(segment => {
          if (segment.trim() === '') {
            numLines++;
            return;
          }
          let currentLine = '';
          let linesForSegment = 1;
          const words = segment.split(' ');
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (currentFont.widthOfTextAtSize(testLine, size) > maxWidth) {
              linesForSegment++;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          numLines += linesForSegment;
        });
        if (safeText.endsWith('\n') && segments[segments.length - 1].trim() !== '') numLines++;
        if (numLines === 0 && safeText.trim() !== '') numLines = 1;
      } else {
        numLines = safeText.split('\n').length;
        if (numLines === 0 && safeText.trim() !== '') numLines = 1;
      }

      return numLines * (size * 1.3) + 2;
    };

    let y = height - margin;

    let reportTitle = 'CHALLANS REPORT';
    if (month && year) {
      reportTitle += ` (${month}/${year})`;
    } else if (startDate && endDate) {
      reportTitle += ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})`;
    }
    y -= drawText(reportTitle, margin, y, 18, true, tableWidth, 'center');

    let filterInfo = '';
    if (companyId) {
      filterInfo += `Company: ${challans[0]?.company?.name || challans[0]?.companyDetailsSnapshot?.name || companyId}`;
    }
    if (filterInfo) {
      y -= drawText(filterInfo, margin, y, 10, false, tableWidth, 'center');
    }

    y -= 20;

    const colWidths = {
      challanNo: 80,
      date: 80,
      company: 180,
      description: 100,
      weight: 80,
    };

    const colPositions = {
      challanNo: margin,
      date: margin + colWidths.challanNo,
      company: margin + colWidths.challanNo + colWidths.date,
      description: margin + colWidths.challanNo + colWidths.date + colWidths.company,
      weight: margin + colWidths.challanNo + colWidths.date + colWidths.company + colWidths.description,
    };

    const drawTableHeader = () => {
      page.drawRectangle({
        x: margin,
        y: y - 10,
        width: tableWidth,
        height: 25,
        color: rgb(0.9, 0.9, 0.9),
        opacity: 0.7,
      });

      drawText('Challan No.', colPositions.challanNo + 5, y, 10, true, colWidths.challanNo - 10);
      drawText('Date', colPositions.date + 5, y, 10, true, colWidths.date - 10);
      drawText('Company', colPositions.company + 5, y, 10, true, colWidths.company - 10);
      drawText('Description', colPositions.description + 5, y, 10, true, colWidths.description - 10);
      drawText('Weight', colPositions.weight + 5, y, 10, true, colWidths.weight - 10, 'right');
      y -= 30;
    };

    drawTableHeader();

    for (const challan of challans) {
      const rowHeight = 20;
      if (y - rowHeight < margin) {
        page = pdfDoc.addPage([595, 842]);
        y = height - margin;
        drawTableHeader();
      }

      drawText(challan.challanNumber, colPositions.challanNo + 5, y, 9, false, colWidths.challanNo - 10);
      drawText(challan.challanDate.toLocaleDateString('en-IN'), colPositions.date + 5, y, 9, false, colWidths.date - 10);
      const companyName = challan.company?.name || challan.companyDetailsSnapshot?.name || 'N/A';
      const companyText = companyName.length > 30 ? companyName.substring(0, 27) + '...' : companyName;
      drawText(companyText, colPositions.company + 5, y, 9, false, colWidths.company - 10);
      const descText = challan.descriptionOfGoods.length > 20 ? challan.descriptionOfGoods.substring(0, 17) + '...' : challan.descriptionOfGoods;
      drawText(descText, colPositions.description + 5, y, 9, false, colWidths.description - 10);
      drawText(challan.totalNetWeight.toFixed(2), colPositions.weight + 5, y, 9, false, colWidths.weight - 10, 'right');
      y -= 20;

      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 10;
    }

    y -= 20;
    drawText(`Generated on ${new Date().toLocaleDateString('en-IN')}`, margin, margin - 30, 9);
    drawText(`Total Challans: ${challans.length}`, width - margin - 150, margin - 30, 9, true);

    res.setHeader('Content-Type', 'application/pdf');
    let fileName = 'Challans';
    if (month && year) {
      fileName += `_${month}-${year}`;
    } else if (startDate && endDate) {
      fileName += `_${startDate}_to_${endDate}`;
    } else if (companyId) {
      fileName += `_Company_${companyId}`;
    }
    fileName += '.pdf';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const pdfBytes = await pdfDoc.save();
    res.write(pdfBytes);
    res.end();
  } catch (error) {
    log(`Error generating PDF: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error generating PDF file', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};


module.exports = {
  createChallan,
  getChallans,
  getChallanById,
  updateChallan,
  deleteChallan,
  generateChallanPdf,
  downloadChallansExcel,
  downloadChallansPdf,
  getChallansByCompany,
  generateChallanNumber,
  getNextChallanNumber,
};