const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const { log } = require('../middleware/logger');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getOrgDetails } = require('../utils/orgDetails');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 30;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Helper to ensure date is start of day UTC for consistent querying
const getStartOfDayUTC = (dateString) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const statusColors = {
  Present: { bg: '#d1fae5', text: '#065f46', label: 'P' },
  Absent: { bg: '#fee2e2', text: '#991b1b', label: 'A' },
  'Half Day': { bg: '#fef3c7', text: '#92400e', label: 'H' },
  Leave: { bg: '#dbeafe', text: '#1e40af', label: 'L' },
};
const STATUS_ORDER = ['Present', 'Absent', 'Half Day', 'Leave'];

// Group dates into weeks (Mon-Sun based)
const groupDatesIntoWeeks = (dates) => {
  if (!dates.length) return [];
  const sorted = [...dates].sort();
  const first = new Date(sorted[0] + 'T00:00:00');
  const firstDow = first.getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const weeks = [];
  let week = [];
  for (let i = 0; i < offset; i++) week.push(null);
  sorted.forEach(ds => {
    const d = new Date(ds + 'T00:00:00');
    const dow = d.getDay();
    const monDow = dow === 0 ? 6 : dow - 1;
    if (monDow === 0 && week.length > 0 && week.length < 7) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
      week = [];
    }
    week.push(ds);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
};

// Helper to generate PDF report
const generatePDFReport = async (reportData, filters, res, orgId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const org = await getOrgDetails(orgId);
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

      const pageBottom = PAGE_HEIGHT - 40;
      let yPos = 0;

      const drawHeader = () => {
        doc.rect(0, 0, PAGE_WIDTH, 95).fill('#1e3a5f');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
          .text(org.name, MARGIN, 15, { width: CONTENT_WIDTH, align: 'center' });
        doc.font('Helvetica').fontSize(9)
          .text(org.address, MARGIN, 40, { width: CONTENT_WIDTH, align: 'center' });
        let contactLine = '';
        if (org.gstin) contactLine += `GSTIN: ${org.gstin}`;
        if (org.phone) contactLine += `  |  ${org.phone}`;
        if (org.email) contactLine += `  |  ${org.email}`;
        if (contactLine) doc.fontSize(8).text(contactLine, MARGIN, 55, { width: CONTENT_WIDTH, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(14)
          .text('ATTENDANCE REPORT', MARGIN, 72, { width: CONTENT_WIDTH, align: 'center' });
        doc.fillColor('#1e3a5f').rect(MARGIN, 97, CONTENT_WIDTH, 1.5).fill();
      };

      const checkPage = (needed) => {
        if (yPos + needed > pageBottom) {
          doc.addPage();
          drawHeader();
          yPos = 110;
        }
      };

      doc.pipe(res);
      drawHeader();
      yPos = 110;

      // Report info line
      doc.fillColor('#475569').font('Helvetica').fontSize(9)
        .text(`Period: ${filters.dateRange || 'N/A'}  |  Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, MARGIN, yPos, { width: CONTENT_WIDTH, align: 'center' });
      yPos += 18;

      if (!reportData || reportData.length === 0) {
        doc.fillColor('#991b1b').fontSize(14).text('No attendance data found for the selected criteria.', { align: 'center' });
        doc.end();
        return;
      }

      // Legend
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151');
      let legendX = MARGIN;
      doc.text('Legend:', legendX, yPos);
      legendX += 38;
      Object.entries(statusColors).forEach(([status, c]) => {
        doc.roundedRect(legendX, yPos, 12, 9, 2).fill(c.bg);
        doc.fillColor(c.text).font('Helvetica-Bold').fontSize(7).text(c.label, legendX + 3, yPos + 1);
        legendX += 14;
        doc.fillColor('#374151').font('Helvetica').fontSize(7).text(status, legendX, yPos + 1);
        legendX += doc.widthOfString(status) + 10;
      });
      yPos += 14;

      // Group data
      const workerMap = {};
      reportData.forEach(record => {
        const wid = record.worker?.workerId || 'unknown';
        if (!workerMap[wid]) {
          workerMap[wid] = { worker: record.worker, records: [] };
        }
        workerMap[wid].records.push(record);
      });
      const workerEntries = Object.values(workerMap).sort((a, b) => {
        const idA = parseInt(a.worker?.workerId?.replace(/\D/g, '') || '0', 10);
        const idB = parseInt(b.worker?.workerId?.replace(/\D/g, '') || '0', 10);
        return idA - idB;
      });

      const allDates = [...new Set(reportData.map(r => {
        const d = new Date(r.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }))].sort();

      // Group dates by month
      const groupDatesByMonth = (dates) => {
        const months = {};
        dates.forEach(ds => {
          const key = ds.substring(0, 7);
          if (!months[key]) months[key] = [];
          months[key].push(ds);
        });
        const names = { '01':'January','02':'February','03':'March','04':'April','05':'May','06':'June','07':'July','08':'August','09':'September','10':'October','11':'November','12':'December' };
        return Object.entries(months).sort().map(([key, monthDates]) => {
          const [y, m] = key.split('-');
          return { label: `${names[m] || m} ${y}`, dates: monthDates };
        });
      };

      const monthGroups = groupDatesByMonth(allDates);

      const cellW = 26;
      const cellH = 28;
      const labelColW = 65;
      const gridW = 7 * cellW;
      const tableX = MARGIN;
      const labelX = tableX;
      const gridX = tableX + labelColW;

      // ============================================================
      // CALENDAR GRID - One section per worker, grouped by month
      // ============================================================
      workerEntries.forEach(({ worker, records }) => {
        const headerH = 12;
        const monthHeaderH = 14;

        // Only check space for the worker name bar + at least one month header
        // (per-month and per-week checkPage calls below handle the rest)
        checkPage(18 + 14 + 12 + cellH); // worker bar + monthHeader + dowHeader + 1 week row

        // Worker name
        doc.fillColor('#1e3a5f').rect(tableX, yPos, labelColW + gridW, 14).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text(`${worker?.name || 'Unknown'} (${worker?.workerId || 'N/A'})`, tableX + 4, yPos + 2);
        yPos += 18;

        // Render each month group
        monthGroups.forEach(mg => {
          const mWeeks = groupDatesIntoWeeks(mg.dates);
          checkPage(monthHeaderH + headerH + mWeeks.length * cellH + 10);

          // Month header
          doc.fillColor('#334155').rect(tableX, yPos, labelColW + gridW, monthHeaderH).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
            .text(mg.label, tableX + 4, yPos + 3);
          yPos += monthHeaderH;

          // Day-of-week header row
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((dow, di) => {
            const cx = gridX + di * cellW;
            doc.fillColor('#f1f5f9').rect(cx, yPos, cellW, headerH).fill();
            doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6)
              .text(dow, cx + 1, yPos + 3, { width: cellW - 2, align: 'center' });
          });
          yPos += headerH;

          // Week rows for this month
          mWeeks.forEach(week => {
            checkPage(cellH + 2);
            week.forEach((dateStr, di) => {
              const cx = gridX + di * cellW;
              doc.rect(cx, yPos, cellW, cellH).stroke('#e2e8f0');

              if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                const dayNum = d.getDate();
                const record = records.find(r => {
                  const rd = new Date(r.date);
                  const rds = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`;
                  return rds === dateStr;
                });
                const ds = record?.shifts?.day?.status;
                const ns = record?.shifts?.night?.status;
                const dc = statusColors[ds];
                const nc = statusColors[ns];

                if (ds && dc) {
                  doc.rect(cx + 1, yPos + 1, cellW - 2, (cellH - 2) / 2 - 0.5).fill(dc.bg);
                }
                if (ns && nc) {
                  const midY = yPos + (cellH - 2) / 2 + 0.5;
                  doc.rect(cx + 1, midY, cellW - 2, (cellH - 2) / 2 - 0.5).fill(nc.bg);
                }

                doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7)
                  .text(String(dayNum), cx + 2, yPos + 2);

                if (ds) {
                  doc.fillColor(dc.text).font('Helvetica-Bold').fontSize(6)
                    .text(`D:${dc.label}`, cx + cellW / 2, yPos + 4, { width: cellW / 2 - 2, align: 'right' });
                }
                if (ns) {
                  doc.fillColor(nc.text).font('Helvetica-Bold').fontSize(6)
                    .text(`N:${nc.label}`, cx + cellW / 2, yPos + cellH / 2 + 3, { width: cellW / 2 - 2, align: 'right' });
                }
                if (!ds && !ns) {
                  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(7)
                    .text('—', cx + cellW / 2 - 3, yPos + cellH / 2 - 4);
                }
              }
            });
            yPos += cellH;
          });

          yPos += 4;
        });
      });

      // ============================================================
      // SUMMARY
      // ============================================================
      const totals = { day: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 }, night: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 } };
      reportData.forEach(record => {
        ['day', 'night'].forEach(shift => {
          const s = record.shifts?.[shift]?.status;
          if (s && totals[shift][s] !== undefined) totals[shift][s]++;
        });
      });

      const summaryH = 120 + 20; // summary content + footer
      checkPage(summaryH);

      yPos += 6;
      doc.fillColor('#1e3a5f').rect(MARGIN, yPos, CONTENT_WIDTH, 16).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text('SUMMARY', MARGIN + 10, yPos + 3);
      yPos += 18;

      // Day shift summary boxes
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8)
        .text('Day Shift', MARGIN, yPos);
      yPos += 10;

      const boxW = (CONTENT_WIDTH - 18) / 4;
      STATUS_ORDER.forEach((label, i) => {
        const val = totals.day[label];
        const c = statusColors[label];
        const x = MARGIN + i * (boxW + 6);
        doc.roundedRect(x, yPos, boxW, 22, 3).fill(c.bg);
        doc.fillColor(c.text).font('Helvetica-Bold').fontSize(11)
          .text(String(val), x + 6, yPos + 2);
        doc.font('Helvetica').fontSize(6).fillColor('#475569')
          .text(label, x + 6, yPos + 14);
      });
      yPos += 26;

      // Night shift summary boxes
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8)
        .text('Night Shift', MARGIN, yPos);
      yPos += 10;

      STATUS_ORDER.forEach((label, i) => {
        const val = totals.night[label];
        const c = statusColors[label];
        const x = MARGIN + i * (boxW + 6);
        doc.roundedRect(x, yPos, boxW, 22, 3).fill(c.bg);
        doc.fillColor(c.text).font('Helvetica-Bold').fontSize(11)
          .text(String(val), x + 6, yPos + 2);
        doc.font('Helvetica').fontSize(6).fillColor('#475569')
          .text(label, x + 6, yPos + 14);
      });
      yPos += 28;

      // Grand total
      const grandTotal = STATUS_ORDER.reduce((sum, s) => sum + totals.day[s] + totals.night[s], 0);
      doc.fillColor('#1e3a5f').rect(MARGIN, yPos, CONTENT_WIDTH, 20).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
        .text(`Total Records: ${grandTotal}  |  Workers: ${workerEntries.length}  |  Days: ${allDates.length}`, MARGIN + 10, yPos + 5, { width: CONTENT_WIDTH - 20, align: 'center' });

      // Footer — drawn relative to current yPos, not absolute PAGE_HEIGHT
      yPos += 8;
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
        .text(`Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | ${org.name}`, MARGIN, yPos, { width: CONTENT_WIDTH, align: 'center' });

      doc.end();
      doc.on('end', resolve);
      doc.on('error', reject);
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

    let attendanceRecord = await Attendance.findOne({ worker: workerId, date: attendanceDate, organizationId: req.organizationId });

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
        organizationId: req.organizationId,
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
                        createdAt: new Date(),
                        organizationId: req.organizationId,
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
  const query = { organizationId: req.organizationId };

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

        await generatePDFReport(pdfData, filters, res, req.organizationId);
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
    const workerQuery = { isActive: true, organizationId: req.organizationId };
    if (department) workerQuery.department = department;
    if (workerId) workerQuery._id = new mongoose.Types.ObjectId(workerId);

    const workersForReport = await Worker.find(workerQuery)
      .select('name workerId department shiftPreference')
      .lean();

    if (workersForReport.length === 0) {
      return res.json({ month, year, report: [], message: "No workers found for this report." });
    }
    
    const attendanceData = await Attendance.aggregate([
      { $match: { ...matchQuery, organizationId: req.organizationId } },
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

        await generatePDFReport(pdfData, filters, res, req.organizationId);
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

    if (attendance.organizationId && String(attendance.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
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
