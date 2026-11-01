const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add worker name'],
    trim: true,
  },
  workerId: { // Optional: if you have a specific ID format
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allows null/undefined values for unique index if not all workers have it
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  isActive: { // To mark if a worker is currently active or has left
    type: Boolean,
    default: true,
  },
  // You can add more fields like department, designation, salary details etc.
  // For example:
  // department: String,
  // designation: String,
  // dailyWage: Number, 
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin user who added this worker
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

WorkerSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Worker', WorkerSchema);