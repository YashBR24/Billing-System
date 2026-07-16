
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CompanyForm = ({ onSubmit, initialData = null, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyType, setCompanyType] = useState('Both');
  const [errors, setErrors] = useState({});

  const companyTypes = ['Buyer', 'Seller', 'Both'];

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setAddress(initialData.address || '');
      setGstNumber(initialData.gstNumber || '');
      setMobileNumber(initialData.mobileNumber || '');
    } else {
      setName('');
      setAddress('');
      setGstNumber('');
      setMobileNumber('');
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Company name is required.';
    if (!address.trim()) newErrors.address = 'Address is required.';
    if (!gstNumber.trim()) {
      newErrors.gstNumber = 'GST number is required.';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)) {
      newErrors.gstNumber = 'Invalid GST number format.';
    }
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required.';
    } else if (!/^\d{10}$/.test(mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits.';
    }
    if (!companyType) {
      newErrors.companyType = 'Company type is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ name, address, gstNumber, mobileNumber, companyType });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white shadow-lg rounded-xl px-6 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="companyName"
          value={name}
          placeholder='e.g., Acme Corp'
          onChange={(e) => setName(e.target.value)}
          className={`w-full p-3 border ${errors.name ? 'border-red-500' : 'border-gray-200'} text-black rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.name && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.name}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          id="companyAddress"
          value={address}
          placeholder='e.g., 123 Main St, City, State, ZIP'
          onChange={(e) => setAddress(e.target.value)}
          rows="3"
          className={`w-full p-3 border ${errors.address ? 'border-red-500' : 'border-gray-200'} text-black rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        ></textarea>
        <AnimatePresence>
          {errors.address && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.address}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <label htmlFor="companyGst" className="block text-sm font-medium text-gray-700 mb-1">
          GST Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="companyGst"
          value={gstNumber}
          placeholder='e.g., 22AAAAA0000A1Z5'
          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
          className={`w-full p-3 border ${errors.gstNumber ? 'border-red-500' : 'border-gray-200'} text-black rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.gstNumber && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.gstNumber}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <label htmlFor="companyMobile" className="block text-sm font-medium text-gray-700 mb-1">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="companyMobile"
          value={mobileNumber}
          placeholder='e.g., 9876543210'
          onChange={(e) => setMobileNumber(e.target.value)}
          className={`w-full p-3 border ${errors.mobileNumber ? 'border-red-500' : 'border-gray-200'} text-black rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        />
        <AnimatePresence>
          {errors.mobileNumber && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.mobileNumber}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <label htmlFor="companyType" className="block text-sm font-medium text-gray-700 mb-1">
          Company Type <span className="text-red-500">*</span>
        </label>
        <select
          id="companyType"
          value={companyType}
          onChange={(e) => setCompanyType(e.target.value)}
          className={`w-full p-3 border ${errors.companyType ? 'border-red-500' : 'border-gray-200'} text-black rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all`}
        >
          {companyTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <AnimatePresence>
          {errors.companyType && (
            <motion.p
              className="mt-1 text-xs text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {errors.companyType}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="flex justify-end space-x-3 pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
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
          {isLoading ? 'Saving...' : (initialData ? 'Update Company' : 'Add Company')}
        </motion.button>
      </motion.div>
    </motion.form>
  );
};

export default CompanyForm;