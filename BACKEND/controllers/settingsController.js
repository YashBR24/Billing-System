const Settings = require('../models/Settings');
const { log } = require('../middleware/logger');

// @desc    Get current settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings(); // Uses the static method from the model
    log(`Settings fetched`, 'info');
    res.json(settings);
  } catch (error) {
    log(`Error fetching settings: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error while fetching settings.' });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  const { 
    sgstPercentage, 
    cgstPercentage, 
    igstPercentage, 
    jobCgstPercentage, 
    jobSgstPercentage,
    itemConfigurations 
  } = req.body;

  try {
    let settings = await Settings.findOne({ singletonId: 'global_settings' });
    if (!settings) {
      // This case should ideally be handled by getSettings creating it, but as a fallback:
      settings = new Settings({ singletonId: 'global_settings' });
      log('No existing settings found, creating new one during update.', 'info');
    }

    if (sgstPercentage !== undefined) settings.sgstPercentage = sgstPercentage;
    if (cgstPercentage !== undefined) settings.cgstPercentage = cgstPercentage;
    if (igstPercentage !== undefined) settings.igstPercentage = igstPercentage;
    if (jobCgstPercentage !== undefined) settings.jobCgstPercentage = jobCgstPercentage;
    if (jobSgstPercentage !== undefined) settings.jobSgstPercentage = jobSgstPercentage;
    
    // Handle itemConfigurations update carefully
    // For simplicity, this replaces the entire array.
    // More complex logic could be to add/update/delete individual items.
    if (itemConfigurations !== undefined && Array.isArray(itemConfigurations)) {
      // Basic validation for itemConfigurations
      for (const item of itemConfigurations) {
        if (!item.description || !item.hsnSacCode) {
          log('Update settings failed: Invalid item configuration data.', 'warn');
          return res.status(400).json({ message: 'Each item configuration must have a description and HSN/SAC code.' });
        }
      }
      settings.itemConfigurations = itemConfigurations;
    }

    settings.updatedAt = new Date();
    const updatedSettings = await settings.save();
    
    log(`Settings updated successfully`, 'info');
    res.json(updatedSettings);
  } catch (error) {
    log(`Error updating settings: ${error.message}`, 'error');
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while updating settings.' });
  }
};

// @desc    Add an item configuration
// @route   POST /api/settings/item-configurations
// @access  Private/Admin
const addItemConfiguration = async (req, res) => {
  const { description, hsnSacCode, defaultRate } = req.body;
  if (!description || !hsnSacCode) {
    return res.status(400).json({ message: 'Description and HSN/SAC code are required.' });
  }

  try {
    const settings = await Settings.getSettings();
    // Check for duplicates
    const existingItem = settings.itemConfigurations.find(
      item => item.description === description && item.hsnSacCode === hsnSacCode
    );
    if (existingItem) {
      log(`Add item config failed: Duplicate item - ${description}/${hsnSacCode}`, 'warn');
      return res.status(400).json({ message: 'This item configuration already exists.' });
    }

    const newItem = { description, hsnSacCode, defaultRate: defaultRate || 0 };
    settings.itemConfigurations.push(newItem);
    await settings.save();
    log(`Item configuration added: ${description}/${hsnSacCode}`, 'info');
    res.status(201).json(settings.itemConfigurations.slice(-1)[0]); // Return the newly added item
  } catch (error) {
    log(`Error adding item configuration: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update an item configuration
// @route   PUT /api/settings/item-configurations/:itemId
// @access  Private/Admin
const updateItemConfiguration = async (req, res) => {
  const { itemId } = req.params;
  const { description, hsnSacCode, defaultRate } = req.body;

  if (!description && !hsnSacCode && defaultRate === undefined) {
    return res.status(400).json({ message: 'No update data provided.' });
  }

  try {
    const settings = await Settings.getSettings();
    const itemIndex = settings.itemConfigurations.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      log(`Update item config failed: Item not found - ID: ${itemId}`, 'warn');
      return res.status(404).json({ message: 'Item configuration not found.' });
    }

    const itemToUpdate = settings.itemConfigurations[itemIndex];
    if (description) itemToUpdate.description = description;
    if (hsnSacCode) itemToUpdate.hsnSacCode = hsnSacCode;
    if (defaultRate !== undefined) itemToUpdate.defaultRate = defaultRate;
    
    // Check for duplicates if description or hsnSacCode changed to a new combination
    if ((description && description !== settings.itemConfigurations[itemIndex].description) || 
        (hsnSacCode && hsnSacCode !== settings.itemConfigurations[itemIndex].hsnSacCode)) {
      const duplicateExists = settings.itemConfigurations.some(
        (item, index) => index !== itemIndex && item.description === itemToUpdate.description && item.hsnSacCode === itemToUpdate.hsnSacCode
      );
      if (duplicateExists) {
        log(`Update item config failed: Duplicate item after update - ${itemToUpdate.description}/${itemToUpdate.hsnSacCode}`, 'warn');
        return res.status(400).json({ message: 'Another item with this description and HSN/SAC code already exists.' });
      }
    }
    
    settings.itemConfigurations[itemIndex] = itemToUpdate;
    await settings.save();
    log(`Item configuration updated: ID ${itemId}`, 'info');
    res.json(settings.itemConfigurations[itemIndex]);
  } catch (error) {
    log(`Error updating item configuration ID ${itemId}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete an item configuration
// @route   DELETE /api/settings/item-configurations/:itemId
// @access  Private/Admin
const deleteItemConfiguration = async (req, res) => {
  const { itemId } = req.params;
  try {
    const settings = await Settings.getSettings();
    const initialLength = settings.itemConfigurations.length;
    settings.itemConfigurations = settings.itemConfigurations.filter(item => item._id.toString() !== itemId);

    if (settings.itemConfigurations.length === initialLength) {
      log(`Delete item config failed: Item not found - ID: ${itemId}`, 'warn');
      return res.status(404).json({ message: 'Item configuration not found.' });
    }

    await settings.save();
    log(`Item configuration deleted: ID ${itemId}`, 'info');
    res.json({ message: 'Item configuration removed.' });
  } catch (error) {
    log(`Error deleting item configuration ID ${itemId}: ${error.message}`, 'error');
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  addItemConfiguration,
  updateItemConfiguration,
  deleteItemConfiguration
};