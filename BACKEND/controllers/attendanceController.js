const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const { log } = require('../middleware/logger');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper to ensure date is start of day UTC for consistent querying
const getStartOfDayUTC = (dateString) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

// Helper to generate PDF report
const generatePDFReport = async (reportData, filters, res) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      
      // Pipe the PDF directly to the response
      doc.pipe(res);

      // PDF content
      doc.fontSize(20).text('Attendance Report', { align: 'center' });
      doc.moveDown();
      
      // Report filters
      doc.fontSize(10).text(`Report Period: ${filters.dateRange || 'N/A'}`);
      if (filters.workerId) {
        doc.text(`Worker Filter: Applied`);
      }
      doc.moveDown();
      
      // Report date
      doc.text(`Generated on: ${new Date().toLocaleString()}`);
      doc.moveDown(2);

      // Check if we have data
      if (!reportData || reportData.length === 0) {
        doc.fontSize(14).text('No attendance data found for the selected criteria.', { align: 'center' });
        doc.end();
        return;
      }

      // Table headers
      doc.font('Helvetica-Bold').fontSize(9);
      const headerY = doc.y;
      doc.text('Worker Name', 50, headerY);
      doc.text('Worker ID', 150, headerY);
      doc.text('Date', 220, headerY);
      doc.text('Day Shift', 280, headerY);
      doc.text('Night Shift', 350, headerY);
      doc.text('Notes', 420, headerY);
      
      // Draw header line
      doc.moveTo(50, headerY + 15).lineTo(550, headerY + 15).stroke();
      
      doc.font('Helvetica').fontSize(8);
      let y = headerY + 25;
      
      // Report data
      reportData.forEach((record, index) => {
        try {
          // Safely access worker data
          const workerName = record.worker?.name || 'Unknown Worker';
          const workerId = record.worker?.workerId || 'N/A';
          const date = record.date ? new Date(record.date).toISOString().split('T')[0] : 'N/A';
          
          // Safely access shift data
          const dayStatus = record.shifts?.day?.status || '-';
          const nightStatus = record.shifts?.night?.status || '-';
          const notes = record.shifts?.day?.notes || record.shifts?.night?.notes || '';

          doc.text(workerName, 50, y);
          doc.text(workerId, 150, y);
          doc.text(date, 220, y);
          doc.text(dayStatus, 280, y);
          doc.text(nightStatus, 350, y);
          doc.text(notes.substring(0, 20) + (notes.length > 20 ? '...' : ''), 420, y);
          
          y += 20;
          
          // Add a new page if we're at the bottom
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
        } catch (recordError) {
          console.error(`Error processing record ${index}:`, recordError);
          // Skip this record and continue
        }
      });

      // Add summary at the end
      doc.moveDown(2);
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total Records: ${reportData.length}`, { align: 'center' });

      doc.end();
      
      doc.on('end', () => {
        resolve();
      });
      
      doc.on('error', (err) => {
        console.error('PDF generation error:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('PDF setup error:', error);
      reject(error);
    }
  });
};

// @desc    Record or update attendance for a single worker on a specific date and shift
// @route   POST /api/attendance
// @access  Private/Admin
const recordAttendance = async (req, res) => {
  const { workerId, date, shift, status, checkInTime, checkOutTime, notes } = req.body;

  if (!workerId || !date || !shift || !status) {
    return res.status(400).json({ message: 'Worker ID, date, shift, and status are required.' });
  }

  if (!['day', 'night'].includes(shift)) {
    return res.status(400).json({ message: 'Shift must be either "day" or "night".' });
  }

  const attendanceDate = getStartOfDayUTC(date);

  try {
    const worker = await Worker.findById(workerId);
    if (!worker) {
      log(`Attendance recording failed: Worker not found - ID: ${workerId}`, 'warn');
      return res.status(404).json({ message: 'Worker not found.' });
    }

    let attendanceRecord = await Attendance.findOne({ worker: workerId, date: attendanceDate });

    if (attendanceRecord) {
      // Update existing record for the specific shift
      attendanceRecord.shifts[shift] = {
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        notes: notes || attendanceRecord.shifts[shift]?.notes || ''
      };
      attendanceRecord.recordedBy = req.user._id;
    } else {
      // Create new record
      attendanceRecord = new Attendance({
        worker: workerId,
        date: attendanceDate,
        shifts: {
          [shift]: {
            status,
            checkInTime: checkInTime ? new Date(checkInTime) : undefined,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
            notes: notes || ''
          }
        },
        recordedBy: req.user._id,
      });
    }

    const savedRecord = await attendanceRecord.save();
    log(`Attendance recorded/updated for worker ${worker.name} on ${attendanceDate.toISOString().split('T')[0]} (${shift} shift)`, 'info');
    res.status(attendanceRecord.isNew ? 201 : 200).json(savedRecord);
  } catch (error) {
    log(`Error recording attendance: ${error.message} - Worker: ${workerId}, Date: ${date}, Shift: ${shift}`, 'error');
    if (error.code === 11000) {
        return res.status(400).json({ message: `Attendance for this worker on this date already exists. You might want to update it.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while recording attendance.' });
  }
};

// @desc    Record bulk attendance (e.g., for multiple workers on a single day)
// @route   POST /api/attendance/bulk
// @access  Private/Admin
const recordBulkAttendance = async (req, res) => {
    const { date, shift, attendanceData } = req.body; // attendanceData: [{ workerId, status, notes, checkInTime, checkOutTime }]

    if (!date || !shift || !Array.isArray(attendanceData) || attendanceData.length === 0) {
        return res.status(400).json({ message: 'Date, shift, and an array of attendance data are required.' });
    }
    
    if (!['day', 'night'].includes(shift)) {
      return res.status(400).json({ message: 'Shift must be either "day" or "night".' });
    }

    const attendanceDate = getStartOfDayUTC(date);
    const operations = [];
    const results = { successful: [], failed: [] };

    for (const record of attendanceData) {
        if (!record.workerId || !record.status) {
            results.failed.push({ workerId: record.workerId, error: 'Missing workerId or status.' });
            continue;
        }

        const shiftUpdate = {
            status: record.status,
            notes: record.notes || '',
            checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
            checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined
        };

        operations.push({
            updateOne: {
                filter: { worker: new mongoose.Types.ObjectId(record.workerId), date: attendanceDate },
                update: {
                    $set: {
                        [`shifts.${shift}`]: shiftUpdate,
                        recordedBy: new mongoose.Types.ObjectId(req.user._id),
                        updatedAt: new Date(),
                    },
                    $setOnInsert: {
                        worker: new mongoose.Types.ObjectId(record.workerId),
                        date: attendanceDate,
                        createdAt: new Date()
                    }
                },
                upsert: true,
            },
        });
    }

    try {
        if (operations.length > 0) {
            const bulkResult = await Attendance.bulkWrite(operations);
            log(`Bulk attendance processed for date ${attendanceDate.toISOString().split('T')[0]} (${shift} shift). Upserted: ${bulkResult.upsertedCount}, Modified: ${bulkResult.modifiedCount}`, 'info');
            res.status(200).json({ 
                message: 'Bulk attendance processed.', 
                upsertedCount: bulkResult.upsertedCount,
                modifiedCount: bulkResult.modifiedCount,
            });
        } else {
            res.status(200).json({ message: 'No valid attendance data to process.', failedItems: results.failed });
        }
    } catch (error) {
        log(`Error in bulk attendance for date ${attendanceDate.toISOString().split('T')[0]}: ${error.message}`, 'error');
        res.status(500).json({ message: 'Server error during bulk attendance processing.' });
    }
};


// @desc    Get attendance records with date range filters
// @route   GET /api/attendance
// @access  Private/Admin
const getAttendanceRecords = async (req, res) => {
  const { workerId, startDate, endDate, format } = req.query;
  const query = {};

  if (workerId) query.worker = workerId;

  // Default to last 30 days if no dates provided
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 30);

  // Set date range
  query.date = { 
    $gte: startDate ? getStartOfDayUTC(startDate) : getStartOfDayUTC(defaultStartDate),
    $lte: endDate ? getStartOfDayUTC(endDate) : getStartOfDayUTC(defaultEndDate)
  };

  try {
    const records = await Attendance.find(query)
      .populate('worker', 'name workerId department')
      .populate('recordedBy', 'username')
      .sort({ date: 1, 'worker.name': 1 });

    log(`Fetched attendance records`, 'info');

    // Return PDF if requested
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${startDate || defaultStartDate.toISOString().split('T')[0]}-to-${endDate || defaultEndDate.toISOString().split('T')[0]}.pdf`);
      
      try {
        const filters = {
          workerId,
          dateRange: `${startDate || defaultStartDate.toISOString().split('T')[0]} to ${endDate || defaultEndDate.toISOString().split('T')[0]}`
        };

        log(`Generating PDF for ${records.length} records`, 'info');

        // Transform records to match PDF generator expectations
        const pdfData = records.map(record => ({
          worker: {
            name: record.worker?.name || 'Unknown Worker',
            workerId: record.worker?.workerId || 'N/A'
          },
          date: record.date,
          shifts: {
            day: {
              status: record.shifts?.day?.status || null,
              notes: record.shifts?.day?.notes || ''
            },
            night: {
              status: record.shifts?.night?.status || null,
              notes: record.shifts?.night?.notes || ''
            }
          }
        }));

        await generatePDFReport(pdfData, filters, res);
        log(`PDF report generated successfully for attendance records`, 'info');
      } catch (pdfError) {
        log(`Error generating PDF report: ${pdfError.message} - Stack: ${pdfError.stack}`, 'error');
        // Clear any headers that might have been set and send error response
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error generating PDF report: ' + pdfError.message });
        }
      }
    } else {
      res.json(records);
    }
  } catch (error) {
    log(`Error fetching attendance records: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching attendance records.' });
  }
};

// @desc    Generate a detailed attendance report with shift information
// @route   GET /api/attendance/report
// @access  Private/Admin
const getAttendanceReport = async (req, res) => {
  const { month, year, workerId, department, shift, format } = req.query;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required for the report.' });
  }

  const startDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
  const endDate = new Date(Date.UTC(year, parseInt(month), 0, 23, 59, 59, 999));

  const matchQuery = {
    date: { $gte: startDate, $lte: endDate },
  };

  if (workerId) {
    matchQuery.worker = new mongoose.Types.ObjectId(workerId);
  }

  if (shift && ['day', 'night'].includes(shift)) {
    matchQuery[`shifts.${shift}.status`] = { $exists: true, $ne: null };
  }

  try {
    // Build worker query for department filter
    const workerQuery = { isActive: true };
    if (department) workerQuery.department = department;
    if (workerId) workerQuery._id = new mongoose.Types.ObjectId(workerId);

    const workersForReport = await Worker.find(workerQuery)
      .select('name workerId department shiftPreference')
      .lean();

    if (workersForReport.length === 0) {
      return res.json({ month, year, report: [], message: "No workers found for this report." });
    }
    
    const attendanceData = await Attendance.aggregate([
      { $match: matchQuery },
      { $lookup: {
          from: 'workers',
          localField: 'worker',
          foreignField: '_id',
          as: 'worker'
        }
      },
      { $unwind: '$worker' },
      { $match: workerId ? { 'worker._id': new mongoose.Types.ObjectId(workerId) } : {} }
    ]);

    // Structure the report
    const report = workersForReport.map(worker => {
      const workerAttendances = attendanceData.filter(att => att.worker._id.toString() === worker._id.toString());
      
      const dailyStatus = {};
      const summary = {
        day: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0, Other: 0 },
        night: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0, Other: 0 },
        bothShifts: 0
      };

      workerAttendances.forEach(att => {
        const dateStr = new Date(att.date).toISOString().split('T')[0];
        dailyStatus[dateStr] = {
          day: att.shifts.day?.status || null,
          night: att.shifts.night?.status || null
        };

        // Count day shift statuses
        if (att.shifts.day?.status) {
          if (summary.day[att.shifts.day.status] !== undefined) {
            summary.day[att.shifts.day.status]++;
          } else {
            summary.day.Other++;
          }
        }

        // Count night shift statuses
        if (att.shifts.night?.status) {
          if (summary.night[att.shifts.night.status] !== undefined) {
            summary.night[att.shifts.night.status]++;
          } else {
            summary.night.Other++;
          }
        }

        // Count days with both shifts
        if (att.shifts.day?.status && att.shifts.night?.status) {
          summary.bothShifts++;
        }
      });

      return {
        worker: {
          _id: worker._id,
          name: worker.name,
          workerId: worker.workerId,
          department: worker.department,
          shiftPreference: worker.shiftPreference
        },
        dailyStatus,
        summary
      };
    });

    // Return PDF if requested
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${month}-${year}.pdf`);
      try {
        const filters = {
          month: `${month}/${year}`,
          worker: workerId ? 'Specific worker' : 'All workers',
          department: department || 'All departments',
          shift: shift || 'All shifts',
          dateRange: `${month}/${year}`
        };

        // Flatten the report data for PDF generation
        const pdfData = report.flatMap(workerReport => {
          return Object.entries(workerReport.dailyStatus).map(([date, status]) => ({
            worker: {
              name: workerReport.worker?.name || 'Unknown Worker',
              workerId: workerReport.worker?.workerId || 'N/A'
            },
            date: new Date(date),
            shifts: {
              day: {
                status: status?.day || null,
                notes: ''
              },
              night: {
                status: status?.night || null,
                notes: ''
              }
            }
          }));
        });

        await generatePDFReport(pdfData, filters, res);
        log(`PDF report generated for monthly attendance`, 'info');
      } catch (pdfError) {
        log(`Error generating PDF report: ${pdfError.message}`, 'error');
        // Clear any headers that might have been set
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error generating PDF report.' });
        }
      }
    } else {
      res.json({ month, year, report });
    }
  } catch (error) {
    log(`Error generating attendance report for ${month}/${year}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while generating report.' });
  }
};

// @desc    Update an existing attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin
const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { shift, status, checkInTime, checkOutTime, notes } = req.body;

  if (!shift || !status) {
    return res.status(400).json({ message: 'Shift and status are required.' });
  }

  if (!['day', 'night'].includes(shift)) {
    return res.status(400).json({ message: 'Shift must be either "day" or "night".' });
  }

  try {
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    // Update the specific shift
    attendance.shifts[shift] = {
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : attendance.shifts[shift]?.checkInTime,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : attendance.shifts[shift]?.checkOutTime,
      notes: notes || attendance.shifts[shift]?.notes || ''
    };
    attendance.recordedBy = req.user._id;
    attendance.updatedAt = new Date();

    const updatedAttendance = await attendance.save();
    log(`Attendance updated for record ${id} (${shift} shift)`, 'info');
    res.json(updatedAttendance);
  } catch (error) {
    log(`Error updating attendance record ${id}: ${error.message}`, 'error');
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating attendance record.' });
  }
};

module.exports = {
  recordAttendance,
  recordBulkAttendance,
  getAttendanceRecords,
  getAttendanceReport,
  updateAttendance
};