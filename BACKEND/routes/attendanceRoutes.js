const express = require('express');
const router = express.Router();
const {
  recordAttendance,
  recordBulkAttendance,
  getAttendanceRecords,
  getAttendanceReport,
  updateAttendance
} = require('../controllers/attendanceController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(isAdmin);

// Record single attendance or get records
router.route('/')
  .post(recordAttendance) // For individual record/update
  .get(getAttendanceRecords); // For fetching records with filters

// Record bulk attendance
router.route('/bulk')
  .post(recordBulkAttendance);

// Get attendance report
router.route('/report')
  .get(getAttendanceReport);


// Update attendance record
router.route('/:id')
  .put(updateAttendance); // Update specific attendance record by ID

module.exports = router;
