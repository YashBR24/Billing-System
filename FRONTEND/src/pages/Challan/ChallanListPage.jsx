import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Eye,
  Edit3,
  Trash2,
  X,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Plus,
  Package,
  Building2,
  Calendar,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import ChallanService from '../../services/ChallanService';
import CompanyService from '../../services/CompanyService';
import SettingsService from '../../services/SettingsService';
import BoxService from '../../services/BoxService';
import fileDownload from 'js-file-download';

const ChallanListPage = () => {
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [challans, setChallans] = useState([]);
  const [challansWithFiles, setChallansWithFiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // View modal state
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');

  // List filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    challanNumber: '',
    challanDate: new Date().toISOString().split('T')[0],
    companyId: '',
    descriptionOfGoods: '',
    broker: 'direct',
    boxDetails: [{ boxNumber: '', netWeight: '', cops: '' }],
  });
  const [entryMode, setEntryMode] = useState('manual');
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [availableBoxes, setAvailableBoxes] = useState([]);
  const [availableDescriptions, setAvailableDescriptions] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [originalChallanNumber, setOriginalChallanNumber] = useState('');

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowFilters(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch companies and settings
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [companyRes, settingsRes] = await Promise.all([
          CompanyService.getAllCompanies(),
          SettingsService.getSettings()
        ]);
        setCompanies(companyRes.data);
        setSettings(settingsRes.data);
        const descriptions = settingsRes.data.itemConfigurations.map(item => item.description) || [];
        setAvailableDescriptions(descriptions);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load initial data.');
      }
    };
    fetchInitialData();
  }, []);

  // Set initial date filters
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
  }, []);

  // Format date for input
  const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format display date
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (isUsed) => {
    return isUsed
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  };

  // Fetch challans for list
  // const fetchChallans = useCallback(async () => {
  //   setIsLoading(true);
  //   setError('');
  //   const params = {};
  //   if (filterStartDate) params.startDate = filterStartDate;
  //   if (filterEndDate) params.endDate = filterEndDate;
  //   if (filterCompany) params.companyId = filterCompany;
  //   if (filterStatus) params.isUsed = filterStatus === 'used';
  //   try {
  //     const response = await ChallanService.getAllChallans(params);
  //     setChallans(response.data);
  //   } catch (err) {
  //     setError(err.response?.data?.message || err.message || 'Failed to fetch challans.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [filterStartDate, filterEndDate, filterCompany, filterStatus]);

const fetchChallans = useCallback(async () => {
  setIsLoading(true);
  setError('');

  const params = {};

  if (filterStartDate) params.startDate = filterStartDate;
  if (filterEndDate) params.endDate = filterEndDate;
  if (filterCompany) params.companyId = filterCompany;
  if (filterStatus) params.isUsed = filterStatus === 'used';

  // ✅ ADD THIS
  params.financialYear = getFinancialYear(filterStartDate || new Date());

  try {
    const response = await ChallanService.getAllChallans(params);
    setChallans(response.data);
  } catch (err) {
    setError(err.response?.data?.message || err.message);
  } finally {
    setIsLoading(false);
  }
}, [filterStartDate, filterEndDate, filterCompany, filterStatus]);

  useEffect(() => {
    if (view === 'list' && filterStartDate && filterEndDate) {
      fetchChallans();
    }
  }, [view, fetchChallans, filterStartDate, filterEndDate]);

  // Fetch challans with files for download view
  const fetchChallansWithFiles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await ChallanService.getAllChallans();
      const filteredChallans = response.data.filter(challan => challan.pdfFilePath);
      setChallansWithFiles(filteredChallans);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch challan records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'download') {
      fetchChallansWithFiles();
    }
  }, [view, fetchChallansWithFiles]);

  // Fetch single challan for view
  const fetchChallanDetails = useCallback(async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await ChallanService.getChallanById(id);
      setSelectedChallan(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch challan details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'view' && selectedId) {
      fetchChallanDetails(selectedId);
    }
  }, [view, selectedId, fetchChallanDetails]);

  // Fetch for edit form
  const fetchForEdit = useCallback(async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await ChallanService.getChallanById(id);
      const data = response.data;
      setFormData({
        challanNumber: data.challanNumber,
        challanDate: new Date(data.challanDate).toISOString().split('T')[0],
        companyId: data.company?._id || data.company,
        descriptionOfGoods: data.descriptionOfGoods,
        broker: data.broker || 'direct',
        boxDetails: data.boxDetails.map(box => ({
          boxNumber: box.boxNumber,
          netWeight: box.netWeight.toString(),
          cops: box.cops.toString()
        })) || [{ boxNumber: '', netWeight: '', cops: '' }]
      });
      setOriginalChallanNumber(data.challanNumber);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load challan data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();

  return month >= 3
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
};

  // Fetch available boxes for create form box mode
  const fetchAvailableBoxes = useCallback(async () => {
    if (formMode === 'create' && entryMode === 'box' && formData.descriptionOfGoods) {
      setIsLoadingBoxes(true);
      setError('');
      try {
        const response = await BoxService.getAvailableBoxes(formData.descriptionOfGoods.trim());
        setAvailableBoxes(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load available boxes.');
        setAvailableBoxes([]);
      } finally {
        setIsLoadingBoxes(false);
      }
    } else {
      setAvailableBoxes([]);
    }
  }, [formMode, entryMode, formData.descriptionOfGoods]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailableBoxes();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchAvailableBoxes]);

  // Handle month change for filters
  const handleMonthChange = (direction) => {
    const currentDate = new Date(filterStartDate);
    let newYear = currentDate.getFullYear();
    let newMonth = currentDate.getMonth();
    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 0) { newMonth = 11; newYear--; }
    } else {
      newMonth++;
      if (newMonth > 11) { newMonth = 0; newYear++; }
    }
    const newFirstDay = new Date(newYear, newMonth, 1);
    const newLastDay = new Date(newYear, newMonth + 1, 0);
    setFilterStartDate(formatDateForInput(newFirstDay));
    setFilterEndDate(formatDateForInput(newLastDay));
  };

  // Download Excel for list
  const handleDownloadExcel = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters = {
        startDate: filterStartDate,
        endDate: filterEndDate,
        companyId: filterCompany,
        status: filterStatus
      };
      const response = await ChallanService.downloadChallansExcel(filters);
      let fileName = `Challans_${filterStartDate}_to_${filterEndDate}`;
      if (filterCompany) {
        const company = companies.find(c => c._id === filterCompany);
        fileName += `_${company?.name || ''}`;
      }
      fileName += '.xlsx';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download Excel.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download PDF for list
  const handleDownloadPdf = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters = {
        startDate: filterStartDate,
        endDate: filterEndDate,
        companyId: filterCompany,
        status: filterStatus
      };
      const response = await ChallanService.downloadChallansPdf(filters);
      let fileName = `Challans_${filterStartDate}_to_${filterEndDate}`;
      if (filterCompany) {
        const company = companies.find(c => c._id === filterCompany);
        fileName += `_${company?.name || ''}`;
      }
      fileName += '.pdf';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete challan
  const handleDeleteChallan = async (id) => {
    if (window.confirm('Are you sure you want to delete this challan? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await ChallanService.deleteChallan(id);
        fetchChallans();
        setSuccessMessage('Challan deleted successfully!');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to delete challan.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // View challan
  const handleViewChallan = async (id) => {
    setSelectedId(id);
    setIsViewOpen(true);
    setIsLoading(true);
    setError('');
    try {
      const response = await ChallanService.getChallanById(id);
      setSelectedChallan(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch challan details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download single PDF directly from action
  const handleDownloadSinglePdf = async (id, challanNumber) => {
    setDownloadingFile(id);
    setError('');
    try {
      const response = await ChallanService.downloadChallan(id);
      let filename = `Challan-${challanNumber || id}.pdf`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      fileDownload(response.data, filename);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download PDF.');
    } finally {
      setDownloadingFile(null);
    }
  };

  // Edit challan
  const handleEditChallan = (id) => {
    setSelectedId(id);
    setFormMode('edit');
    fetchForEdit(id);
    setIsFormOpen(true);
  };

  // Create challan

  const handleCreateChallan = async () => {
  const today = new Date();
  const fy = getFinancialYear(today);

  try {
    const res = await ChallanService.getNextChallanNumber(fy);

    setFormData({
      challanNumber: res.data.challanNumber, // 
      challanDate: today.toISOString().split('T')[0],
      companyId: '',
      descriptionOfGoods: '',
      broker: 'direct',
      boxDetails: [{ boxNumber: '', netWeight: '', cops: '' }],
    });

  } catch (err) {
    console.error("Error generating challan number", err);
  }

  setFormMode('create');
  setIsFormOpen(true);
};

  // Go to download view
  const handleGoToDownloads = () => {
    setView('download');
  };

  // Handle box change in form
  const handleBoxChange = (index, field, value) => {
    const newBoxDetails = [...formData.boxDetails];
    newBoxDetails[index][field] = value;
    setFormData({ ...formData, boxDetails: newBoxDetails });
  };

  // Add box
  const addBox = () => {
    setFormData({
      ...formData,
      boxDetails: [...formData.boxDetails, { boxNumber: '', netWeight: '', cops: '' }]
    });
  };

  // Remove box
  const removeBox = (index) => {
    const newBoxDetails = formData.boxDetails.filter((_, i) => i !== index);
    setFormData({ ...formData, boxDetails: newBoxDetails });
  };

  // Toggle box selection
  const toggleBoxSelection = (boxId) => {
    setSelectedBoxes(prev =>
      prev.includes(boxId) ? prev.filter(id => id !== boxId) : [...prev, boxId]
    );
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.challanNumber.trim()) errors.challanNumber = 'Challan number is required.';
    if (!formData.challanDate) errors.challanDate = 'Challan date is required.';
    if (!formData.companyId) errors.companyId = 'Company is required.';
    if (!formData.descriptionOfGoods) errors.descriptionOfGoods = 'Description of goods is required.';

    if (formMode === 'create' && entryMode === 'box') {
      if (selectedBoxes.length === 0) errors.selectedBoxes = 'Please select at least one box.';
    } else {
      if (formData.boxDetails.length === 0) errors.boxDetails = 'At least one box is required.';
      formData.boxDetails.forEach((box, index) => {
        if (!box.boxNumber.trim()) errors[`boxNumber_${index}`] = 'Box number is required.';
        if (!box.netWeight || isNaN(parseFloat(box.netWeight)) || parseFloat(box.netWeight) <= 0) errors[`netWeight_${index}`] = 'Valid net weight is required.';
        if (!box.cops || isNaN(parseInt(box.cops)) || parseInt(box.cops) <= 0) errors[`cops_${index}`] = 'Valid cops count is required.';
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  // const handleFormSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm()) {
  //     setError('Please correct the errors in the form.');
  //     return;
  //   }
  //   setIsLoading(true);
  //   setError('');

  //   const submissionData = {
  //     challanNumber: formData.challanNumber,
  //     challanDate: formData.challanDate,
  //     companyId: formData.companyId,
  //     descriptionOfGoods: formData.descriptionOfGoods,
  //     broker: formData.broker,
  //   };

  //   if (formMode === 'create' && entryMode === 'box') {
  //     submissionData.boxIds = selectedBoxes;
  //   } else {
  //     submissionData.boxDetails = formData.boxDetails.map(box => ({
  //       boxNumber: box.boxNumber,
  //       netWeight: parseFloat(box.netWeight),
  //       cops: parseInt(box.cops),
  //     }));
  //   }

  //   if (formMode === 'edit' && originalChallanNumber !== formData.challanNumber) {
  //     submissionData._originalChallanNumber = originalChallanNumber;
  //   }

  //   try {
  //     if (formMode === 'create') {
  //       await ChallanService.createChallan(submissionData);
  //     } else {
  //       await ChallanService.updateChallan(selectedId, submissionData);
  //     }
  //     setSuccessMessage(`Challan ${formMode === 'create' ? 'created' : 'updated'} successfully!`);
  //     setIsFormOpen(false);
  //     fetchChallans();
  //     setTimeout(() => setSuccessMessage(''), 3000);
  //   } catch (err) {
  //     setError(err.response?.data?.message || err.message || `Failed to ${formMode} challan.`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

const handleFormSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsLoading(true);

  const fy = getFinancialYear(formData.challanDate);

  const submissionData = {
    challanNumber: formData.challanNumber,
    challanDate: formData.challanDate,
    companyId: formData.companyId,
    descriptionOfGoods: formData.descriptionOfGoods,
    broker: formData.broker,
    financialYear: fy,
  };

  if (formMode === 'create' && entryMode === 'box') {
    submissionData.boxIds = selectedBoxes;
  } else {
    submissionData.boxDetails = formData.boxDetails.map(box => ({
      boxNumber: box.boxNumber,
      netWeight: parseFloat(box.netWeight),
      cops: parseInt(box.cops),
    }));
  }

  try {
    if (formMode === 'create') {
      await ChallanService.createChallan(submissionData);
    } else {
      await ChallanService.updateChallan(selectedId, submissionData);
    }

    setIsFormOpen(false);
    fetchChallans();

  } catch (err) {
    setError(err.response?.data?.message);
  } finally {
    setIsLoading(false);
  }
};

  // Calculate totals for form
  const calculateTotals = () => {
    let totalNetWeight = 0;
    let totalCops = 0;
    if (formMode === 'create' && entryMode === 'box') {
      selectedBoxes.forEach(id => {
        const box = availableBoxes.find(b => b._id === id);
        if (box) {
          totalNetWeight += box.netWeight;
          totalCops += box.cops;
        }
      });
    } else {
      formData.boxDetails.forEach(box => {
        totalNetWeight += parseFloat(box.netWeight) || 0;
        totalCops += parseInt(box.cops) || 0;
      });
    }
    return { totalNetWeight: totalNetWeight.toFixed(2), totalCops };
  };

  const totals = calculateTotals();

  // Handle download single PDF from view
  const handleDownloadPdfFromView = async () => {
    setIsDownloadingPdf(true);
    setError('');
    try {
      const response = await ChallanService.downloadChallan(selectedId);
      let filename = `Challan-${selectedChallan?.challanNumber || selectedId}.pdf`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      fileDownload(response.data, filename);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle download single from download view
  const handleDownloadFromDownload = async (id, number) => {
    setDownloadingFile(id);
    setError('');
    try {
      const response = await ChallanService.downloadChallan(id);
      let filename = `Challan-${number || id}.pdf`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      fileDownload(response.data, filename);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download PDF.');
    } finally {
      setDownloadingFile(null);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterCompany('');
    setFilterStatus('');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
    if (isMobile) setShowFilters(false);
  };

  // Render list view
  const renderListView = () => (
    <>
      <motion.div
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Challan Management
              </h1>
              <p className="text-slate-500 text-xs lg:text-sm font-medium">
                Showing challans from {formatDisplayDate(filterStartDate)} to {formatDisplayDate(filterEndDate)}
              </p>
            </div>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleGoToDownloads}
                className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Generated PDFs</span>
                </div>
              </motion.button>
              <motion.button
                onClick={handleCreateChallan}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Challan</span>
                </div>
              </motion.button>
              <motion.button
                onClick={fetchChallans}
                className="p-2 text-slate-400 hover:text-violet-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg border border-red-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            className="mb-6 p-4 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile && (
        <>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="mb-4 p-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="flex items-center gap-2 text-sm px-4 py-1 bg-white text-slate-700 border border-slate-200 rounded-full font-medium shadow-sm hover:bg-slate-50">
              {showFilters ? <X className="h-5 w-5" /> : <Filter className="h-4 w-4" />}
              <p className="text-gray-500 font-semibold">{showFilters ? 'Hide' : 'Show'} Filters</p>
            </div>
          </motion.button>
          <div className="flex items-center justify-start mb-4 ml-2 gap-3">
            <motion.button
              onClick={handleDownloadExcel}
              className="text-sm px-4 py-1 bg-white text-slate-700 border border-slate-200 rounded-base font-medium shadow-sm hover:bg-slate-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Excel</span>
              </div>
            </motion.button>
            <motion.button
              onClick={handleDownloadPdf}
              className="text-sm px-4 py-1 bg-white text-slate-700 border border-slate-200 rounded-base font-medium shadow-sm hover:bg-slate-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>PDF</span>
              </div>
            </motion.button>
          </div>
        </>
      )}

      {(showFilters || !isMobile) && (
        <motion.div
          className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-800">Filters & Export</h2>
            </div>
            {!isMobile && (
              <div className="flex gap-2">
                <motion.button
                  onClick={handleDownloadExcel}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Excel</span>
                  </div>
                </motion.button>
                <motion.button
                  onClick={handleDownloadPdf}
                  className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>PDF</span>
                  </div>
                </motion.button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {(!isMobile || showFilters) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Date Range</label>
                    <div className="flex items-center gap-2 bg-transparent py-1">
                      <motion.button
                        onClick={() => handleMonthChange('prev')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isLoading}
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </motion.button>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          const lastDay = new Date(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth() + 1,
                            0
                          );
                          setFilterStartDate(e.target.value);
                          setFilterEndDate(formatDateForInput(lastDay));
                        }}
                        className="flex-1 p-1.5 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      />
                      <span className="text-slate-400 text-sm">to</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="flex-1 p-1.5 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      />
                      <motion.button
                        onClick={() => handleMonthChange('next')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isLoading}
                      >
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </motion.button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Company</label>
                      <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        <option value="">All Companies</option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        <option value="">All Statuses</option>
                        <option value="used">Used</option>
                        <option value="unused">Not Used</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                  <motion.button
                    onClick={fetchChallans}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm">Apply Filters</span>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={clearFilters}
                    className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <X className="h-4 w-4" />
                      <span className="text-sm">Reset</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!isLoading && !error && challans.length === 0 && (
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-800">No challans found</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or create a new challan.</p>
          <div className="mt-6">
            <motion.button
              onClick={handleCreateChallan}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Create New Challan</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {challans.length > 0 && (
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Challan Records</h2>
            <motion.button
              onClick={fetchChallans}
              className="p-2 text-slate-400 hover:text-violet-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          {isMobile ? (
            <div className="space-y-4">
              {challans.map((challan, index) => (
                <motion.div
                  key={challan._id}
                  className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex flex-row gap-2">
                      <button
                        onClick={() => handleViewChallan(challan._id)}
                        className="text-sm font-medium text-violet-600 hover:underline"
                      >
                        #{challan.challanNumber}
                      </button>
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(challan.isUsed)} mt-1`}>
                        {challan.isUsed ? 'Used' : 'Not Used'}
                      </span>
                    </div>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleViewChallan(challan._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleEditChallan(challan._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDownloadSinglePdf(challan._id, challan.challanNumber)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={downloadingFile === challan._id}
                        >
                          {downloadingFile === challan._id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteChallan(challan._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{challan.company?.name || challan.companyDetailsSnapshot?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{formatDisplayDate(challan.challanDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Net Wt.:</span>
                      <span>{challan.totalNetWeight?.toFixed(2) || '0.00'} kg</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto max-w-fit">
              <table className="max-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Challan #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cops</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {challans.map((challan, index) => (
                    <motion.tr
                      key={challan._id}
                      className="hover:bg-slate-50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleViewChallan(challan._id)} className="text-violet-600 hover:underline">
                          {challan.challanNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {challan.company?.name || challan.companyDetailsSnapshot?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDisplayDate(challan.challanDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {challan.descriptionOfGoods}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                        {challan.totalNetWeight?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                        {challan.totalCops || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(challan.isUsed)}`}>
                          {challan.isUsed ? 'Used' : 'Not Used'}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={() => handleViewChallan(challan._id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleEditChallan(challan._id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDownloadSinglePdf(challan._id, challan.challanNumber)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={downloadingFile === challan._id}
                            >
                              {downloadingFile === challan._id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteChallan(challan._id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </>
  );

  // Render form modal
  const renderFormModal = () => {
    const pageTitle = formMode === 'create' ? 'Create New Challan' : 'Edit Challan';
    const submitButtonText = formMode === 'create' ? 'Create Challan' : 'Update Challan';

    return (
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800">{pageTitle}</h2>
                <motion.button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-slate-400 hover:text-red-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Challan Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.challanNumber}
                        onChange={(e) => setFormData({ ...formData, challanNumber: e.target.value })}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.challanNumber ? 'border-red-500' : 'border-slate-200'}`}
                      />
                      {formErrors.challanNumber && <p className="mt-1 text-xs text-red-500">{formErrors.challanNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Challan Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.challanDate}
                        onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.challanDate ? 'border-red-500' : 'border-slate-200'}`}
                      />
                      {formErrors.challanDate && <p className="mt-1 text-xs text-red-500">{formErrors.challanDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Company <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.companyId}
                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.companyId ? 'border-red-500' : 'border-slate-200'}`}
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.companyId && <p className="mt-1 text-xs text-red-500">{formErrors.companyId}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Description of Goods <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.descriptionOfGoods}
                        onChange={(e) => setFormData({ ...formData, descriptionOfGoods: e.target.value })}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.descriptionOfGoods ? 'border-red-500' : 'border-slate-200'}`}
                      >
                        <option value="">Select Description</option>
                        {availableDescriptions.map((desc, index) => (
                          <option key={index} value={desc}>
                            {desc}
                          </option>
                        ))}
                      </select>
                      {formErrors.descriptionOfGoods && <p className="mt-1 text-xs text-red-500">{formErrors.descriptionOfGoods}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Broker</label>
                      <select
                        value={formData.broker}
                        onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                        className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      >
                        <option value="direct">Direct</option>
                        <option value="broker1">Broker 1</option>
                        <option value="broker2">Broker 2</option>
                      </select>
                    </div>

                  {formMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Entry Mode:</label>
                      <select
                        value={entryMode}
                        onChange={(e) => setEntryMode(e.target.value)}
                        className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      >
                        <option value="manual">Manual Entry</option>
                        <option value="box">Select from Available Boxes</option>
                      </select>
                    </div>
                  )}

                  </div>


                  {(formMode === 'edit' || entryMode === 'manual') ? (
                    <div className="border border-slate-200 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-slate-700">Box Details</h4>
                      {formData.boxDetails.map((box, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={box.boxNumber}
                              onChange={(e) => handleBoxChange(index, 'boxNumber', e.target.value)}
                              placeholder="Box Number *"
                              className={`w-full p-2 border rounded-lg text-black ${formErrors[`boxNumber_${index}`] ? 'border-red-500' : 'border-slate-200'}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={box.netWeight}
                              onChange={(e) => handleBoxChange(index, 'netWeight', e.target.value)}
                              placeholder="Net Weight *"
                              step="0.01"
                              className={`w-full p-2 border rounded-lg text-black ${formErrors[`netWeight_${index}`] ? 'border-red-500' : 'border-slate-200'}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={box.cops}
                              onChange={(e) => handleBoxChange(index, 'cops', e.target.value)}
                              placeholder="Cops *"
                              step="1"
                              className={`w-full p-2 border rounded-lg text-black ${formErrors[`cops_${index}`] ? 'border-red-500' : 'border-slate-200'}`}
                            />
                          </div>
                          {formData.boxDetails.length > 1 && (
                            <div className="col-span-2">
                              <button
                                type="button"
                                onClick={() => removeBox(index)}
                                className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4 mx-auto" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addBox}
                        className="text-violet-600 text-sm hover:underline"
                      >
                        + Add Box
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-slate-700">Select Boxes</h4>
                      {formErrors.selectedBoxes && <p className="text-xs text-red-500 mb-2">{formErrors.selectedBoxes}</p>}
                      {isLoadingBoxes ? (
                        <div className="text-center py-4">Loading available boxes...</div>
                      ) : availableBoxes.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-2 py-2 text-left">Select</th>
                                <th className="px-2 py-2 text-left">Box No.</th>
                                <th className="px-2 py-2 text-left">Weight</th>
                                <th className="px-2 py-2 text-left">Cops</th>
                                <th className="px-2 py-2 text-left">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {availableBoxes.map(box => (
                                <tr key={box._id} className="border-b border-slate-100">
                                  <td className="px-2 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedBoxes.includes(box._id)}
                                      onChange={() => toggleBoxSelection(box._id)}
                                      className="rounded"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-black">{box.boxNumber}</td>
                                  <td className="px-2 py-2 text-black">{box.netWeight.toFixed(2)}</td>
                                  <td className="px-2 py-2 text-black">{box.cops}</td>
                                  <td className="px-2 py-2 text-black">{box.grade || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">No available boxes for selected description.</div>
                      )}
                    </div>
                  )}

                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Summary</h4>
                    <div className="space-y-1 text-sm text-black">
                      <p>Total Boxes: {formMode === 'create' && entryMode === 'box' ? selectedBoxes.length : formData.boxDetails.length}</p>
                      <p>Total Net Weight: {totals.totalNetWeight} kg</p>
                      <p>Total Cops: {totals.totalCops}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg hover:from-violet-700 hover:to-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : submitButtonText}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render view modal
  const renderViewModal = () => {
    if (!isViewOpen || !selectedChallan) return null;

    const { companyDetailsSnapshot: company, boxDetails = [] } = selectedChallan;
    const withCops = selectedChallan.withCops !== undefined ? selectedChallan.withCops : true;

    return (
      <AnimatePresence>
        {isViewOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Challan Details: {selectedChallan.challanNumber}</h2>
                <motion.button
                  onClick={() => { setIsViewOpen(false); setSelectedChallan(null); }}
                  className="p-2 text-slate-400 hover:text-red-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Company</h3>
                    <p className="text-sm text-slate-800 font-medium">{company?.name || 'N/A'}</p>
                    <p className="text-sm text-slate-600">{company?.address || 'N/A'}</p>
                    <p className="text-sm text-slate-600">GSTIN: {company?.gstNumber || 'N/A'}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-slate-600"><span className="font-medium">Date:</span> {formatDisplayDate(selectedChallan.challanDate)}</p>
                    <p className="text-sm text-slate-600"><span className="font-medium">Broker:</span> {selectedChallan.broker || 'Direct'}</p>
                    <p className="text-sm text-slate-600"><span className="font-medium">Type:</span> {withCops ? 'With Cops' : 'Without Cops'}</p>
                    <p className="text-sm font-semibold mt-1">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs border ${getStatusColor(selectedChallan.isUsed)}`}>
                        {selectedChallan.isUsed ? 'Used' : 'Not Used'}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Description:</h3>
                  <p className="text-sm text-slate-800">{selectedChallan.descriptionOfGoods}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Box Details:</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Box Number</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Net Weight (kg)</th>
                          {withCops && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Cops</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {boxDetails.map((box, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-slate-700">{box.boxNumber}</td>
                            <td className="px-4 py-2 text-sm text-slate-500 text-right">{box.netWeight?.toFixed(2) || '0.00'}</td>
                            {withCops && (
                              <td className="px-4 py-2 text-sm text-slate-700 text-right">{box.cops}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600"><strong>Created By:</strong> {selectedChallan.createdBy?.username || 'System'}</p>
                    <p className="text-sm text-slate-600"><strong>Created At:</strong> {formatDisplayDate(selectedChallan.createdAt)}</p>
                  </div>
                  <div className="text-sm text-black">
                    <p>Total Boxes: {boxDetails.length}</p>
                    <p>Total Net Weight: {selectedChallan.totalNetWeight?.toFixed(2) || '0.00'} kg</p>
                    {withCops && <p>Total Cops: {selectedChallan.totalCops || '0'}</p>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <motion.button
                    onClick={() => { setIsViewOpen(false); handleEditChallan(selectedId); }}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={handleDownloadPdfFromView}
                    disabled={isDownloadingPdf}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      {isDownloadingPdf ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span>{isDownloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render download view
  const renderDownloadView = () => (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">Generated Challan Documents</h1>
        <button onClick={() => setView('list')} className="text-violet-600 hover:text-violet-800">
          ← Back to Challan List
        </button>
      </div>

      {error && (
        <motion.p
          className="text-center text-red-500 mb-6 p-4 bg-red-50 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : challansWithFiles.length === 0 ? (
        <div className="text-center py-12 bg-white shadow-lg rounded-xl">
          <p className="text-slate-500 text-lg mb-2">No generated challan documents found.</p>
          <p className="text-slate-400">PDF files will appear here once generated from the challan view page.</p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Challan #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {challansWithFiles.map((challan, index) => (
                <motion.tr
                  key={challan._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="px-4 py-4 text-sm font-medium">
                    <button onClick={() => handleViewChallan(challan._id)} className="text-violet-600 hover:text-violet-800">
                      {challan.challanNumber}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{challan.company?.name || challan.companyDetailsSnapshot?.name || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDisplayDate(challan.challanDate)}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-lg border ${getStatusColor(challan.isUsed)}`}>
                      {challan.isUsed ? 'Used' : 'Not Used'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDownloadFromDownload(challan._id, challan.challanNumber)}
                      disabled={downloadingFile === challan._id}
                      className="px-3 py-1 text-xs text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      {downloadingFile === challan._id ? 'Downloading...' : 'PDF'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'list' && renderListView()}
        {view === 'download' && renderDownloadView()}
        {renderFormModal()}
        {renderViewModal()}

        {isMobile && view === 'list' && (
          <motion.button
            onClick={handleCreateChallan}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default ChallanListPage;
