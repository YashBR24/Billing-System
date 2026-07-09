
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ItemConfigForm = ({ onSubmit, initialData = null, onCancel, isLoading }) => {
  const [description, setDescription] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setHsnSacCode(initialData.hsnSacCode || '');
      setDefaultRate(initialData.defaultRate !== undefined ? String(initialData.defaultRate) : '');
    } else {
      setDescription('');
      setHsnSacCode('');
      setDefaultRate('');
    }
    setErrors({});
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!hsnSacCode.trim()) newErrors.hsnSacCode = 'HSN/SAC code is required.';
    if (hsnSacCode.trim() && !/^\d{4,8}$/.test(hsnSacCode.trim()) && !/^[a-zA-Z0-9]+$/.test(hsnSacCode.trim())) {
      newErrors.hsnSacCode = 'Invalid HSN/SAC code format (e.g., 4-8 digits for HSN).';
    }
    if (defaultRate.trim() && isNaN(parseFloat(defaultRate))) {
      newErrors.defaultRate = 'Default rate must be a valid number.';
    } else if (defaultRate.trim() && parseFloat(defaultRate) < 0) {
      newErrors.defaultRate = 'Default rate cannot be negative.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        description,
        hsnSacCode,
        defaultRate: defaultRate.trim() === '' ? 0 : parseFloat(defaultRate),
      });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white shadow-lg rounded-xl p-6 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="itemDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full p-3 border ${errors.description ? 'border-red-500' : 'border-gray-200'} rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.description && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.description}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <label htmlFor="itemHsnSac" className="block text-sm font-medium text-gray-700 mb-1">
          HSN/SAC Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="itemHsnSac"
          value={hsnSacCode}
          onChange={(e) => setHsnSacCode(e.target.value)}
          className={`w-full p-3 border ${errors.hsnSacCode ? 'border-red-500' : 'border-gray-200'} rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.hsnSacCode && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.hsnSacCode}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <label htmlFor="itemDefaultRate" className="block text-sm font-medium text-gray-700 mb-1">
          Default Rate (Optional)
        </label>
        <input
          type="number"
          id="itemDefaultRate"
          value={defaultRate}
          onChange={(e) => setDefaultRate(e.target.value)}
          placeholder="0.00"
          step="0.01"
          className={`w-full p-3 border ${errors.defaultRate ? 'border-red-500' : 'border-gray-200'} rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.defaultRate && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.defaultRate}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="flex justify-end space-x-3 pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <motion.button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-all transform hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all transform hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? 'Saving...' : (initialData ? 'Update Item' : 'Add Item')}
        </motion.button>
      </motion.div>
    </motion.form>
  );
};

export default ItemConfigForm;