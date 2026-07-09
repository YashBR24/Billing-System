const Organization = require('../models/Organization');
const Settings = require('../models/Settings');
const { log } = require('../middleware/logger');

const createOrganization = async (req, res) => {
  const { name, shortName, slug, address, gstin, pan, bankDetails, contact, businessType, terminology, logo } = req.body;

  if (!name || !slug || !address) {
    return res.status(400).json({ message: 'Name, slug, and address are required.' });
  }

  try {
    const existing = await Organization.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: `Organization with slug '${slug}' already exists.` });
    }

    const org = await Organization.create({
      name,
      shortName: shortName || name,
      slug: slug.toLowerCase(),
      address,
      gstin: gstin || '',
      pan: pan || '',
      bankDetails: bankDetails || {},
      contact: contact || {},
      businessType: businessType || 'yarn',
      terminology: terminology || { copsLabel: 'Cops' },
      logo: logo || '',
      isActive: true,
    });

    await Settings.create({
      organizationId: org._id,
      sgstPercentage: 6,
      cgstPercentage: 6,
      igstPercentage: 12,
      jobCgstPercentage: 2.5,
      jobSgstPercentage: 2.5,
      itemConfigurations: [],
    });

    log(`Organization created: ${org.name} by ${req.user.email}`, 'info');
    res.status(201).json(org);
  } catch (error) {
    log(`Error creating organization: ${error.message}`, 'error');
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Organization with this slug already exists.' });
    }
    res.status(500).json({ message: 'Server error while creating organization.' });
  }
};

const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 });
    res.json(organizations);
  } catch (error) {
    log(`Error fetching organizations: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching organizations.' });
  }
};

const getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }
    res.json(org);
  } catch (error) {
    log(`Error fetching organization: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching organization.' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const { name, shortName, slug, address, gstin, pan, bankDetails, contact, businessType, terminology, logo } = req.body;

    if (slug && slug !== org.slug) {
      const existing = await Organization.findOne({ slug: slug.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: `Organization with slug '${slug}' already exists.` });
      }
      org.slug = slug.toLowerCase();
    }

    if (name) org.name = name;
    if (shortName !== undefined) org.shortName = shortName;
    if (address) org.address = address;
    if (gstin !== undefined) org.gstin = gstin;
    if (pan !== undefined) org.pan = pan;
    if (bankDetails) org.bankDetails = { ...org.bankDetails, ...bankDetails };
    if (contact) org.contact = { ...org.contact, ...contact };
    if (businessType) org.businessType = businessType;
    if (terminology) org.terminology = { ...org.terminology, ...terminology };
    if (logo !== undefined) org.logo = logo;

    const updatedOrg = await org.save();
    log(`Organization updated: ${updatedOrg.name} by ${req.user.email}`, 'info');
    res.json(updatedOrg);
  } catch (error) {
    log(`Error updating organization: ${error.message}`, 'error');
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Organization with this slug already exists.' });
    }
    res.status(500).json({ message: 'Server error while updating organization.' });
  }
};

const deactivateOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    org.isActive = false;
    const updatedOrg = await org.save();
    log(`Organization deactivated: ${org.name} by ${req.user.email}`, 'info');
    res.json(updatedOrg);
  } catch (error) {
    log(`Error deactivating organization: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while deactivating organization.' });
  }
};

const activateOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    org.isActive = true;
    const updatedOrg = await org.save();
    log(`Organization activated: ${org.name} by ${req.user.email}`, 'info');
    res.json(updatedOrg);
  } catch (error) {
    log(`Error activating organization: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while activating organization.' });
  }
};

const getMyOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }
    res.json(org);
  } catch (error) {
    log(`Error fetching my organization: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching organization.' });
  }
};

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  deactivateOrganization,
  activateOrganization,
  getMyOrganization,
};
