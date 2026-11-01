const Box = require('../models/Box');
const Counter = require('../models/Counter');
const Settings = require('../models/Settings');
const { log } = require('../middleware/logger');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

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

const getNextBoxNumber = async (req, res) => {
  try {
    const { financialYear, descriptionOfGoods } = req.query;
    if (!financialYear || !descriptionOfGoods) {
      return res.status(400).json({ message: 'financialYear and descriptionOfGoods are required' });
    }
    const fy = financialYear;
    const trimmedDesc = descriptionOfGoods.trim();
    const counterId = `${trimmedDesc}_${fy}`;
    const counter = await Counter.findOne({ _id: counterId });
    const nextNum = counter ? counter.sequenceValue + 1 : 1;
    const boxNumber = `${fy}/${String(nextNum).padStart(3, '0')}`;
    res.json({ boxNumber, financialYear: fy, displayNumber: nextNum });
  } catch (error) {
    log(`Error generating next box number: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error generating box number' });
  }
};

const getNextSequence = async (description, financialYear) => {
  const counterId = `${description.trim()}_${financialYear}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: { sequenceValue: 0, description: description.trim(), financialYear } }
  );
  return counter.sequenceValue;
};

const getFinancialYearRange = (fy) => {
  if (!fy || typeof fy !== 'string') return null;
  const parts = fy.split('-');
  if (parts.length !== 2) return null;
  const startYear = parseInt(parts[0], 10);
  if (isNaN(startYear)) return null;
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const buildQueryFilters = async (filters) => {
  const { descriptionOfGoods, isUsed, search, startDate, endDate, fy } = filters;
  const query = {};

  if (descriptionOfGoods && descriptionOfGoods !== 'All Descriptions') {
    const settings = await Settings.getSettings();
    const validDescription = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
    if (!validDescription) {
      throw new Error('Invalid description of goods.');
    }
    query.descriptionOfGoods = descriptionOfGoods;
  }

  if (isUsed !== undefined && isUsed !== '') {
    if (isUsed !== 'true' && isUsed !== 'false') {
      throw new Error('Invalid isUsed value. Must be "true" or "false".');
    }
    query.isUsed = isUsed === 'true';
  }

  if (search && search.trim()) {
    query.boxNumber = { $regex: search.trim(), $options: 'i' };
  }

  if (fy) {
    const range = getFinancialYearRange(fy);
    if (range) {
      query.createdAt = { $gte: range.start, $lte: range.end };
    }
  } else if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  return query;
};

const fetchFilteredBoxes = async (filters, includeUserInfo = false) => {
  const { startBox, endBox } = filters;
  const query = await buildQueryFilters(filters);

  let boxes;
  
  if (startBox || endBox) {
    const aggregationPipeline = [];

    if (Object.keys(query).length > 0) {
      aggregationPipeline.push({ $match: query });
    }

    aggregationPipeline.push({
      $addFields: {
        numericBoxNumber: { $toInt: "$boxNumber" }
      }
    });

    const rangeFilter = {};
    if (startBox) {
      rangeFilter.numericBoxNumber = { $gte: parseInt(startBox) };
    }
    if (endBox) {
      if (rangeFilter.numericBoxNumber) {
        rangeFilter.numericBoxNumber.$lte = parseInt(endBox);
      } else {
        rangeFilter.numericBoxNumber = { $lte: parseInt(endBox) };
      }
    }
    
    if (Object.keys(rangeFilter).length > 0) {
      aggregationPipeline.push({ $match: rangeFilter });
    }

    aggregationPipeline.push({ $sort: { createdAt: -1 } });

    if (includeUserInfo) {
      aggregationPipeline.push({
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          pipeline: [
            { $project: { username: 1, email: 1, _id: 0 } }
          ],
          as: 'createdBy'
        }
      });
      aggregationPipeline.push({ $unwind: '$createdBy' });
    }

    aggregationPipeline.push({ $project: { numericBoxNumber: 0 } });

    boxes = await Box.aggregate(aggregationPipeline);
  } else {
    let boxQuery = Box.find(query);
    if (includeUserInfo) {
      boxQuery = boxQuery.populate('createdBy', 'username email');
    }
    boxes = await boxQuery.sort({ createdAt: -1 });
  }

  return boxes;
};

const createBox = async (req, res) => {
  const { boxNumber, descriptionOfGoods, grossWeight, tareWeight, netWeight, cops, copsWeight, boxDate, financialYear } = req.body;

  if (!boxNumber || !descriptionOfGoods || grossWeight === undefined || tareWeight === undefined || netWeight === undefined || cops === undefined) {
    return res.status(400).json({ message: 'Missing required fields: boxNumber, descriptionOfGoods, grossWeight, tareWeight, netWeight, cops.' });
  }

  try {
    const settings = await Settings.getSettings();
    const validDescription = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
    if (!validDescription) {
      return res.status(400).json({ message: 'Description of Goods must be from predefined settings.' });
    }

    const resolvedFY = financialYear || getFinancialYear(boxDate ? new Date(boxDate) : new Date());
    const trimmedDesc = descriptionOfGoods.trim();

    const displayNumber = await getNextSequence(trimmedDesc, resolvedFY);
    const finalBoxNumber = `${resolvedFY}/${String(displayNumber).padStart(3, '0')}`;

    const newBox = new Box({
      boxNumber: finalBoxNumber,
      displayNumber,
      descriptionOfGoods: trimmedDesc,
      grossWeight,
      tareWeight,
      netWeight,
      cops,
      copsWeight: copsWeight ?? 0,
      createdBy: req.user._id,
      financialYear: resolvedFY,
      createdAt: boxDate ? new Date(boxDate) : new Date(),
    });

    const savedBox = await newBox.save();
    log(`Box created successfully: ${savedBox.boxNumber}`, 'info');
    res.status(201).json(savedBox);
  } catch (error) {
    log(`Error creating box: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: `Box number '${boxNumber}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating box.' });
  }
};

const getBoxes = async (req, res) => {
  const { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy } = req.query;

  try {
    const filters = { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy };
    const boxes = await fetchFilteredBoxes(filters, true);

    log(`Fetched ${boxes.length} boxes with filters ${JSON.stringify(filters)}`, 'info');
    res.json(boxes);
  } catch (error) {
    log(`Error fetching boxes: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.message === 'Invalid description of goods.' || error.message === 'Invalid isUsed value. Must be "true" or "false".') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while fetching boxes.' });
  }
};

const generateBoxesPDF = async (req, res) => {
  const { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy, boxNumbers } = req.body;

  try {
    let boxes;
    if (boxNumbers && String(boxNumbers).trim()) {
      const boxNumberArray = String(boxNumbers).split(',').map(num => num.trim());
      boxes = await Box.find({ boxNumber: { $in: boxNumberArray } }).sort({ boxNumber: 1 });
    } else {
      const filters = { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy };
      boxes = await fetchFilteredBoxes(filters, false);
    }

    const totalNetWeight = boxes.reduce((sum, box) => sum + (box.netWeight || 0), 0);

    generatePDFResponse(res, boxes, totalNetWeight, { boxNumbers, descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy });
    
    log(`PDF generated with ${boxes.length} boxes and total net weight ${totalNetWeight.toFixed(2)}`, 'info');
  } catch (error) {
    log(`Error generating PDF: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.message === 'Invalid description of goods.' || error.message === 'Invalid isUsed value. Must be "true" or "false".') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while generating PDF.' });
  }
};

const generatePDFResponse = (res, boxes, totalNetWeight, filters) => {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=boxes-report.pdf');
  
  doc.pipe(res);
  
  doc.fontSize(20).font('Helvetica-Bold').text('Box Inventory Report', { align: 'center' });
  doc.moveDown();
  
  if (filters.boxNumbers) {
    doc.fontSize(12).font('Helvetica').text(`Selected Boxes: ${String(filters.boxNumbers).split(',').length} boxes`, { align: 'center' });
  } else if (filters.descriptionOfGoods || filters.isUsed || filters.search || filters.startBox || filters.endBox || filters.fy) {
    doc.fontSize(10).font('Helvetica').text('Filters Applied:', { underline: true });
    if (filters.descriptionOfGoods) doc.text(`Description: ${filters.descriptionOfGoods}`);
    if (filters.isUsed !== '') doc.text(`Status: ${filters.isUsed === 'true' ? 'Used' : 'Available'}`);
    if (filters.search) doc.text(`Search: ${filters.search}`);
    if (filters.startBox || filters.endBox) doc.text(`Box Range: ${filters.startBox || 'Start'} to ${filters.endBox || 'End'}`);
    if (filters.fy) doc.text(`Financial Year: ${filters.fy}`);
  }
  
  doc.moveDown();
  
  doc.fontSize(12).font('Helvetica-Bold').text(`Total Boxes: ${boxes.length}`);
  doc.fontSize(12).text(`Total Net Weight: ${totalNetWeight.toFixed(2)} kg`);
  doc.moveDown(2);
  
  const tableTop = doc.y;
  const col1X = 50;
  const col2X = 120;
  const col3X = 250;
  const col4X = 340;
  const col5X = 420;
  const col6X = 500;
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Box #', col1X, tableTop);
  doc.text('Description', col2X, tableTop);
  doc.text('Net Weight', col3X, tableTop);
  doc.text('Cops', col4X, tableTop);
  doc.text('Cops Wt', col5X, tableTop);
  doc.text('Status', col6X, tableTop);
  
  doc.moveTo(col1X, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(9);
  
  boxes.forEach((box, index) => {
    if (y > 750) {
      doc.addPage();
      y = 50;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Box #', col1X, y);
      doc.text('Description', col2X, y);
      doc.text('Net Weight', col3X, y);
      doc.text('Cops', col4X, y);
      doc.text('Cops Wt', col5X, y);
      doc.text('Status', col6X, y);
      doc.moveTo(col1X, y + 15).lineTo(550, y + 15).stroke();
      y += 25;
      doc.font('Helvetica').fontSize(9);
    }
    
    doc.text(box.boxNumber || 'N/A', col1X, y);
    doc.text((box.descriptionOfGoods || 'N/A').substring(0, 20), col2X, y);
    doc.text(`${box.netWeight?.toFixed ? box.netWeight.toFixed(2) : box.netWeight} kg`, col3X, y);
    doc.text(box.cops?.toString() || 'N/A', col4X, y);
    doc.text(`${(box.copsWeight ?? 0).toFixed ? box.copsWeight.toFixed(2) : (box.copsWeight ?? 0)} kg`, col5X, y);
    doc.text(box.isUsed ? 'Used' : 'Available', col6X, y);
    
    y += 20;
    if (index < boxes.length - 1) {
      doc.moveTo(col1X, y - 5).lineTo(550, y - 5).stroke();
    }
  });
  
  doc.end();
};

const getAvailableBoxes = async (req, res) => {
  try {
    let { descriptionOfGoods } = req.query;
    
    if (!descriptionOfGoods) {
      return res.status(400).json({ message: 'descriptionOfGoods query parameter is required', code: 'MISSING_DESCRIPTION' });
    }

    descriptionOfGoods = decodeURIComponent(descriptionOfGoods).replace(/\+/g, ' ').trim();

    const settings = await Settings.getSettings();
    const validDescription = settings.itemConfigurations.find(item => item.description === descriptionOfGoods);
    if (!validDescription) {
      return res.status(400).json({ message: 'Invalid description of goods', code: 'INVALID_DESCRIPTION', availableDescriptions: settings.itemConfigurations.map(item => item.description), receivedDescription: descriptionOfGoods });
    }

    const boxes = await Box.find({ descriptionOfGoods, isUsed: false }).sort({ boxNumber: 1 });
    res.json(boxes);
  } catch (error) {
    console.error('Error fetching available boxes:', error);
    res.status(500).json({ message: 'Server error while fetching available boxes.', code: 'SERVER_ERROR', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const getBoxById = async (req, res) => {
  const boxId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(boxId)) {
    return res.status(400).json({ message: 'Invalid box ID format.' });
  }

  try {
    const box = await Box.findById(boxId).populate('createdBy', 'username email');

    if (!box) {
      return res.status(404).json({ message: 'Box not found' });
    }

    res.json(box);
  } catch (error) {
    log(`Error fetching box ID ${boxId}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching box.' });
  }
};

const updateBox = async (req, res) => {
  const boxId = req.params.id;
  const { boxNumber, descriptionOfGoods, grossWeight, tareWeight, cops, copsWeight } = req.body;

  try {
    const box = await Box.findById(boxId);
    if (!box) {
      log(`Box update failed: Not found with ID: ${boxId}`, 'warn');
      return res.status(404).json({ message: 'Box not found' });
    }

    if (box.isUsed) {
      return res.status(400).json({ message: 'Cannot modify a box that is already used in a challan.' });
    }

    if (boxNumber && boxNumber !== box.boxNumber) {
      const existingBox = await Box.findOne({ boxNumber });
      if (existingBox && existingBox._id.toString() !== boxId) {
        return res.status(400).json({ message: `Box number '${boxNumber}' already exists.` });
      }
      box.boxNumber = boxNumber;
    }

    if (descriptionOfGoods) {
      const settings = await Settings.getSettings();
      const validDescription = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
      if (!validDescription) {
        return res.status(400).json({ message: 'Description of Goods must be from predefined settings.' });
      }
      box.descriptionOfGoods = descriptionOfGoods;
    }

    if (grossWeight !== undefined) box.grossWeight = grossWeight;
    if (tareWeight !== undefined) box.tareWeight = tareWeight;
    if (cops !== undefined) box.cops = cops;
    if (copsWeight !== undefined) box.copsWeight = copsWeight;

    const updatedBox = await box.save();
    log(`Box updated: ${updatedBox.boxNumber}`, 'info');
    res.json(updatedBox);
  } catch (error) {
    log(`Error updating box ID ${boxId}: ${error.message} - Stack: ${error.stack}`, 'error');
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: `Box number '${boxNumber}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating box.' });
  }
};

const deleteBox = async (req, res) => {
  try {
    const box = await Box.findById(req.params.id);
    if (!box) {
      log(`Box deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Box not found' });
    }

    if (box.isUsed) {
      return res.status(400).json({ message: 'Cannot delete box; it is used in a challan.' });
    }

    await box.deleteOne();
    log(`Box deleted: ${box.boxNumber}`, 'info');
    res.json({ message: 'Box removed successfully.' });
  } catch (error) {
    log(`Error deleting box ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting box.' });
  }
};

const generateBoxesExcel = async (req, res) => {
  const { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy, boxNumbers } = req.body;

  try {
    let boxes;
    if (boxNumbers && String(boxNumbers).trim()) {
      const boxNumberArray = String(boxNumbers).split(',').map(num => num.trim());
      boxes = await Box.find({ boxNumber: { $in: boxNumberArray } }).sort({ boxNumber: 1 });
    } else {
      const filters = { descriptionOfGoods, isUsed, search, startBox, endBox, startDate, endDate, fy };
      boxes = await fetchFilteredBoxes(filters, false);
    }

    if (!boxes || boxes.length === 0) {
      return res.status(404).json({ message: 'No boxes found matching the criteria' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Boxes');

    worksheet.columns = [
      { header: 'Box No.', key: 'boxNumber', width: 12 },
      { header: 'Description', key: 'descriptionOfGoods', width: 30 },
      { header: 'Gross Wt (kg)', key: 'grossWeight', width: 14 },
      { header: 'Tare Wt (kg)', key: 'tareWeight', width: 14 },
      { header: 'Net Wt (kg)', key: 'netWeight', width: 14 },
      { header: 'Cops', key: 'cops', width: 10 },
      { header: 'Cops Wt (kg)', key: 'copsWeight', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date', key: 'createdAt', width: 14 },
    ];

    boxes.forEach((box) => {
      worksheet.addRow({
        boxNumber: box.boxNumber,
        descriptionOfGoods: box.descriptionOfGoods,
        grossWeight: (box.grossWeight ?? 0).toFixed ? (box.grossWeight).toFixed(2) : box.grossWeight,
        tareWeight: (box.tareWeight ?? 0).toFixed ? (box.tareWeight).toFixed(2) : box.tareWeight,
        netWeight: (box.netWeight ?? 0).toFixed ? (box.netWeight).toFixed(2) : box.netWeight,
        cops: box.cops,
        copsWeight: (box.copsWeight ?? 0).toFixed ? (box.copsWeight).toFixed(2) : (box.copsWeight ?? 0),
        status: box.isUsed ? 'Used' : 'Available',
        createdAt: box.createdAt ? new Date(box.createdAt).toLocaleDateString('en-IN') : ''
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=boxes-report-${timestamp}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    log(`Error generating Excel: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while generating Excel.' });
  }
};

const getMonthlyNetWeights = async (req, res) => {
  try {
    const { fy, descriptionOfGoods } = req.query;

    const match = {};

    if (fy) {
      const range = getFinancialYearRange(fy);
      if (range) {
        match.createdAt = { $gte: range.start, $lte: range.end };
      }
    }

    if (descriptionOfGoods && descriptionOfGoods !== 'All Descriptions') {
      const settings = await Settings.getSettings();
      const valid = settings.itemConfigurations.some(item => item.description === descriptionOfGoods);
      if (!valid) {
        return res.status(400).json({ message: 'Invalid description of goods.' });
      }
      match.descriptionOfGoods = descriptionOfGoods;
    }

    const agg = [
      { $match: match },
      { $group: { _id: { month: { $month: '$createdAt' } }, totalNet: { $sum: '$netWeight' } } },
      { $sort: { '_id.month': 1 } }
    ];

    const result = await Box.aggregate(agg);

    const data = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, totalNet: 0 }));
    result.forEach(row => {
      const m = row._id.month;
      data[m - 1].totalNet = parseFloat((row.totalNet || 0).toFixed(2));
    });

    res.json({ fy: fy || null, descriptionOfGoods: descriptionOfGoods || 'ALL', data });
  } catch (error) {
    log(`Error fetching monthly net weights: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching monthly net weights.' });
  }
};

const updateCounter = async (req, res) => {
  try {
    const { financialYear, descriptionOfGoods, counterValue } = req.body;

    if (!financialYear || !descriptionOfGoods || counterValue === undefined) {
      return res.status(400).json({ message: 'financialYear, descriptionOfGoods, and counterValue are required' });
    }

    const trimmedDesc = descriptionOfGoods.trim();
    const counterId = `${trimmedDesc}_${financialYear}`;

    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $set: { sequenceValue: counterValue, description: trimmedDesc, financialYear } },
      { new: true, upsert: true, setDefaultsOnInsert: { sequenceValue: counterValue, description: trimmedDesc, financialYear } }
    );

    const nextBoxNumber = `${financialYear}/${String(counter.sequenceValue + 1).padStart(3, '0')}`;

    log(`Counter updated for ${counterId} to ${counterValue}. Next box number: ${nextBoxNumber}`, 'info');
    res.json({ message: 'Counter updated successfully', counter: counter.sequenceValue, nextBoxNumber });
  } catch (error) {
    log(`Error updating counter: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error updating counter' });
  }
};

const getCounter = async (req, res) => {
  try {
    const { financialYear, descriptionOfGoods } = req.query;

    if (!financialYear || !descriptionOfGoods) {
      return res.status(400).json({ message: 'financialYear and descriptionOfGoods are required' });
    }

    const trimmedDesc = descriptionOfGoods.trim();
    const counterId = `${trimmedDesc}_${financialYear}`;
    const counter = await Counter.findOne({ _id: counterId });

    if (!counter) {
      return res.json({ counter: null, message: 'No counter found for this financial year and description' });
    }

    res.json({ counter: counter.sequenceValue, description: counter.description, financialYear: counter.financialYear });
  } catch (error) {
    log(`Error fetching counter: ${error.message}`, 'error');
    res.status(500).json({ message: 'Error fetching counter' });
  }
};

module.exports = {
  createBox,
  getBoxes,
  getBoxById,
  updateBox,
  deleteBox,
  getAvailableBoxes,
  generateBoxesPDF,
  generateBoxesExcel,
  getMonthlyNetWeights,
  getNextBoxNumber,
  updateCounter,
  getCounter,
};
