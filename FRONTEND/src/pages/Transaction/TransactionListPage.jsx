import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeIcon, PencilIcon, TrashIcon, XMarkIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  Filter,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import TransactionService from '../../services/TransactionService';
import CompanyService from '../../services/CompanyService';
import WorkerService from '../../services/WorkerService';
import DashboardService from '../../services/DashboardService';
import BillService from '../../services/BillService';
import PurchaseService from '../../services/PurchaseService';
import InterestNoteService from '../../services/InterestNoteService';

const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const TransactionListPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [topTransactions, setTopTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [overallSummary, setOverallSummary] = useState(null);
  const [filteredPeriodSummary, setFilteredPeriodSummary] = useState({ filteredTotalIn: 0, filteredTotalOut: 0 });
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterWorkerId, setFilterWorkerId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Other'];
  const categories = [
    { value: 'BillPayment', label: 'Bill Payment' },
    { value: 'PurchasePayment', label: 'Purchase Payment' },
    { value: 'Salary', label: 'Salary' },
    { value: 'MiscellaneousIncome', label: 'Misc. Income' },
    { value: 'MiscellaneousExpense', label: 'Misc. Expense' },
    { value: 'Other', label: 'Other' }
  ];

  const formCategories = [
    { value: 'BillPayment', label: 'Bill Payment (Receipt)' },
    { value: 'PurchasePayment', label: 'Purchase Payment (Made)' },
    { value: 'InterestNotePayment', label: 'Interest Note Payment' },
    { value: 'Salary', label: 'Salary Payment' },
    { value: 'MiscellaneousIncome', label: 'Miscellaneous Income' },
    { value: 'MiscellaneousExpense', label: 'Miscellaneous Expense' },
    { value: 'Other', label: 'Other Transaction' }
  ];

  const [formData, setFormData] = useState({
    paymentDate: getTodayDate(), type: 'IN', category: 'BillPayment', companyId: '', workerId: '',
    relatedBillIds: [], relatedPurchaseIds: [], relatedInterestNoteIds: [], amount: '', paymentMethod: 'Cash',
    referenceNumber: '', description: '', notes: '',
  });
  const [pendingBills, setPendingBills] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [pendingInterestNotes, setPendingInterestNotes] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Indices for mobile carousels
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowFilters(true);
      } else {
        setShowFilters(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset index when transactions change
  useEffect(() => {
    setCurrentTransactionIndex(0);
  }, [transactions]);

  // Helper function to format dates for input fields (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set initial date filters to current month (proper boundaries)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingSummary(true);
      try {
        const [companyRes, workerRes, overallSummaryRes] = await Promise.all([
          CompanyService.getAllCompanies(),
          WorkerService.getAllWorkers(),
          DashboardService.getAccountSummary()
        ]);
        setCompanies(companyRes.data);
        setWorkers(workerRes.data);
        setOverallSummary(overallSummaryRes.data);
      } catch (error) {
          console.error('Failed to load initial page data', error);
          setError("Failed to load initial page data.");
        }
      setIsLoadingSummary(false);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (showFormDrawer && companies.length === 0) {
      CompanyService.getAllCompanies().then(res => setCompanies(res.data)).catch(() => {});
      WorkerService.getAllWorkers().then(res => setWorkers(res.data)).catch(() => {});
    }
  }, [showFormDrawer]);

  const handleMonthChange = (direction) => {
    const currentDate = new Date(filterStartDate);
    let newYear = currentDate.getFullYear();
    let newMonth = currentDate.getMonth();

    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
    }

    const newFirstDay = new Date(newYear, newMonth, 1);
    const newLastDay = new Date(newYear, newMonth + 1, 0);

    setFilterStartDate(formatDateForInput(newFirstDay));
    setFilterEndDate(formatDateForInput(newLastDay));
  };

  const fetchTransactionsAndPeriodSummary = useCallback(async () => {
    if (!filterStartDate || !filterEndDate) return;
    setIsLoading(true);
    setError('');
    const params = {};
    if (filterCompanyId) params.companyId = filterCompanyId;
    if (filterWorkerId) params.workerId = filterWorkerId;
    if (filterCategory) params.category = filterCategory;
    if (filterType) params.type = filterType;
    if (filterPaymentMethod) params.paymentMethod = filterPaymentMethod;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;

    try {
      const [transactionsResponse, periodSummaryResponse] = await Promise.all([
        TransactionService.getAllTransactions(params),
        TransactionService.getFilteredSummary(params)
      ]);
      setTransactions(transactionsResponse.data);
      setFilteredPeriodSummary(periodSummaryResponse.data);
      console.log('Filtered Period Summary:', periodSummaryResponse.data);

      // Calculate top 10 transactions for the selected month
      const selectedMonthTransactions = transactionsResponse.data
        .filter(t => new Date(t.paymentDate).getMonth() === new Date(filterStartDate).getMonth())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
      setTopTransactions(selectedMonthTransactions);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch transaction data.';
      setError(errMsg);
      setFilteredPeriodSummary({ filteredTotalIn: 0, filteredTotalOut: 0 });
      setTopTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterCompanyId, filterWorkerId, filterCategory, filterType, filterPaymentMethod, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchTransactionsAndPeriodSummary();
  }, [fetchTransactionsAndPeriodSummary]);

  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction? This will attempt to reverse linked payments on bills/purchases notes.')) {
      setIsLoading(true);
      try {
        await TransactionService.deleteTransaction(transactionId);
        setTransactions(prevTransactions => prevTransactions.filter(t => t._id !== transactionId));
        setTopTransactions(prevTop => prevTop.filter(t => t._id !== transactionId));
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete transaction.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleViewTransaction = (transactionId) => {
    const transaction = transactions.find(t => t._id === transactionId) || topTransactions.find(t => t._id === transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setIsModalOpen(true);
    }
  };

  const handleEditTransaction = (transactionId) => {
    const transaction = transactions.find(t => t._id === transactionId) || topTransactions.find(t => t._id === transactionId);
    if (transaction) {
      setFormMode('edit');
      setEditingTransaction(transaction);
      setFormData({
        paymentDate: transaction.paymentDate ? new Date(transaction.paymentDate).toISOString().split('T')[0] : '',
        type: transaction.type || 'IN',
        category: transaction.category || 'Other',
        companyId: transaction.company?._id || transaction.company || '',
        workerId: transaction.worker?._id || transaction.worker || '',
        relatedBillIds: [],
        relatedPurchaseIds: [],
        relatedInterestNoteIds: [],
        amount: transaction.amount?.toString() || '',
        paymentMethod: transaction.paymentMethod || 'Cash',
        referenceNumber: transaction.referenceNumber || '',
        description: transaction.description || '',
        notes: transaction.notes || '',
      });
      setFormErrors({});
      setPendingBills([]);
      setPendingPurchases([]);
      setPendingInterestNotes([]);
      setShowFormDrawer(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const closeFormDrawer = () => {
    setShowFormDrawer(false);
    setEditingTransaction(null);
  };

  const handleFormSuccess = () => {
    closeFormDrawer();
    fetchTransactionsAndPeriodSummary();
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (showFormDrawer) closeFormDrawer();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen, showFormDrawer]);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingTransaction(null);
    setFormData({
      paymentDate: getTodayDate(), type: 'IN', category: 'BillPayment', companyId: '', workerId: '',
      relatedBillIds: [], relatedPurchaseIds: [], relatedInterestNoteIds: [], amount: '', paymentMethod: 'Cash',
      referenceNumber: '', description: '', notes: '',
    });
    setFormErrors({});
    setPendingBills([]);
    setPendingPurchases([]);
    setPendingInterestNotes([]);
    setShowFormDrawer(true);
    if (companies.length === 0) {
      CompanyService.getAllCompanies().then(res => setCompanies(res.data)).catch(() => {});
      WorkerService.getAllWorkers().then(res => setWorkers(res.data)).catch(() => {});
    }
  };

  const openEditForm = (transactionId) => {
    const transaction = transactions.find(t => t._id === transactionId) || topTransactions.find(t => t._id === transactionId);
    if (!transaction) return;
    setFormMode('edit');
    setEditingTransaction(transaction);
    setFormData({
      paymentDate: transaction.paymentDate ? new Date(transaction.paymentDate).toISOString().split('T')[0] : '',
      type: transaction.type || 'IN',
      category: transaction.category || 'Other',
      companyId: transaction.company?._id || transaction.company || '',
      workerId: transaction.worker?._id || transaction.worker || '',
      relatedBillIds: [],
      relatedPurchaseIds: [],
      relatedInterestNoteIds: [],
      amount: transaction.amount?.toString() || '',
      paymentMethod: transaction.paymentMethod || 'Cash',
      referenceNumber: transaction.referenceNumber || '',
      description: transaction.description || '',
      notes: transaction.notes || '',
    });
    setFormErrors({});
    setPendingBills([]);
    setPendingPurchases([]);
    setPendingInterestNotes([]);
    setShowFormDrawer(true);
    if (companies.length === 0) {
      CompanyService.getAllCompanies().then(res => setCompanies(res.data)).catch(() => {});
      WorkerService.getAllWorkers().then(res => setWorkers(res.data)).catch(() => {});
    }
  };

  const fetchPendingDocuments = useCallback(async () => {
    if (!formData.companyId ||
        (formData.category !== 'BillPayment' && formData.category !== 'PurchasePayment' && formData.category !== 'InterestNotePayment')) {
      setPendingBills([]);
      setPendingPurchases([]);
      setPendingInterestNotes([]);
      return;
    }
    try {
      if (formData.category === 'BillPayment' && formData.type === 'IN') {
        const billResponse = await BillService.getAllBills();
        setPendingBills(billResponse.data.filter(b =>
          b.company?._id === formData.companyId && (b.status === 'Pending' || b.status === 'Partially Paid')
        ));
        setPendingPurchases([]);
        setPendingInterestNotes([]);
      } else if (formData.category === 'PurchasePayment' && formData.type === 'OUT') {
        const purchaseResponse = await PurchaseService.getAllPurchases();
        setPendingPurchases(purchaseResponse.data.filter(p =>
          p.supplierCompany?._id === formData.companyId && (p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Partially Paid')
        ));
        setPendingBills([]);
        setPendingInterestNotes([]);
      } else if (formData.category === 'InterestNotePayment' && formData.type === 'IN') {
        const noteResponse = await InterestNoteService.getAllInterestNotes();
        setPendingInterestNotes(noteResponse.data.filter(n =>
          n.company?._id === formData.companyId && (n.status === 'Pending' || n.status === 'Partially Paid')
        ));
        setPendingBills([]);
        setPendingPurchases([]);
      } else {
        setPendingBills([]);
        setPendingPurchases([]);
        setPendingInterestNotes([]);
      }
    } catch (err) {
      console.error("Failed to fetch pending documents:", err);
      setError("Could not load pending bills/purchases/notes for the selected company.");
    }
  }, [formData.companyId, formData.type, formData.category]);

  useEffect(() => { fetchPendingDocuments(); }, [fetchPendingDocuments]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      if (name === 'category') {
        if (value === 'BillPayment' || value === 'MiscellaneousIncome' || value === 'InterestNotePayment') {
          newState.type = 'IN';
        } else if (value === 'PurchasePayment' || value === 'Salary' || value === 'MiscellaneousExpense') {
          newState.type = 'OUT';
        }
        newState.relatedBillIds = [];
        newState.relatedPurchaseIds = [];
        newState.relatedInterestNoteIds = [];
        newState.companyId = (value === 'BillPayment' || value === 'PurchasePayment' || value === 'InterestNotePayment') ? prev.companyId : '';
        newState.workerId = (value === 'Salary') ? prev.workerId : '';
      }
      if (name === 'companyId' || name === 'type') {
        newState.relatedBillIds = [];
        newState.relatedPurchaseIds = [];
        newState.relatedInterestNoteIds = [];
      }
      if (name === 'category' && value !== 'Salary') {
        newState.workerId = '';
      }
      if (name === 'category' && value !== 'BillPayment' && value !== 'PurchasePayment' && value !== 'InterestNotePayment') {
        newState.companyId = '';
        newState.relatedBillIds = [];
        newState.relatedPurchaseIds = [];
        newState.relatedInterestNoteIds = [];
      }
      return newState;
    });
  };

  const handleMultiSelectChange = (e, fieldName) => {
    const values = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, [fieldName]: values }));
    if (values.length > 0) {
      let calculatedAmount = 0;
      let docNumbers = [];
      if (fieldName === 'relatedBillIds' && pendingBills.length > 0) {
        values.forEach(billId => {
          const bill = pendingBills.find(b => b._id === billId);
          if (bill) { calculatedAmount += (bill.totalAmount - (bill.totalPaidAmount || 0)); docNumbers.push(bill.billNumber); }
        });
        if (docNumbers.length > 0) setFormData(prev => ({ ...prev, description: `Payment received for Bill(s): ${docNumbers.join(', ')}` }));
      } else if (fieldName === 'relatedPurchaseIds' && pendingPurchases.length > 0) {
        values.forEach(purchaseId => {
          const purchase = pendingPurchases.find(p => p._id === purchaseId);
          if (purchase) { calculatedAmount += (purchase.amount - (purchase.totalPaidAmount || 0)); docNumbers.push(purchase.purchaseBillNumber); }
        });
        if (docNumbers.length > 0) setFormData(prev => ({ ...prev, description: `Payment made for Purchase(s): ${docNumbers.join(', ')}` }));
      } else if (fieldName === 'relatedInterestNoteIds' && pendingInterestNotes.length > 0) {
        values.forEach(noteId => {
          const note = pendingInterestNotes.find(n => n._id === noteId);
          if (note) { calculatedAmount += (note.totalAmount - (note.totalPaidAmount || 0)); docNumbers.push(note.interestNoteNumber); }
        });
        if (docNumbers.length > 0) setFormData(prev => ({ ...prev, description: `Interest Note Payment received: ${docNumbers.join(', ')}` }));
      }
      setFormData(prev => ({ ...prev, amount: calculatedAmount > 0 ? calculatedAmount.toFixed(2) : '' }));
    } else {
      setFormData(prev => ({ ...prev, amount: '', description: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.paymentDate) errors.paymentDate = 'Payment date is required.';
    if (!formData.type) errors.type = 'Transaction type is required.';
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) errors.amount = 'Valid transaction amount is required.';
    if (!formData.paymentMethod) errors.paymentMethod = 'Payment method is required.';
    if (!formData.description.trim()) errors.description = 'Description is required.';
    if (!formData.category) errors.category = 'Category is required.';
    if (formData.category === 'Salary' && !formData.workerId) errors.workerId = 'Worker is required for salary payments.';
    if ((formData.category === 'BillPayment' || formData.category === 'PurchasePayment' || formData.category === 'InterestNotePayment') && !formData.companyId) {
      errors.companyId = 'Company is required for this category.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { setError("Please correct the errors in the form."); return; }
    setError('');
    setIsLoading(true);
    const submissionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      companyId: formData.companyId || null,
      workerId: formData.workerId || null,
      category: formData.category,
      relatedBillIds: formData.category === 'BillPayment' && formData.type === 'IN' ? formData.relatedBillIds.filter(id => id) : [],
      relatedPurchaseIds: formData.category === 'PurchasePayment' && formData.type === 'OUT' ? formData.relatedPurchaseIds.filter(id => id) : [],
      relatedInterestNoteIds: formData.category === 'InterestNotePayment' && formData.type === 'IN' ? formData.relatedInterestNoteIds.filter(id => id) : [],
    };
    try {
      if (formMode === 'create') {
        await TransactionService.createTransaction(submissionData);
      } else {
        await TransactionService.updateTransaction(editingTransaction._id, {
          notes: submissionData.notes,
          referenceNumber: submissionData.referenceNumber,
          description: submissionData.description,
          paymentDate: submissionData.paymentDate,
          paymentMethod: submissionData.paymentMethod,
        });
      }
      handleFormSuccess();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || (formMode === 'create' ? 'Failed to add transaction.' : 'Failed to update transaction.');
      setError(errMsg);
    } finally { setIsLoading(false); }
  };

  const handleFormReset = () => {
    setFormData({
      paymentDate: getTodayDate(), type: 'IN', category: 'BillPayment', companyId: '', workerId: '',
      relatedBillIds: [], relatedPurchaseIds: [], relatedInterestNoteIds: [], amount: '', paymentMethod: 'Cash',
      referenceNumber: '', description: '', notes: '',
    });
    setPendingBills([]);
    setPendingPurchases([]);
    setPendingInterestNotes([]);
    setFormErrors({});
    setError('');
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const clearFilters = () => {
    setFilterCompanyId('');
    setFilterWorkerId('');
    setFilterCategory('');
    setFilterType('');
    setFilterPaymentMethod('');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
    if (isMobile) setShowFilters(false);
  };

  // Export functions
  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const params = buildExportParams();
      await TransactionService.exportToExcel(params, `transactions_${filterStartDate}_to_${filterEndDate}`);
    } catch (err) {
      setExportError(err.message || 'Failed to export to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const params = buildExportParams();
      await TransactionService.exportToPDF(params, `transactions_${filterStartDate}_to_${filterEndDate}`);
    } catch (err) {
      setExportError(err.message || 'Failed to export to PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const buildExportParams = () => {
    const params = {};
    if (filterCompanyId) params.companyId = filterCompanyId;
    if (filterWorkerId) params.workerId = filterWorkerId;
    if (filterCategory) params.category = filterCategory;
    if (filterType) params.type = filterType;
    if (filterPaymentMethod) params.paymentMethod = filterPaymentMethod;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;
    return params;
  };

  // Helper function to get related documents string
  const getRelatedDocuments = (transaction) => {
    const relatedDocs = [];
    
    if (transaction.relatedBills && transaction.relatedBills.length > 0) {
      transaction.relatedBills.forEach(bill => {
        if (bill.billNumber) relatedDocs.push(`Bill: ${bill.billNumber}`);
      });
    }
    
    if (transaction.relatedPurchases && transaction.relatedPurchases.length > 0) {
      transaction.relatedPurchases.forEach(purchase => {
        if (purchase.purchaseBillNumber) relatedDocs.push(`Purchase: ${purchase.purchaseBillNumber}`);
      });
    }
    
    return relatedDocs.length > 0 ? relatedDocs.join(', ') : 'None';
  };

// Local StatCard component (styled like CompanyPage) - Updated for mobile
const StatCard = ({ title, value, icon, gradient = 'from-slate-500 to-slate-600', bgGradient = 'from-slate-50 to-slate-100', loading }) => (
  <motion.div
    className={`relative p-6 bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg border border-slate-200/50 overflow-hidden group ${isMobile ? 'p-4 min-w-[80%] snap-center' : ''}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    whileHover={{ y: isMobile ? 0 : -2 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    <div className={`relative z-10 ${isMobile ? 'text-center' : 'flex items-start justify-between'}`}>
      {!isMobile && (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg`}>{icon}</div>
        </div>
      )}
      <div className={isMobile ? '' : 'ml-auto text-right'}>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        {loading ? (
          <p className="text-gray-400 text-sm mt-1">Loading...</p>
        ) : (
          <p className={`font-bold text-slate-800 mt-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>INR {value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
        )}
      </div>
    </div>
  </motion.div>
);

  if ((isLoading || isLoadingSummary) && transactions.length === 0) {
    return (
      <motion.div
        className="container mx-auto p-8 text-center text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        Loading data...
      </motion.div>
    );
  }

  const renderFormModal = () => (
    <motion.div className="fixed inset-0 flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFormDrawer} />
      <motion.div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.3 }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 backdrop-blur-md bg-white/90 border-b border-gray-200/50 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg">
                {formMode === 'create' ? (
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>
                ) : (
                  <PencilIcon className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent">{formMode === 'create' ? 'Add New Transaction' : 'Edit Transaction'}</h2>
                <p className="text-sm text-gray-500 font-medium">{formMode === 'create' ? 'Enter the details for your new transaction' : 'Update transaction details'}</p>
              </div>
            </div>
            <button onClick={closeFormDrawer} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><XMarkIcon className="h-6 w-6 text-gray-500" /></button>
          </div>
        </div>

        <div className="relative px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Transaction Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <motion.div
              className={`relative p-4 rounded-2xl cursor-pointer group transition-all duration-300 ${formData.type === 'IN' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500 shadow-lg' : 'bg-white hover:bg-emerald-50/50 border-2 border-transparent hover:border-emerald-200'}`}
              onClick={() => handleFormChange({ target: { name: 'type', value: 'IN' } })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-all duration-300 ${formData.type === 'IN' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg' : 'bg-emerald-100 group-hover:bg-emerald-200'}`}>
                  <svg className={`h-6 w-6 ${formData.type === 'IN' ? 'text-white' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                </div>
                <div>
                  <p className={`font-semibold ${formData.type === 'IN' ? 'text-emerald-700' : 'text-gray-700'}`}>Money IN</p>
                  <p className={`text-sm ${formData.type === 'IN' ? 'text-emerald-600' : 'text-gray-500'}`}>Receiving payment</p>
                </div>
              </div>
              {formData.type === 'IN' && (
                <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                  <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              className={`relative p-4 rounded-2xl cursor-pointer group transition-all duration-300 ${formData.type === 'OUT' ? 'bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-500 shadow-lg' : 'bg-white hover:bg-rose-50/50 border-2 border-transparent hover:border-rose-200'}`}
              onClick={() => handleFormChange({ target: { name: 'type', value: 'OUT' } })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-all duration-300 ${formData.type === 'OUT' ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg' : 'bg-rose-100 group-hover:bg-rose-200'}`}>
                  <svg className={`h-6 w-6 ${formData.type === 'OUT' ? 'text-white' : 'text-rose-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                </div>
                <div>
                  <p className={`font-semibold ${formData.type === 'OUT' ? 'text-rose-700' : 'text-gray-700'}`}>Money OUT</p>
                  <p className={`text-sm ${formData.type === 'OUT' ? 'text-rose-600' : 'text-gray-500'}`}>Making payment</p>
                </div>
              </div>
              {formData.type === 'OUT' && (
                <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                  <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </motion.div>
              )}
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (<motion.div className="mb-6 p-4 bg-red-50/50 backdrop-blur-sm border border-red-200 rounded-2xl text-red-700 flex items-center gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>{error}</motion.div>)}
          </AnimatePresence>

          <motion.form onSubmit={handleFormSubmit} className="bg-white/80 backdrop-blur-sm space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-6">
                {/* Payment Date */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleFormChange} className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border ${formErrors.paymentDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`} />
                  </div>
                  {formErrors.paymentDate && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.paymentDate}</p>)}
                </motion.div>

                {/* Category */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="category" value={formData.category} onChange={handleFormChange} className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border appearance-none ${formErrors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`}>
                      {formCategories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></div>
                  </div>
                  {formErrors.category && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.category}</p>)}
                </motion.div>

                {/* Amount */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Amount <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><span className="text-gray-500">₹</span></div>
                    <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} step="0.01" placeholder="0.00" className={`block w-full pl-8 pr-4 py-3 rounded-xl text-gray-900 bg-white/50 border ${formErrors.amount ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`} />
                  </div>
                  {formErrors.amount && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.amount}</p>)}
                </motion.div>

                {/* Company (Conditional) */}
                {(formData.category === 'BillPayment' || formData.category === 'PurchasePayment' || formData.category === 'InterestNotePayment') && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.5 }} className="lg:col-span-1">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Select Company <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select name="companyId" value={formData.companyId} onChange={handleFormChange} className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border appearance-none ${formErrors.companyId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`}>
                        <option value="">Choose a company</option>
                        {companies.map(comp => (<option key={comp._id} value={comp._id}>{comp.name}</option>))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></div>
                    </div>
                    {formErrors.companyId && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.companyId}</p>)}
                  </motion.div>
                )}

                {/* Worker (Conditional for Salary) */}
                {formData.category === 'Salary' && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.6 }} className="lg:col-span-1">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Select Worker <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select name="workerId" value={formData.workerId} onChange={handleFormChange} className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border appearance-none ${formErrors.workerId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`}>
                        <option value="">Choose a worker</option>
                        {workers.map(work => (<option key={work._id} value={work._id}>{work.name}</option>))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></div>
                    </div>
                    {formErrors.workerId && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.workerId}</p>)}
                  </motion.div>
                )}

                {/* Payment Method */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.7 }}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleFormChange} className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border appearance-none ${formErrors.paymentMethod ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`}>
                      {paymentMethods.map(method => (<option key={method} value={method}>{method}</option>))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></div>
                  </div>
                  {formErrors.paymentMethod && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.paymentMethod}</p>)}
                </motion.div>

                {/* Reference Number */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.8 }}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reference Number (Optional)</label>
                  <div className="relative">
                    <input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleFormChange} placeholder="Enter reference number" className={`block w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 bg-white/50 border ${formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`} />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg></div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Related Bills (if category is BillPayment, type is IN and company selected) */}
            {formData.category === 'BillPayment' && formData.type === 'IN' && formData.companyId && pendingBills.length > 0 && (
              <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.9 }}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Link Sales Bills</label>
                <p className="text-sm text-gray-500 mb-3">Select the bills this payment covers. The amount will be automatically calculated to fully cover the selected bills.</p>
                <div className="bg-white/50 border border-gray-200 rounded-xl overflow-hidden">
                  <select multiple name="relatedBillIds" value={formData.relatedBillIds} onChange={(e) => handleMultiSelectChange(e, 'relatedBillIds')} className="w-full h-48 border-0 focus:ring-0 text-sm p-0">
                    {pendingBills.map(bill => (
                      <option key={bill._id} value={bill._id} className={`p-3 border-b border-gray-100 hover:bg-emerald-50/50 ${formData.relatedBillIds.includes(bill._id) ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700'}`}>
                        Bill #{bill.billNumber} - Due Amount: ₹{(bill.totalAmount - (bill.totalPaidAmount || 0)).toFixed(2)}
                        <span className="text-gray-500 text-xs ml-2">(Dated: {new Date(bill.billDate).toLocaleDateString()})</span>
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Related Purchases (if category is PurchasePayment, type is OUT and company selected) */}
            {formData.category === 'PurchasePayment' && formData.type === 'OUT' && formData.companyId && pendingPurchases.length > 0 && (
              <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.0 }}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Link Purchase Bills</label>
                <p className="text-sm text-gray-500 mb-3">Select the purchase bills this payment covers. The amount will be automatically calculated.</p>
                <div className="bg-white/50 border border-gray-200 rounded-xl overflow-hidden">
                  <select multiple name="relatedPurchaseIds" value={formData.relatedPurchaseIds} onChange={(e) => handleMultiSelectChange(e, 'relatedPurchaseIds')} className="w-full h-48 border-0 focus:ring-0 text-sm p-0">
                    {pendingPurchases.map(purchase => (
                      <option key={purchase._id} value={purchase._id} className={`p-3 border-b border-gray-100 hover:bg-rose-50/50 ${formData.relatedPurchaseIds.includes(purchase._id) ? 'bg-rose-50 text-rose-900' : 'text-gray-700'}`}>
                        Purchase #{purchase.purchaseBillNumber} - Due Amount: ₹{(purchase.amount - (purchase.totalPaidAmount || 0)).toFixed(2)}
                        <span className="text-gray-500 text-xs ml-2">(Dated: {new Date(purchase.purchaseBillDate).toLocaleDateString()})</span>
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Related Interest Notes (if category is InterestNotePayment, type is IN and company selected) */}
            {formData.category === 'InterestNotePayment' && formData.type === 'IN' && formData.companyId && pendingInterestNotes.length > 0 && (
              <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.0 }}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Link Interest Notes</label>
                <p className="text-sm text-gray-500 mb-3">Select the interest notes this payment covers. The amount will be automatically calculated.</p>
                <div className="bg-white/50 border border-gray-200 rounded-xl overflow-hidden">
                  <select multiple name="relatedInterestNoteIds" value={formData.relatedInterestNoteIds} onChange={(e) => handleMultiSelectChange(e, 'relatedInterestNoteIds')} className="w-full h-48 border-0 focus:ring-0 text-sm p-0">
                    {pendingInterestNotes.map(note => (
                      <option key={note._id} value={note._id} className={`p-3 border-b border-gray-100 hover:bg-amber-50/50 ${formData.relatedInterestNoteIds.includes(note._id) ? 'bg-amber-50 text-amber-900' : 'text-gray-700'}`}>
                        Interest Note #{note.interestNoteNumber} - Due Amount: ₹{(note.totalAmount - (note.totalPaidAmount || 0)).toFixed(2)}
                        <span className="text-gray-500 text-xs ml-2">(Dated: {new Date(note.interestNoteDate).toLocaleDateString()})</span>
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Message when no pending documents found */}
            {(formData.category === 'BillPayment' && formData.type === 'IN' && formData.companyId && pendingBills.length === 0) && (
              <motion.div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm text-yellow-700 flex items-center gap-2"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>No pending or partially paid bills found for this company.</p>
              </motion.div>
            )}

            {(formData.category === 'PurchasePayment' && formData.type === 'OUT' && formData.companyId && pendingPurchases.length === 0) && (
              <motion.div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm text-yellow-700 flex items-center gap-2"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>No unpaid or partially paid purchase bills found for this company.</p>
              </motion.div>
            )}

            {/* Description and Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.2 }}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Transaction Description <span className="text-red-500">*</span></label>
                <input type="text" name="description" value={formData.description} onChange={handleFormChange} placeholder="Enter transaction details" className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border ${formErrors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`} />
                {formErrors.description && (<p className="mt-2 text-sm text-red-600 flex items-center gap-1"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>{formErrors.description}</p>)}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.3 }}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Additional Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleFormChange} rows="1" placeholder="Add any additional notes or remarks..." className={`block w-full px-4 py-3 rounded-xl text-gray-900 bg-white/50 border ${formData.type === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' : formData.type === 'OUT' ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} shadow-sm transition-all duration-200 focus:ring-2 focus:ring-opacity-50`}></textarea>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <motion.div className="flex flex-col sm:flex-row justify-end gap-3 mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 1.4 }}>
              <motion.button type="button" onClick={handleFormReset} disabled={isLoading} className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${formData.type === 'IN' ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'} w-full sm:w-auto flex items-center justify-center gap-2`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset Form
              </motion.button>
              <motion.button type="submit" disabled={isLoading} className={`px-6 py-3 text-sm font-medium text-white rounded-xl shadow-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${formData.type === 'IN' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700'} w-full sm:w-auto flex items-center justify-center gap-2`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {isLoading ? (
                  <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{formMode === 'create' ? 'Adding...' : 'Updating...'}</>
                ) : (
                  <>{formMode === 'create' ? (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>) : (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>)}{formMode === 'create' ? 'Add Transaction' : 'Update Transaction'}</>
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </motion.div>
  );

  // Mobile View Renderer
  const renderMobileView = () => {
    const summaryItems = [
      {
        title: "Balance",
        value: filteredPeriodSummary?.filteredTotalIn - filteredPeriodSummary?.filteredTotalOut,
        gradient: "from-slate-500 to-slate-600",
        bgGradient: "from-slate-50 to-slate-100",
      },
      {
        title: "Total IN",
        value: filteredPeriodSummary?.filteredTotalIn,
        gradient: "from-emerald-500 to-emerald-600",
        bgGradient: "from-emerald-50 to-emerald-100",
      },
      {
        title: "Total OUT",
        value: filteredPeriodSummary?.filteredTotalOut,
        gradient: "from-rose-500 to-rose-600",
        bgGradient: "from-rose-50 to-rose-100",
      }
    ];

    return (
      <>
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl">
                <ArrowDownTrayIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <motion.h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent" initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}>
                  Transaction Management
                </motion.h1>
                <p className="text-slate-500 text-xs font-medium">Manage transactions</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-xl font-semibold text-xs transition-all duration-200 ${
                showFilters
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-white text-slate-700 hover:bg-slate-50 shadow-md border border-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {showFilters ? (
                <>
                  <X className="h-4 w-4 mr-2 inline" />
                  Hide Filters
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-4 w-4 mr-2 inline" />
                  Filters
                </>
              )}
            </motion.button>

            {isMobile && (
              <>
                      <motion.button
                        onClick={openCreateForm}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        <Plus className="h-6 w-6" />
                      </motion.button>

                      <motion.button
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Excel</span>
                  </motion.button>

                  <motion.button
                    onClick={handleExportPDF}
                    className="px-3 py-2 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">PDF</span>
                  </motion.button>
                      </>
                    )}

            
          </div>
        </div>

        {/* Export Error Display */}
        <AnimatePresence>
          {exportError && (
            <motion.div
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-1 rounded-full bg-red-100">
                <X className="h-4 w-4" />
              </div>
              Export Error: {exportError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Section */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-50 rounded-xl">
                    <Filter className="h-5 w-5 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Filters</h2>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Action Buttons Mobile */}
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    onClick={fetchTransactionsAndPeriodSummary}
                    className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="text-xs">Apply</span>
                  </motion.button>

                  <motion.button
                    onClick={clearFilters}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" />
                    <span className="text-xs">Clear</span>
                  </motion.button>
                </div>

                {/* Date Range */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={() => handleMonthChange("prev")}
                      disabled={isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </motion.button>

                    <div className="flex space-x-2 flex-1">
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white w-full"
                      />
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white w-full"
                      />
                    </div>

                    <motion.button
                      onClick={() => handleMonthChange("next")}
                      disabled={isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </motion.button>
                  </div>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-2 gap-4'>
                {/* Type Filter */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-2 py-2.5 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="IN">IN (Received)</option>
                    <option value="OUT">OUT (Paid)</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2 py-2.5 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Company Filter */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                  <select
                    value={filterCompanyId}
                    onChange={(e) => setFilterCompanyId(e.target.value)}
                    className="w-full px-2 py-2.5 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Companies</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Worker Filter */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Worker</label>
                  <select
                    value={filterWorkerId}
                    onChange={(e) => setFilterWorkerId(e.target.value)}
                    className="w-full px-2 py-2.5 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Workers</option>
                    {workers.map((worker) => (
                      <option key={worker._id} value={worker._id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={filterPaymentMethod}
                    onChange={(e) => setFilterPaymentMethod(e.target.value)}
                    className="w-full px-2 py-2.5 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Methods</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards - Simple Grid for Mobile */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {summaryItems.map((item, idx) => (
            <StatCard
              key={idx}
              title={item.title}
              value={item.value}
              gradient={item.gradient}
              bgGradient={item.bgGradient}
              loading={isLoading}
            />
          ))}
        </div>

        {/* Transaction Cards with Navigation */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-6">
          <div className="px-2 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 uppercase">Transactions</h3>
              <p className="text-xs text-slate-500">{currentTransactionIndex + 1} of {transactions.length || 0}</p>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="relative">
              <motion.div
                key={transactions[currentTransactionIndex]._id}
                className="bg-white/80 backdrop-blur-sm rounded-xl border p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">
                      {transactions[currentTransactionIndex].company?.name || transactions[currentTransactionIndex].worker?.name || 'N/A'}
                    </h3>
                    <p className="text-xs text-slate-500">{transactions[currentTransactionIndex].category}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                      transactions[currentTransactionIndex].type === 'IN'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {transactions[currentTransactionIndex].type}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-slate-600 mb-3">
                  <p><b>Date:</b> {formatDisplayDate(transactions[currentTransactionIndex].paymentDate)}</p>
                  <p><b>Amount:</b> ₹{transactions[currentTransactionIndex].amount?.toFixed(2)}</p>
                  <p><b>Method:</b> {transactions[currentTransactionIndex].paymentMethod}</p>
                  <p><b>Description:</b> {transactions[currentTransactionIndex].description || '-'}</p>
                  <p><b>Related Docs:</b> {getRelatedDocuments(transactions[currentTransactionIndex])}</p>
                </div>

                <div className="flex justify-between gap-2">
                  <motion.button
                    onClick={() => handleViewTransaction(transactions[currentTransactionIndex]._id)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 text-sm"
                    whileTap={{ scale: 0.95 }}
                  >
                    <EyeIcon className="h-4 w-4" /> View
                  </motion.button>
                  <motion.button
                    onClick={() => handleEditTransaction(transactions[currentTransactionIndex]._id)}
                    className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1 text-sm"
                    whileTap={{ scale: 0.95 }}
                  >
                    <PencilIcon className="h-4 w-4" /> Edit
                  </motion.button>
                  <motion.button
                    onClick={() => handleDeleteTransaction(transactions[currentTransactionIndex]._id)}
                    className="flex-1 px-3 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 transition-colors flex items-center justify-center gap-1 text-sm"
                    whileTap={{ scale: 0.95 }}
                  >
                    <TrashIcon className="h-4 w-4" /> Delete
                  </motion.button>
                </div>
              </motion.div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-4 px-2">
                <motion.button
                  onClick={() => setCurrentTransactionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentTransactionIndex === 0}
                  className={`p-2 rounded-lg ${
                    currentTransactionIndex === 0
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  } transition-colors`}
                  whileHover={currentTransactionIndex !== 0 ? { scale: 1.05 } : {}}
                  whileTap={currentTransactionIndex !== 0 ? { scale: 0.95 } : {}}
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, transactions.length))].map((_, i) => {
                    const pageIndex = Math.floor(currentTransactionIndex / 5) * 5 + i;
                    if (pageIndex >= transactions.length) return null;
                    return (
                      <motion.button
                        key={pageIndex}
                        onClick={() => setCurrentTransactionIndex(pageIndex)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          currentTransactionIndex === pageIndex
                            ? 'bg-violet-600 scale-125'
                            : 'bg-slate-300 hover:bg-violet-400'
                        }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                      />
                    );
                  })}
                </div>
                <motion.button
                  onClick={() => setCurrentTransactionIndex(prev => 
                    Math.min(transactions.length - 1, prev + 1)
                  )}
                  disabled={currentTransactionIndex === transactions.length - 1}
                  className={`p-2 rounded-lg ${
                    currentTransactionIndex === transactions.length - 1
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  } transition-colors`}
                  whileHover={currentTransactionIndex !== transactions.length - 1 ? { scale: 1.05 } : {}}
                  whileTap={currentTransactionIndex !== transactions.length - 1 ? { scale: 0.95 } : {}}
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No transactions found</p>
          )}
        </div>

        <div className="text-center text-slate-500 text-xs mt-6 pb-6 italic">
          For better experience, open this page on Desktop
        </div>
      </>
    );
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 max-w-7xl mx-auto px-4 lg:px-8 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence>
        {showFormDrawer && renderFormModal()}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && selectedTransaction && (
          <motion.div className="fixed inset-0 flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-indigo-900/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} />
            <motion.div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200/50" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 backdrop-blur-md bg-white/90 border-b border-gray-200/50 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-lg ${selectedTransaction.type === 'IN' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
                      {selectedTransaction.type === 'IN' ? (
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      ) : (
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent">Transaction Details</h2>
                      <p className="text-sm text-gray-500 font-medium">View transaction information</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><XMarkIcon className="h-6 w-6 text-gray-500" /></button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6">
                {/* Amount Badge */}
                <div className={`mb-6 p-4 rounded-2xl ${selectedTransaction.type === 'IN' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${selectedTransaction.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedTransaction.type === 'IN' ? 'Amount Received' : 'Amount Paid'}</p>
                      <p className={`text-3xl font-bold mt-1 ${selectedTransaction.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>₹{selectedTransaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-xl font-bold text-sm ${selectedTransaction.type === 'IN' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                      {selectedTransaction.type === 'IN' ? '↑ IN' : '↓ OUT'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{formatDisplayDate(selectedTransaction.paymentDate)}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{selectedTransaction.category}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{selectedTransaction.paymentMethod}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{selectedTransaction.referenceNumber || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company / Worker</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{selectedTransaction.company?.name || selectedTransaction.worker?.name || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</p>
                    </div>
                    <p className="text-sm text-slate-700">{selectedTransaction.description || 'No description'}</p>
                  </div>
                </div>

                {/* Related Documents */}
                {(selectedTransaction.relatedBills?.length > 0 || selectedTransaction.relatedPurchases?.length > 0) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      Related Documents
                    </h3>
                    <div className="space-y-2">
                      {selectedTransaction.relatedBills?.map((bill, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <div className="p-1.5 bg-emerald-100 rounded-lg"><svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                          <div>
                            <p className="text-sm font-medium text-emerald-800">Bill: {bill.billNumber}</p>
                            <p className="text-xs text-emerald-600">Sales Bill</p>
                          </div>
                        </div>
                      ))}
                      {selectedTransaction.relatedPurchases?.map((purchase, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="p-1.5 bg-blue-100 rounded-lg"><svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                          <div>
                            <p className="text-sm font-medium text-blue-800">Purchase: {purchase.purchaseBillNumber}</p>
                            <p className="text-xs text-blue-600">Purchase Bill</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <h3 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Notes
                    </h3>
                    <p className="text-sm text-amber-700">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={closeModal} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile ? renderMobileView() : (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-8">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl"><ArrowDownTrayIcon className="h-6 w-6 text-white" /></div>
                <div>
                  <motion.h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent" initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}>Transaction Management</motion.h1>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">Manage transactions, reports and adds</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button onClick={openCreateForm} className="group px-3 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <svg className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="text-xs sm:text-base">Add Transaction</span>
              </motion.button>
            </div>
          </div>

          <motion.div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <StatCard title="Overall Current Month Balance" value={filteredPeriodSummary?.filteredTotalIn - filteredPeriodSummary?.filteredTotalOut} icon={<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>} gradient="from-slate-500 to-slate-600" bgGradient="from-slate-50 to-slate-100" loading={isLoadingSummary} />
            <StatCard title="Selected Period: Total IN" value={filteredPeriodSummary?.filteredTotalIn} icon={<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>} gradient="from-emerald-500 to-emerald-600" bgGradient="from-emerald-50 to-emerald-100" loading={isLoading} />
            <StatCard title="Selected Period: Total OUT" value={filteredPeriodSummary?.filteredTotalOut} icon={<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>} gradient="from-rose-500 to-rose-600" bgGradient="from-rose-50 to-rose-100" loading={isLoading} />
          </motion.div>

          <AnimatePresence>
            {exportError && (<motion.div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><p>Export Error: {exportError}</p></motion.div>)}
          </AnimatePresence>

          <AnimatePresence>
            {(showFilters || !isMobile) && (
              <motion.div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-8" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 rounded-xl"><Filter className="h-5 w-5 text-violet-600" /></div>
                    <h2 className="text-lg font-bold text-slate-800">Filters</h2>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-3">
                    <motion.button onClick={fetchTransactionsAndPeriodSummary} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><Filter className="h-4 w-4" /><span>Apply Filters</span></motion.button>
                    <motion.button onClick={clearFilters} className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><X className="h-4 w-4" /><span>Reset</span></motion.button>
                    <motion.button onClick={handleExportExcel} className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2" disabled={isLoading || isExporting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><Download className="h-4 w-4" /><span>Excel</span></motion.button>
                    <motion.button onClick={handleExportPDF} className="px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2" disabled={isLoading || isExporting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><FileText className="h-4 w-4" /><span>PDF</span></motion.button>
                  </div>
                </div>
                <div className="flex md:flex-row flex-col md:items-end items-start gap-4 md:flex-wrap">
                  <div className="md:hidden flex flex-wrap gap-2 md:gap-3">
                    <motion.button onClick={fetchTransactionsAndPeriodSummary} className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><Filter className="h-4 w-4 mr-2" /><span className="text-xs">Apply</span></motion.button>
                    <motion.button onClick={clearFilters} className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><X className="h-4 w-4" /><span className="text-xs">Clear</span></motion.button>
                  </div>
                  <div className="w-full md:flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                    <div className="flex items-center space-x-2">
                      <motion.button onClick={() => handleMonthChange("prev")} className="p-2 md:p-3 rounded-lg md:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors" disabled={isLoading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><ChevronLeft className="h-4 w-4 text-slate-600" /></motion.button>
                      <div className="flex space-x-2 flex-1">
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full" />
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full" />
                      </div>
                      <motion.button onClick={() => handleMonthChange("next")} className="p-2 md:p-3 rounded-lg md:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors" disabled={isLoading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><ChevronRight className="h-4 w-4 text-slate-600" /></motion.button>
                    </div>
                  </div>
                  <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-2 py-2.5 md:px-4 md:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"><option value="">All Types</option><option value="IN">IN (Received)</option><option value="OUT">OUT (Paid)</option></select>
                  </div>
                  <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-2 py-2.5 md:px-4 md:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"><option value="">All Categories</option>{categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}</select>
                  </div>
                  <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                    <select value={filterCompanyId} onChange={(e) => setFilterCompanyId(e.target.value)} className="w-full px-2 py-2.5 md:px-4 md:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"><option value="">All Companies</option>{companies.map((company) => (<option key={company._id} value={company._id}>{company.name}</option>))}</select>
                  </div>
                  <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Worker</label>
                    <select value={filterWorkerId} onChange={(e) => setFilterWorkerId(e.target.value)} className="w-full px-2 py-2.5 md:px-4 md:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"><option value="">All Workers</option>{workers.map((worker) => (<option key={worker._id} value={worker._id}>{worker.name}</option>))}</select>
                  </div>
                  <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                    <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} className="w-full px-2 py-2.5 md:px-4 md:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"><option value="">All Methods</option>{paymentMethods.map((method) => (<option key={method} value={method}>{method}</option>))}</select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && !showFormDrawer && (<motion.p className="text-center text-red-500 mb-6 p-4 bg-red-50 rounded-lg" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>Error: {error}</motion.p>)}
          </AnimatePresence>

          {!isLoading && !error && transactions.length === 0 && (<motion.div className="text-center py-12 bg-white shadow-lg rounded-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}><p className="text-gray-500 text-lg">No transactions found matching your criteria.</p></motion.div>)}

          {transactions.length > 0 && (
            <motion.div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-bold text-slate-800">Transaction Records</h2>
                <p className="text-xs text-slate-500 mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      {/* <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th> */}
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {transactions.map((transaction, index) => (
                      <motion.tr key={transaction._id} className="hover:bg-slate-50/80 transition-colors group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatDisplayDate(transaction.paymentDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${transaction.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {transaction.type === 'IN' ? '↑ IN' : '↓ OUT'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{transaction.category}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 max-w-[250px] truncate" title={transaction.description}>{transaction.description}</td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-w-[180px] truncate">{transaction.company?.name || transaction.worker?.name || '—'}</td> */}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${transaction.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>₹{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{transaction.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <motion.button onClick={() => handleViewTransaction(transaction._id)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View Details" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><EyeIcon className="h-4 w-4" /></motion.button>
                            <motion.button onClick={() => handleEditTransaction(transaction._id)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit Transaction" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><PencilIcon className="h-4 w-4" /></motion.button>
                            <motion.button onClick={() => handleDeleteTransaction(transaction._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" disabled={isLoading} title="Delete Transaction" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><TrashIcon className="h-4 w-4" /></motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default TransactionListPage;