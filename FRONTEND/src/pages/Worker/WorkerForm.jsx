import React, { useState, useEffect } from 'react';

const WorkerForm = ({ onSubmit, initialData = null, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [workerId, setWorkerId] = useState(''); // Optional external ID
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setWorkerId(initialData.workerId || '');
      setContactNumber(initialData.contactNumber || '');
      setAddress(initialData.address || '');
      setJoiningDate(initialData.joiningDate ? new Date(initialData.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    } else {
      // Reset form for new entry
      setName('');
      setWorkerId('');
      setContactNumber('');
      setAddress('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setIsActive(true);
    }
    setErrors({}); // Clear errors when initialData changes
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Worker name is required.';
    // Add more specific validations if needed (e.g., contact number format)
    if (contactNumber.trim() && !/^\d{10,15}$/.test(contactNumber.trim())) {
        newErrors.contactNumber = 'Enter a valid contact number (10-15 digits).';
    }
    if (!joiningDate) newErrors.joiningDate = 'Joining date is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        name,
        workerId: workerId.trim() || undefined, // Send undefined if empty, so backend doesn't try to save empty string for unique field
        contactNumber,
        address,
        joiningDate,
        isActive,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="workerName" className="block text-sm font-medium text-gray-700">
          Worker Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="workerName"
          value={name}
          placeholder='e.g., John Doe'
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="workerExternalId" className="block text-sm font-medium text-gray-700">
          Worker ID (Optional)
        </label>
        <input
          type="text"
          id="workerExternalId"
          value={workerId}
          placeholder='e.g., W12345'
          onChange={(e) => setWorkerId(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border ${errors.workerId ? 'border-red-500' : 'border-gray-300'} text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.workerId && <p className="mt-1 text-xs text-red-500">{errors.workerId}</p>}
      </div>
      
      <div>
        <label htmlFor="workerContact" className="block text-sm font-medium text-gray-700">
          Contact Number
        </label>
        <input
          type="tel"
          id="workerContact"
          value={contactNumber}
          placeholder='e.g., 1234567890'
          onChange={(e) => setContactNumber(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border ${errors.contactNumber ? 'border-red-500' : 'border-gray-300'} text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.contactNumber && <p className="mt-1 text-xs text-red-500">{errors.contactNumber}</p>}
      </div>

      <div>
        <label htmlFor="workerAddress" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <textarea
          id="workerAddress"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder='e.g., 123 Main St, City, Country'
          rows="2"
          className={`mt-1 block w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        ></textarea>
        {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
      </div>

      <div>
        <label htmlFor="workerJoiningDate" className="block text-sm font-medium text-gray-700">
          Joining Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="workerJoiningDate"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border ${errors.joiningDate ? 'border-red-500' : 'border-gray-300'} text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.joiningDate && <p className="mt-1 text-xs text-red-500">{errors.joiningDate}</p>}
      </div>

      <div className="flex items-center">
        <input
          id="workerIsActive"
          name="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="workerIsActive" className="ml-2 block text-sm text-gray-900">
          Active Worker
        </label>
      </div>


      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : (initialData ? 'Update Worker' : 'Add Worker')}
        </button>
      </div>
    </form>
  );
};

export default WorkerForm;