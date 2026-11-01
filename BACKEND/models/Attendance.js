

const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  date: { // The specific date of attendance
    type: Date,
    required: true,
  },
  shifts: {
    day: {
      status: {
        type: String,
        enum: ['Present', 'Absent', 'Half Day', 'Leave', null],
        default: null
      },
      checkInTime: Date,
      checkOutTime: Date,
      notes: String
    },
    night: {
      status: {
        type: String,
        enum: ['Present', 'Absent', 'Half Day', 'Leave', null],
        default: null
      },
      checkInTime: Date,
      checkOutTime: Date,
      notes: String
    }
  },
  recordedBy: { // Admin user who recorded/updated this attendance
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure that a worker has only one attendance record per day
AttendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

AttendanceSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  // Ensure date is stored as Date only (without time part) for daily uniqueness
  if (this.date) {
    const d = new Date(this.date);
    this.date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  next();
});

// Virtual to get overall status (if needed)
AttendanceSchema.virtual('overallStatus').get(function() {
  if (this.shifts.day.status && this.shifts.night.status) {
    return 'Both Shifts';
  } else if (this.shifts.day.status) {
    return 'Day Shift';
  } else if (this.shifts.night.status) {
    return 'Night Shift';
  }
  return 'Not Marked';
});

module.exports = mongoose.model('Attendance', AttendanceSchema);