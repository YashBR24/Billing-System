const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance'); // To handle related data if needed
const { log } = require('../middleware/logger');

// @desc    Create a new worker
// @route   POST /api/workers
// @access  Private/Admin
const   createWorker = async (req, res) => {
  const { name, workerId, contactNumber, address, joiningDate, isActive } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Worker name is required.' });
  }

  try {
    if (workerId) {
      const existingWorkerById = await Worker.findOne({ workerId });
      if (existingWorkerById) {
        log(`Worker creation failed: Worker ID '${workerId}' already exists.`, 'warn');
        return res.status(400).json({ message: `Worker with ID '${workerId}' already exists.` });
      }
    }

    const worker = new Worker({
      name,
      workerId,
      contactNumber,
      address,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    const createdWorker = await worker.save();
    log(`Worker created successfully: ${createdWorker.name} (ID: ${createdWorker._id})`, 'info');
    res.status(201).json(createdWorker);
  } catch (error) {
    log(`Error creating worker: ${error.message}`, 'error');
    if (error.code === 11000) { // Duplicate key error for workerId
        return res.status(400).json({ message: `Worker ID '${workerId}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating worker.' });
  }
};

// @desc    Get all workers (optionally filter by active status)
// @route   GET /api/workers
// @access  Private/Admin
const   getWorkers = async (req, res) => {
  const { active } = req.query; // e.g., /api/workers?active=true
  const filter = {};
  if (active === 'true') {
    filter.isActive = true;
  } else if (active === 'false') {
    filter.isActive = false;
  }

  try {
    const workers = await Worker.find(filter).sort({ name: 1 });
    log(`Fetched workers (filter: ${JSON.stringify(filter)})`, 'info');
    res.json(workers);
  } catch (error) {
    log(`Error fetching workers: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching workers.' });
  }
};

// @desc    Get a single worker by ID
// @route   GET /api/workers/:id
// @access  Private/Admin
const   getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (worker) {
      log(`Fetched worker by ID: ${worker.name} (ID: ${req.params.id})`, 'info');
      res.json(worker);
    } else {
      log(`Worker not found with ID: ${req.params.id}`, 'warn');
      res.status(404).json({ message: 'Worker not found' });
    }
  } catch (error) {
    log(`Error fetching worker by ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching worker.' });
  }
};

// @desc    Update a worker
// @route   PUT /api/workers/:id
// @access  Private/Admin
const   updateWorker = async (req, res) => {
  const { name, workerId, contactNumber, address, joiningDate, isActive } = req.body;

  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      log(`Worker update failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Check for uniqueness if workerId is being changed
    if (workerId && workerId !== worker.workerId) {
      const existingWorker = await Worker.findOne({ workerId });
      if (existingWorker && existingWorker._id.toString() !== req.params.id) {
        log(`Worker update failed: Worker ID '${workerId}' already exists.`, 'warn');
        return res.status(400).json({ message: `Worker with ID '${workerId}' already exists.` });
      }
      worker.workerId = workerId;
    }

    worker.name = name || worker.name;
    worker.contactNumber = contactNumber || worker.contactNumber;
    worker.address = address || worker.address;
    if (joiningDate) worker.joiningDate = new Date(joiningDate);
    if (isActive !== undefined) worker.isActive = isActive;
    
    worker.updatedAt = Date.now();

    const updatedWorker = await worker.save();
    log(`Worker updated successfully: ${updatedWorker.name} (ID: ${updatedWorker._id})`, 'info');
    res.json(updatedWorker);
  } catch (error) {
    log(`Error updating worker ID ${req.params.id}: ${error.message}`, 'error');
    if (error.code === 11000) { 
        return res.status(400).json({ message: `Worker ID '${workerId}' already exists.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating worker.' });
  }
};

// @desc    Delete a worker
// @route   DELETE /api/workers/:id
// @access  Private/Admin
const   deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (worker) {
      await worker.deleteOne();
      log(`Worker deleted successfully: ${worker.name} (ID: ${req.params.id})`, 'info');
      res.json({ message: 'Worker removed' });
    } else {
      log(`Worker deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      res.status(404).json({ message: 'Worker not found' });
    }
  } catch (error) {
    log(`Error deleting worker ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting worker.' });
  }
};


module.exports = {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
};