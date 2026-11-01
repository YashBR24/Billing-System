const Company = require('../models/Company');
const { log } = require('../middleware/logger');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private/Admin
const   createCompany = async (req, res) => {
  const { name, address, gstNumber, mobileNumber, companyType } = req.body;

  if (!name || !address || !gstNumber || !mobileNumber || !companyType) {
    return res.status(400).json({ message: 'Name, address, GST number, mobile number, and company type are required.' });
  }

  try {
    // Check if company with the same name or GST number already exists
    const existingCompanyByName = await Company.findOne({ name });
    if (existingCompanyByName) {
      log(`Company creation failed: Name already exists - ${name}`, 'warn');
      return res.status(400).json({ message: `Company with name '${name}' already exists.` });
    }

    const existingCompanyByGST = await Company.findOne({ gstNumber });
    if (existingCompanyByGST) {
      log(`Company creation failed: GST number already exists - ${gstNumber}`, 'warn');
      return res.status(400).json({ message: `Company with GST number '${gstNumber}' already exists.` });
    }

    const company = new Company({
      name,
      address,
      gstNumber,
      mobileNumber,
      companyType,
      // createdBy: req.user._id // If you want to associate with the logged-in admin
    });

    const createdCompany = await company.save();
    log(`Company created successfully: ${createdCompany.name} (ID: ${createdCompany._id}) by ${req.user.email}`, 'info');
    res.status(201).json(createdCompany);
  } catch (error) {
    log(`Error creating company: ${error.message}`, 'error');
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating company.' });
  }
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private/Admin
const getCompanies = async (req, res) => {
  const { companyType } = req.query;
  const query = {};

  if (companyType) {
    if (companyType === 'Both') {
      // 'Both' in query → return Buyer + Seller + Both
      query.companyType = { $in: ['Buyer', 'Seller', 'Both'] };
    } else if (companyType === 'BuyerOrBoth') {
      query.companyType = { $in: ['Buyer', 'Both'] };
    } else if (companyType === 'SellerOrBoth') {
      query.companyType = { $in: ['Seller', 'Both'] };
    } else {
      // Allow only valid values now
      if (['Buyer', 'Seller', 'Both'].includes(companyType)) {
        query.companyType = companyType;
      } else {
        return res.status(400).json({ 
          message: "Invalid companyType. Use: Buyer, Seller, Both, BuyerOrBoth, SellerOrBoth" 
        });
      }
    }
  }

  try {
    const companies = await Company.find(query).sort({ name: 1 });
    log(`Fetched companies with query ${JSON.stringify(query)} by ${req.user.email}`, 'info');
    res.json(companies);
  } catch (error) {
    log(`Error fetching companies: ${error.message} - Stack: ${error.stack}`, 'error');
    res.status(500).json({ message: 'Server error while fetching companies.' });
  }
};
// @desc    Get a single company by ID
// @route   GET /api/companies/:id
// @access  Private/Admin
const   getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (company) {
      log(`Fetched company by ID: ${company.name} (ID: ${req.params.id}) by ${req.user.email}`, 'info');
      res.json(company);
    } else {
      log(`Company not found with ID: ${req.params.id}`, 'warn');
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    log(`Error fetching company by ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching company.' });
  }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private/Admin
const   updateCompany = async (req, res) => {
  const { name, address, gstNumber, mobileNumber, companyType } = req.body;

  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      log(`Company update failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check for uniqueness if name or GST is being changed
    if (name && name !== company.name) {
      const existingCompanyByName = await Company.findOne({ name });
      if (existingCompanyByName && existingCompanyByName._id.toString() !== req.params.id) {
        log(`Company update failed: Name already exists - ${name}`, 'warn');
        return res.status(400).json({ message: `Company with name '${name}' already exists.` });
      }
      company.name = name;
    }
    if (gstNumber && gstNumber !== company.gstNumber) {
      const existingCompanyByGST = await Company.findOne({ gstNumber });
      if (existingCompanyByGST && existingCompanyByGST._id.toString() !== req.params.id) {
        log(`Company update failed: GST number already exists - ${gstNumber}`, 'warn');
        return res.status(400).json({ message: `Company with GST number '${gstNumber}' already exists.` });
      }
      company.gstNumber = gstNumber;
    }

    company.address = address || company.address;
    company.mobileNumber = mobileNumber || company.mobileNumber;
    if (companyType) company.companyType = companyType;
    // company.updatedAt = Date.now(); // This is handled by pre-save hook

    const updatedCompany = await company.save();
    log(`Company updated successfully: ${updatedCompany.name} (ID: ${updatedCompany._id}) by ${req.user.email}`, 'info');
    res.json(updatedCompany);
  } catch (error) {
    log(`Error updating company ID ${req.params.id}: ${error.message}`, 'error');
     if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating company.' });
  }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private/Admin
const   deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (company) {
      // Add any pre-deletion checks here (e.g., if company is linked to bills)
      await company.deleteOne(); // or company.remove() for older mongoose
      log(`Company deleted successfully: ${company.name} (ID: ${req.params.id}) by ${req.user.email}`, 'info');
      res.json({ message: 'Company removed' });
    } else {
      log(`Company deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    log(`Error deleting company ID ${req.params.id}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deleting company.' });
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};