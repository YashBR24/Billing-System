// const Company = require('../models/Company');
// const { log } = require('../middleware/logger');

// const createCompany = async (req, res) => {
//   const { name, address, gstNumber, mobileNumber, companyType } = req.body;

//   if (!name || !address || !gstNumber || !mobileNumber || !companyType) {
//     return res.status(400).json({ message: 'Name, address, GST number, mobile number, and company type are required.' });
//   }

//   try {
//     const existingCompanyByName = await Company.findOne({ name, organizationId: req.organizationId });
//     if (existingCompanyByName) {
//       log(`Company creation failed: Name already exists - ${name}`, 'warn');
//       return res.status(400).json({ message: `Company with name '${name}' already exists.` });
//     }

//     const existingCompanyByGST = await Company.findOne({ gstNumber, organizationId: req.organizationId });
//     if (existingCompanyByGST) {
//       log(`Company creation failed: GST number already exists - ${gstNumber}`, 'warn');
//       return res.status(400).json({ message: `Company with GST number '${gstNumber}' already exists.` });
//     }

//     const company = new Company({
//       name,
//       address,
//       gstNumber,
//       mobileNumber,
//       companyType,
//       organizationId: req.organizationId,
//     });

//     const createdCompany = await company.save();
//     log(`Company created successfully: ${createdCompany.name} (ID: ${createdCompany._id}) by ${req.user.email}`, 'info');
//     res.status(201).json(createdCompany);
//   } catch (error) {
//     log(`Error creating company: ${error.message}`, 'error');
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server error while creating company.' });
//   }
// };

// const getCompanies = async (req, res) => {
//   const { companyType } = req.query;
//   const query = { organizationId: req.organizationId };

//   if (companyType) {
//     if (companyType === 'Both') {
//       query.companyType = { $in: ['Buyer', 'Seller', 'Both'] };
//     } else if (companyType === 'BuyerOrBoth') {
//       query.companyType = { $in: ['Buyer', 'Both'] };
//     } else if (companyType === 'SellerOrBoth') {
//       query.companyType = { $in: ['Seller', 'Both'] };
//     } else {
//       if (['Buyer', 'Seller', 'Both'].includes(companyType)) {
//         query.companyType = companyType;
//       } else {
//         return res.status(400).json({ 
//           message: "Invalid companyType. Use: Buyer, Seller, Both, BuyerOrBoth, SellerOrBoth" 
//         });
//       }
//     }
//   }

//   try {
//     const companies = await Company.find(query).sort({ name: 1 });
//     log(`Fetched companies with query ${JSON.stringify(query)} by ${req.user.email}`, 'info');
//     res.json(companies);
//   } catch (error) {
//     log(`Error fetching companies: ${error.message} - Stack: ${error.stack}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching companies.' });
//   }
// };

// const getCompanyById = async (req, res) => {
//   try {
//     const company = await Company.findOne({ _id: req.params.id, organizationId: req.organizationId });

//     if (company) {
//       log(`Fetched company by ID: ${company.name} (ID: ${req.params.id}) by ${req.user.email}`, 'info');
//       res.json(company);
//     } else {
//       log(`Company not found with ID: ${req.params.id}`, 'warn');
//       res.status(404).json({ message: 'Company not found' });
//     }
//   } catch (error) {
//     log(`Error fetching company by ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while fetching company.' });
//   }
// };

// const updateCompany = async (req, res) => {
//   const { name, address, gstNumber, mobileNumber, companyType } = req.body;

//   try {
//     const company = await Company.findById(req.params.id);

//     if (!company) {
//       log(`Company update failed: Not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Company not found' });
//     }

//     if (company.organizationId && String(company.organizationId) !== String(req.organizationId)) {
//       return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
//     }

//     if (name && name !== company.name) {
//       const existingCompanyByName = await Company.findOne({ name, organizationId: req.organizationId });
//       if (existingCompanyByName && existingCompanyByName._id.toString() !== req.params.id) {
//         log(`Company update failed: Name already exists - ${name}`, 'warn');
//         return res.status(400).json({ message: `Company with name '${name}' already exists.` });
//       }
//       company.name = name;
//     }
//     if (gstNumber && gstNumber !== company.gstNumber) {
//       const existingCompanyByGST = await Company.findOne({ gstNumber, organizationId: req.organizationId });
//       if (existingCompanyByGST && existingCompanyByGST._id.toString() !== req.params.id) {
//         log(`Company update failed: GST number already exists - ${gstNumber}`, 'warn');
//         return res.status(400).json({ message: `Company with GST number '${gstNumber}' already exists.` });
//       }
//       company.gstNumber = gstNumber;
//     }

//     company.address = address || company.address;
//     company.mobileNumber = mobileNumber || company.mobileNumber;
//     if (companyType) company.companyType = companyType;

//     const updatedCompany = await company.save();
//     log(`Company updated successfully: ${updatedCompany.name} (ID: ${updatedCompany._id}) by ${req.user.email}`, 'info');
//     res.json(updatedCompany);
//   } catch (error) {
//     log(`Error updating company ID ${req.params.id}: ${error.message}`, 'error');
//      if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server error while updating company.' });
//   }
// };

// const deleteCompany = async (req, res) => {
//   try {
//     const company = await Company.findById(req.params.id);

//     if (!company) {
//       log(`Company deletion failed: Not found with ID: ${req.params.id}`, 'warn');
//       return res.status(404).json({ message: 'Company not found' });
//     }

//     if (company.organizationId && String(company.organizationId) !== String(req.organizationId)) {
//       return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
//     }

//     await company.deleteOne();
//     log(`Company deleted successfully: ${company.name} (ID: ${req.params.id}) by ${req.user.email}`, 'info');
//     res.json({ message: 'Company removed' });
//   } catch (error) {
//     log(`Error deleting company ID ${req.params.id}: ${error.message}`, 'error');
//     res.status(500).json({ message: 'Server error while deleting company.' });
//   }
// };

// module.exports = {
//   createCompany,
//   getCompanies,
//   getCompanyById,
//   updateCompany,
//   deleteCompany,
// };


const Company = require('../models/Company');
const { log } = require('../middleware/logger');

const createCompany = async (req, res) => {
  const { name, address, gstNumber, mobileNumber, companyType } = req.body;

  if (!name || !address || !gstNumber || !mobileNumber || !companyType) {
    return res.status(400).json({ message: 'Name, address, GST number, mobile number, and company type are required.' });
  }

  try {
    // Block only if BOTH name AND address are identical (true duplicate)
    const exactDuplicate = await Company.findOne({
      name,
      address,
      organizationId: req.organizationId,
    });
    if (exactDuplicate) {
      log(`Company creation failed: Exact duplicate - ${name} / ${address}`, 'warn');
      return res.status(400).json({
        message: `A company with name '${name}' and the same address already exists.`,
      });
    }

    // GST check removed — same GST with different address is valid
    // (e.g. same company as Buyer with billing address AND as Consignee with delivery address)

    const company = new Company({
      name,
      address,
      gstNumber,
      mobileNumber,
      companyType,
      organizationId: req.organizationId,
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

const getCompanies = async (req, res) => {
  const { companyType } = req.query;
  const query = { organizationId: req.organizationId };

  if (companyType) {
    if (companyType === 'Both') {
      query.companyType = { $in: ['Buyer', 'Seller', 'Both'] };
    } else if (companyType === 'BuyerOrBoth') {
      query.companyType = { $in: ['Buyer', 'Both'] };
    } else if (companyType === 'SellerOrBoth') {
      query.companyType = { $in: ['Seller', 'Both'] };
    } else {
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

const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, organizationId: req.organizationId });

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

const updateCompany = async (req, res) => {
  const { name, address, gstNumber, mobileNumber, companyType } = req.body;

  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      log(`Company update failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Company not found' });
    }

    if (company.organizationId && String(company.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    // Only block if the new name+address combo exactly matches a DIFFERENT company
    const newName = name || company.name;
    const newAddress = address || company.address;

    const exactDuplicate = await Company.findOne({
      name: newName,
      address: newAddress,
      organizationId: req.organizationId,
    });
    if (exactDuplicate && exactDuplicate._id.toString() !== req.params.id) {
      log(`Company update failed: Exact duplicate - ${newName} / ${newAddress}`, 'warn');
      return res.status(400).json({
        message: `A company with name '${newName}' and the same address already exists.`,
      });
    }

    if (name) company.name = name;
    if (address) company.address = address;
    if (gstNumber) company.gstNumber = gstNumber;  // GST can be freely updated
    company.mobileNumber = mobileNumber || company.mobileNumber;
    if (companyType) company.companyType = companyType;

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

const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      log(`Company deletion failed: Not found with ID: ${req.params.id}`, 'warn');
      return res.status(404).json({ message: 'Company not found' });
    }

    if (company.organizationId && String(company.organizationId) !== String(req.organizationId)) {
      return res.status(403).json({ message: 'Access denied. This resource does not belong to your organization.' });
    }

    await company.deleteOne();
    log(`Company deleted successfully: ${company.name} (ID: ${req.params.id}) by ${req.user.email}`, 'info');
    res.json({ message: 'Company removed' });
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