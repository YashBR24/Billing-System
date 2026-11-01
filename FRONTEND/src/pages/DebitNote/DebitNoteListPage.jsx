import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Building2,
  DollarSign,
  TrendingDown,
  BarChart3,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  Package,
} from "lucide-react";
import DebitNoteService from "../../services/DebitNoteService";
import PurchaseService  from "../../services/PurchaseService";
import CompanyService   from "../../services/CompanyService";
import SettingsService  from "../../services/SettingsService";

// ─────────────────────────────────────────────────────────────────────────────
// Return reason options  (must match backend enum)
// ─────────────────────────────────────────────────────────────────────────────
const RETURN_REASONS = [
  "Defective",
  "Wrong Item",
  "Quality Issue",
  "Supplier Request",
  "Other",
];

// ─────────────────────────────────────────────────────────────────────────────
const DebitNoteListPage = () => {
  const [debitNotes,  setDebitNotes]  = useState([]);
  const [companies,   setCompanies]   = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState("");

  // ── List filters ─────────────────────────────────────────────────────────
  const [filterStartDate,    setFilterStartDate]    = useState("");
  const [filterEndDate,      setFilterEndDate]      = useState("");
  const [filterCompany,      setFilterCompany]      = useState("");
  const [filterStatus,       setFilterStatus]       = useState("");
  const [filterFinancialYear,setFilterFinancialYear]= useState("");
  const [isMobile,           setIsMobile]           = useState(window.innerWidth < 768);
  const [showFilters,        setShowFilters]        = useState(false);

  // ── View modal ────────────────────────────────────────────────────────────
  const [selectedDebitNote,  setSelectedDebitNote]  = useState(null);
  const [isViewOpen,         setIsViewOpen]         = useState(false);
  const [isViewLoading,      setIsViewLoading]      = useState(false);
  const [viewError,          setViewError]          = useState("");

  // ── Create modal ──────────────────────────────────────────────────────────
  const [isCreateOpen,          setIsCreateOpen]          = useState(false);
  const [isCreateLoading,       setIsCreateLoading]       = useState(false);
  const [createError,           setCreateError]           = useState("");
  const [createSuccessMessage,  setCreateSuccessMessage]  = useState("");
  const [settings,              setSettings]              = useState(null);

  // Create form – step 1
  const [create_companyId,        setCreateCompanyId]        = useState("");
  const [create_financialYear,    setCreateFinancialYear]    = useState("");
  const [create_fyOptions,        setCreateFyOptions]        = useState([]);

  // Create form – step 2
  const [create_debitNoteNumber,        setCreateDebitNoteNumber]        = useState("");
  const [create_debitNoteNumberLoading, setCreateDebitNoteNumberLoading] = useState(false);
  const [create_debitNoteDate,          setCreateDebitNoteDate]          = useState(
    new Date().toISOString().split("T")[0]
  );
  const [create_purchaseId,       setCreatePurchaseId]       = useState("");
  const [create_unpaidPurchases,  setCreateUnpaidPurchases]  = useState([]);
  const [create_unpaidLoading,    setCreateUnpaidLoading]    = useState(false);

  // Create form – step 3
  const [create_returnReason,      setCreateReturnReason]      = useState("Defective");
  const [create_returnReasonNotes, setCreateReturnReasonNotes] = useState("");
  const [create_items,             setCreateItems]             = useState([]);
  const [createFormErrors,         setCreateFormErrors]        = useState({});

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [isEditOpen,               setIsEditOpen]               = useState(false);
  const [editDebitNoteId,          setEditDebitNoteId]          = useState(null);
  const [isEditLoading,            setIsEditLoading]            = useState(false);
  const [isFetchingEditDebitNote,  setIsFetchingEditDebitNote]  = useState(false);
  const [editError,                setEditError]                = useState("");
  const [editSuccessMessage,       setEditSuccessMessage]       = useState("");
  const [edit_status,              setEditStatus]               = useState("Pending");
  const [edit_stockAdjusted,       setEditStockAdjusted]        = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    CompanyService.getAllCompanies()
      .then((r) => setCompanies(r.data))
      .catch((e) => console.error("Failed to fetch companies:", e));

    setCreateFyOptions(DebitNoteService.getFinancialYearOptions(3));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowFilters(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Default date filter: current month
  useEffect(() => {
    const today = new Date();
    setFilterStartDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)));
    setFilterEndDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Date helpers
  // ─────────────────────────────────────────────────────────────────────────
  const formatDateForInput = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatDisplayDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Colour helpers
  // ─────────────────────────────────────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "processed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":   return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled": return "bg-gray-50 text-gray-600 border-gray-200";
      default:          return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getReasonColor = (reason) => {
    switch (reason?.toLowerCase()) {
      case "defective":        return "bg-rose-50 text-rose-700";
      case "wrong item":       return "bg-orange-50 text-orange-700";
      case "quality issue":    return "bg-amber-50 text-amber-700";
      case "supplier request": return "bg-blue-50 text-blue-700";
      default:                 return "bg-gray-50 text-gray-700";
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PDF download
  // ─────────────────────────────────────────────────────────────────────────
  const handleSinglePdf = async (debitNoteId, debitNoteNumber) => {
    try {
      setIsLoading(true);
      const response = await DebitNoteService.downloadDebitNotePdf(debitNoteId);
      DebitNoteService.triggerDownload(response.data, `DebitNote_${debitNoteNumber}.pdf`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch list
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDebitNotes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const params = {};
    if (filterStartDate)     params.startDate     = filterStartDate;
    if (filterEndDate)       params.endDate       = filterEndDate;
    if (filterCompany)       params.companyId     = filterCompany;
    if (filterStatus)        params.status        = filterStatus;
    if (filterFinancialYear) params.financialYear = filterFinancialYear;

    try {
      const response = await DebitNoteService.getAllDebitNotes(params);
      setDebitNotes(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch debit notes.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterCompany, filterStatus, filterFinancialYear]);

  useEffect(() => {
    if (filterStartDate && filterEndDate) fetchDebitNotes();
  }, [fetchDebitNotes, filterStartDate, filterEndDate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteDebitNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this debit note? This cannot be undone.")) return;
    setIsLoading(true);
    try {
      await DebitNoteService.deleteDebitNote(id);
      setDebitNotes((prev) => prev.filter((dn) => dn._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete debit note.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Month navigation
  // ─────────────────────────────────────────────────────────────────────────
  const handleMonthChange = (direction) => {
    const current = new Date(filterStartDate);
    let y = current.getFullYear();
    let m = current.getMonth();
    if (direction === "prev") { m--; if (m < 0)  { m = 11; y--; } }
    else                      { m++; if (m > 11) { m = 0;  y++; } }
    setFilterStartDate(formatDateForInput(new Date(y, m, 1)));
    setFilterEndDate(formatDateForInput(new Date(y, m + 1, 0)));
  };

  const clearFilters = () => {
    const today = new Date();
    setFilterStartDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)));
    setFilterEndDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    setFilterCompany("");
    setFilterStatus("");
    setFilterFinancialYear("");
    if (isMobile) setShowFilters(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // View modal
  // ─────────────────────────────────────────────────────────────────────────
  const openViewModal = async (id) => {
    setIsViewLoading(true);
    setViewError("");
    setIsViewOpen(true);
    setSelectedDebitNote(null);
    try {
      const res = await DebitNoteService.getDebitNoteById(id);
      setSelectedDebitNote(res.data || res);
    } catch (err) {
      setViewError(err.response?.data?.message || err.message || "Failed to load debit note.");
    } finally {
      setIsViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setIsViewOpen(false);
    setSelectedDebitNote(null);
    setViewError("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Create modal helpers
  // ─────────────────────────────────────────────────────────────────────────
  const openCreateModal = async () => {
    setCreateError("");
    setCreateSuccessMessage("");
    setCreateFormErrors({});
    setCreateCompanyId("");
    setCreateFinancialYear(DebitNoteService.getFinancialYear());
    setCreateDebitNoteNumber("");
    setCreateDebitNoteDate(new Date().toISOString().split("T")[0]);
    setCreatePurchaseId("");
    setCreateUnpaidPurchases([]);
    setCreateReturnReason("Defective");
    setCreateReturnReasonNotes("");
    setCreateItems([]);
    setIsCreateOpen(true);

    try {
      const settingsRes = await SettingsService.getSettings();
      setSettings(settingsRes.data);
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateFormErrors({});
    setCreateError("");
    setCreateSuccessMessage("");
  };

  // Step B: company changes → fetch unpaid purchases + note number
  const handleCompanyChange = async (companyId) => {
    setCreateCompanyId(companyId);
    setCreatePurchaseId("");
    setCreateItems([]);
    setCreateUnpaidPurchases([]);
    setCreateDebitNoteNumber("");
    if (!companyId) return;

    try {
      setCreateUnpaidLoading(true);
      const [purchasesRes] = await Promise.all([
        DebitNoteService.getUnpaidPurchasesByCompany(companyId, create_financialYear),
      ]);
      setCreateUnpaidPurchases(purchasesRes.data);
    } catch (err) {
      console.error("Failed to fetch unpaid purchases:", err);
      setCreateError("Failed to load unpaid purchases for this company.");
    } finally {
      setCreateUnpaidLoading(false);
    }

    await refreshNoteNumber(create_financialYear);
  };

  // Step C: FY changes → refresh purchases (if company chosen) + note number
  const handleFinancialYearChange = async (fy) => {
    setCreateFinancialYear(fy);
    setCreatePurchaseId("");
    setCreateItems([]);
    setCreateDebitNoteNumber("");
    await refreshNoteNumber(fy);

    if (create_companyId) {
      try {
        setCreateUnpaidLoading(true);
        const res = await DebitNoteService.getUnpaidPurchasesByCompany(create_companyId, fy);
        setCreateUnpaidPurchases(res.data);
      } catch (err) {
        console.error("Failed to fetch unpaid purchases:", err);
      } finally {
        setCreateUnpaidLoading(false);
      }
    }
  };

  const refreshNoteNumber = async (fy) => {
    if (!fy) return;
    try {
      setCreateDebitNoteNumberLoading(true);
      const res = await DebitNoteService.getNextDebitNoteNumber(fy);
      setCreateDebitNoteNumber(res.data.debitNoteNumber);
    } catch (err) {
      console.error("Failed to fetch next debit note number:", err);
    } finally {
      setCreateDebitNoteNumberLoading(false);
    }
  };

  // Step D: purchase selected → populate items
  const handlePurchaseSelection = async (purchaseId) => {
    setCreatePurchaseId(purchaseId);
    setCreateItems([]);
    if (!purchaseId) return;

    try {
      const purchaseRes = await PurchaseService.getPurchaseById(purchaseId);
      const purchase    = purchaseRes.data;

      // For structured-item purchases (if items array exists), pre-fill it.
      // For YARN / flat purchases, start with one blank editable row.
      if (purchase.items && Array.isArray(purchase.items) && purchase.items.length > 0) {
        const items = purchase.items.map((item) => ({
          description:  item.description,
          hsnSacCode:   item.hsnSacCode,
          quantity:     item.quantity,
          maxQuantity:  item.quantity,
          rate:         item.rate,
          amount:       parseFloat((item.quantity * item.rate).toFixed(2)),
        }));
        setCreateItems(items);
      } else {
        // YARN / OTHER flat purchase – one blank editable line
        setCreateItems([
          {
            description: purchase.purchaseType === "YARN"
              ? `Yarn ${purchase.denier || ""} ${purchase.grade || ""}`.trim()
              : (purchase.productDescription || ""),
            hsnSacCode:  "",
            quantity:    "",
            maxQuantity: purchase.netWeight || null,
            rate:        purchase.ratePerUnit || "",
            amount:      0,
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load purchase details:", err);
      setCreateError("Failed to load purchase details.");
    }
  };

  const handleCreateItemChange = (index, field, value) => {
    const newItems = [...create_items];
    newItems[index][field] = value;
    if (field === "quantity" || field === "rate") {
      const qty  = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate)     || 0;
      newItems[index].amount = parseFloat((qty * rate).toFixed(2));
    }
    setCreateItems(newItems);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────
  const validateCreateForm = () => {
    const errors = {};
    if (!create_companyId)             errors.companyId        = "Supplier company is required.";
    if (!create_financialYear)         errors.financialYear    = "Financial year is required.";
    if (!create_debitNoteNumber.trim())errors.debitNoteNumber  = "Debit note number is required.";
    if (!create_debitNoteDate)         errors.debitNoteDate    = "Debit note date is required.";
    if (!create_purchaseId)            errors.purchaseId       = "Original purchase bill is required.";
    if (!create_returnReason)          errors.returnReason     = "Return reason is required.";
    if (create_items.length === 0)     errors.items            = "At least one item is required.";

    create_items.forEach((item, index) => {
      if (!String(item.description || "").trim())
        errors[`item_description_${index}`] = "Description is required.";
      if (!String(item.hsnSacCode || "").trim())
        errors[`item_hsn_${index}`] = "HSN/SAC is required.";
      if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0)
        errors[`item_qty_${index}`] = "Valid quantity is required.";
      if (item.maxQuantity !== null && parseFloat(item.quantity) > item.maxQuantity)
        errors[`item_qty_${index}`] = `Quantity cannot exceed ${item.maxQuantity}`;
      if (isNaN(parseFloat(item.rate)) || parseFloat(item.rate) < 0)
        errors[`item_rate_${index}`] = "Valid rate is required.";
    });

    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      setCreateError("Please fix the errors before submitting.");
      return;
    }
    setCreateError("");
    setIsCreateLoading(true);

    const debitNoteData = {
      companyId:         create_companyId,
      financialYear:     create_financialYear,
      debitNoteNumber:   create_debitNoteNumber,
      debitNoteDate:     create_debitNoteDate,
      purchaseId:        create_purchaseId,
      returnReason:      create_returnReason,
      returnReasonNotes: create_returnReasonNotes,
      items: create_items.map((item) => ({
        description: item.description,
        hsnSacCode:  item.hsnSacCode,
        quantity:    parseFloat(item.quantity),
        rate:        parseFloat(item.rate),
        amount:      parseFloat(item.amount),
      })),
    };

    try {
      await DebitNoteService.createDebitNote(debitNoteData);
      setCreateSuccessMessage("Debit note created successfully!");
      await fetchDebitNotes();
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateSuccessMessage("");
      }, 800);
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || "Failed to create debit note.");
    } finally {
      setIsCreateLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Edit modal
  // ─────────────────────────────────────────────────────────────────────────
  const openEditModal = async (id) => {
    setIsEditOpen(true);
    setEditDebitNoteId(id);
    setIsFetchingEditDebitNote(true);
    setEditError("");
    try {
      const res = await DebitNoteService.getDebitNoteById(id);
      const dn  = res.data;
      setEditStatus(dn.status || "Pending");
      setEditStockAdjusted(dn.stockAdjusted || false);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || "Failed to load debit note for editing.");
      setIsEditOpen(false);
    } finally {
      setIsFetchingEditDebitNote(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setIsEditLoading(true);
    try {
      await DebitNoteService.updateDebitNote(editDebitNoteId, {
        status:       edit_status,
        stockAdjusted: edit_stockAdjusted,
      });
      setEditSuccessMessage("Debit note updated successfully!");
      await fetchDebitNotes();
      setTimeout(() => {
        setIsEditOpen(false);
        setEditSuccessMessage("");
      }, 800);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || "Failed to update debit note.");
    } finally {
      setIsEditLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Summary stats
  // ─────────────────────────────────────────────────────────────────────────
  const summaryStats = React.useMemo(() => {
    const totalAmount     = debitNotes.reduce((s, dn) => s + (dn.totalAmount || 0), 0);
    const processedAmount = debitNotes.filter((dn) => dn.status?.toLowerCase() === "processed")
                                      .reduce((s, dn) => s + (dn.totalAmount || 0), 0);
    const pendingAmount   = debitNotes.filter((dn) => dn.status?.toLowerCase() === "pending")
                                      .reduce((s, dn) => s + (dn.totalAmount || 0), 0);
    return { totalAmount, processedAmount, pendingAmount, totalCount: debitNotes.length };
  }, [debitNotes]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading screen
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading && debitNotes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
              <div className="absolute inset-0 h-8 w-8 bg-teal-100 rounded-full animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium">Loading debit notes...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">

        {/* ── Header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Debit Note Management
                </h1>
              </div>
              <p className="text-slate-500 text-sm hidden lg:block">
                Purchase return notes — track supplier debit adjustments
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isMobile && (
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
                  {showFilters
                    ? <><X className="h-4 w-4 mr-2 inline" />Hide Filters</>
                    : <><SlidersHorizontal className="h-4 w-4 mr-2 inline" />Filters</>
                  }
                </motion.button>
              )}

              <button
                type="button"
                onClick={openCreateModal}
                className="hidden lg:flex group px-3 py-2 lg:px-6 lg:py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 items-center"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-xs lg:text-base">Create Debit Note</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Summary Cards ── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { label: "Total Debits",  value: `₹${summaryStats.totalAmount.toFixed(2)}`,     icon: DollarSign,  color: "teal"    },
            { label: "Processed",     value: `₹${summaryStats.processedAmount.toFixed(2)}`, icon: TrendingDown,color: "emerald" },
            { label: "Pending",       value: `₹${summaryStats.pendingAmount.toFixed(2)}`,   icon: BarChart3,   color: "amber"   },
            { label: "Total Count",   value: summaryStats.totalCount,                        icon: Building2,   color: "blue"    },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className={`p-2 lg:p-3 bg-${color}-50 rounded-xl`}>
                  <Icon className={`w-5 h-5 lg:h-6 lg:w-6 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs lg:text-sm font-medium">{label}</p>
                  <p className="text-slate-900 text-lg lg:text-xl font-bold">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Filters ── */}
        <AnimatePresence>
          {(showFilters || !isMobile) && (
            <motion.div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6 mb-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-teal-50 rounded-xl">
                    <Filter className="h-5 w-5 text-teal-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Filters</h2>
                </div>

                <div className="hidden lg:flex flex-wrap gap-2 lg:gap-3">
                  <motion.button
                    onClick={fetchDebitNotes}
                    disabled={isLoading}
                    className="px-3 lg:px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4" /><span>Apply Filters</span>
                  </motion.button>
                  <motion.button
                    onClick={clearFilters}
                    disabled={isLoading}
                    className="px-3 lg:px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" /><span>Reset</span>
                  </motion.button>
                </div>
              </div>

              <div className="flex md:flex-row flex-col md:items-end items-start gap-4 md:flex-wrap">
                {/* Mobile action buttons */}
                <div className="lg:hidden flex flex-wrap gap-2">
                  <motion.button
                    onClick={fetchDebitNotes}
                    disabled={isLoading}
                    className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg flex items-center"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4 mr-2" /><span className="text-xs">Apply</span>
                  </motion.button>
                  <motion.button
                    onClick={clearFilters}
                    disabled={isLoading}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center space-x-2"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" /><span className="text-xs">Clear</span>
                  </motion.button>
                </div>

                {/* Date Range */}
                <div className="w-full md:flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={() => handleMonthChange("prev")}
                      disabled={isLoading}
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </motion.button>
                    <div className="flex space-x-2 flex-1">
                      <input type="date" value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white md:w-40 w-full"
                      />
                      <input type="date" value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white md:w-40 w-full"
                      />
                    </div>
                    <motion.button
                      onClick={() => handleMonthChange("next")}
                      disabled={isLoading}
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </motion.button>
                  </div>
                </div>

                {/* Financial Year */}
                <div className="w-full md:flex-1 md:min-w-[140px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Financial Year</label>
                  <select
                    value={filterFinancialYear}
                    onChange={(e) => setFilterFinancialYear(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Years</option>
                    {DebitNoteService.getFinancialYearOptions(4).map((fy) => (
                      <option key={fy} value={fy}>{fy}</option>
                    ))}
                  </select>
                </div>

                {/* Supplier Company */}
                <div className="w-full md:flex-1 md:min-w-[150px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Supplier</label>
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Suppliers</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="w-full md:flex-1 md:min-w-[150px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processed">Processed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <X className="h-5 w-5 text-rose-600" />
                </div>
                <p className="text-rose-700 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!isLoading && !error && debitNotes.length === 0 && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 bg-gradient-to-r from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-12 w-12 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No debit notes found</h3>
            <p className="text-slate-500 mb-8">
              Try adjusting your filters or create your first debit note to get started.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Debit Note</span>
            </button>
          </motion.div>
        )}

        {/* ── Table / Cards ── */}
        {debitNotes.length > 0 && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isMobile ? (
              /* ── Mobile cards ── */
              <div className="divide-y divide-slate-100">
                {debitNotes.map((dn, index) => (
                  <motion.div
                    key={dn._id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <button
                          onClick={() => openViewModal(dn._id)}
                          className="text-lg font-bold text-teal-600 hover:text-teal-800"
                        >
                          #{dn.debitNoteNumber}
                        </button>
                        {dn.financialYear && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg font-medium">
                            {dn.financialYear}
                          </span>
                        )}
                        <p className="text-slate-500 text-sm">
                          {dn.supplierCompany?.name || dn.supplierDetailsSnapshot?.name || "N/A"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Purchase: #{dn.originalPurchaseBillNumber}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(dn.status)}`}>
                          {dn.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getReasonColor(dn.returnReason)}`}>
                          {dn.returnReason}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-semibold text-slate-800">₹{dn.totalAmount?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date:</span>
                        <span className="text-slate-600">{formatDisplayDate(dn.debitNoteDate)}</span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <motion.button
                        onClick={() => openViewModal(dn._id)}
                        className="flex-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Eye className="h-4 w-4" /><span className="text-sm">View</span>
                      </motion.button>
                      <motion.button
                        onClick={() => openEditModal(dn._id)}
                        className="flex-1 px-2 py-1.5 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors flex items-center justify-center space-x-1"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit3 className="h-4 w-4" /><span className="text-sm">Edit</span>
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteDebitNote(dn._id)}
                        className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleSinglePdf(dn._id, dn.debitNoteNumber)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl font-medium hover:bg-teal-100 transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        <FileText className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── Desktop table ── */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Debit Note #</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase #</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {debitNotes.map((dn, index) => (
                      <motion.tr
                        key={dn._id}
                        className="hover:bg-slate-50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <button
                              onClick={() => openViewModal(dn._id)}
                              className="text-teal-600 hover:text-teal-800 font-semibold"
                            >
                              #{dn.debitNoteNumber}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {dn.supplierCompany?.name || dn.supplierDetailsSnapshot?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          #{dn.originalPurchaseBillNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {formatDisplayDate(dn.debitNoteDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-lg ${getReasonColor(dn.returnReason)}`}>
                            {dn.returnReason}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-slate-800">
                          ₹{dn.totalAmount?.toFixed(2) || "0.00"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(dn.status)}`}>
                            {dn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            <motion.button
                              onClick={() => openViewModal(dn._id)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all"
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => openEditModal(dn._id)}
                              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all"
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteDebitNote(dn._id)}
                              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-all"
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleSinglePdf(dn._id, dn.debitNoteNumber)}
                              disabled={isLoading}
                              className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all"
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Download PDF"
                            >
                              <FileText className="h-4 w-4" />
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

        {/* ── Mobile FAB ── */}
        {isMobile && (
          <motion.div
            className="fixed bottom-6 right-6 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              onClick={openCreateModal}
              className="w-16 h-16 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:shadow-3xl transition-all"
            >
              <Plus className="h-7 w-7" />
            </button>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW MODAL
        ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isViewOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={closeViewModal} />
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto p-6 z-10 overflow-auto max-h-[80vh]"
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Debit Note Details</h3>
                    <p className="text-sm text-slate-500">Preview of selected debit note</p>
                  </div>
                  <button onClick={closeViewModal} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-200 rounded-full p-2" />
                  </button>
                </div>

                {isViewLoading && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                  </div>
                )}

                {viewError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
                    <p className="text-rose-700">{viewError}</p>
                  </div>
                )}

                {selectedDebitNote && (
                  <div className="space-y-4">
                    {/* Row 1: Note number, FY, Purchase number */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Debit Note Number</p>
                        <p className="font-semibold text-slate-800">#{selectedDebitNote.debitNoteNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Financial Year</p>
                        <span className="inline-block px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-lg font-semibold">
                          {selectedDebitNote.financialYear ||
                            DebitNoteService.getFinancialYear(selectedDebitNote.debitNoteDate)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Original Purchase Bill</p>
                        <p className="font-semibold text-slate-800">
                          #{selectedDebitNote.originalPurchaseBillNumber}
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Supplier, Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Supplier Company</p>
                        <p className="font-semibold text-slate-800">
                          {selectedDebitNote.supplierCompany?.name ||
                            selectedDebitNote.supplierDetailsSnapshot?.name || "N/A"}
                        </p>
                        {selectedDebitNote.supplierDetailsSnapshot?.gstNumber && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            GSTIN: {selectedDebitNote.supplierDetailsSnapshot.gstNumber}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Debit Note Date</p>
                        <p className="font-semibold text-slate-800">
                          {formatDisplayDate(selectedDebitNote.debitNoteDate)}
                        </p>
                      </div>
                    </div>

                    {/* Row 3: Status, Reason, Stock Adjusted */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedDebitNote.status)}`}>
                          {selectedDebitNote.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Return Reason</p>
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-lg ${getReasonColor(selectedDebitNote.returnReason)}`}>
                          {selectedDebitNote.returnReason}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Stock Adjusted</p>
                        <p className="font-semibold text-slate-800">
                          {selectedDebitNote.stockAdjusted ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    {/* Return notes */}
                    {selectedDebitNote.returnReasonNotes && (
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <p className="text-xs text-slate-500 mb-1">Return Notes</p>
                        <p className="text-sm text-slate-700">{selectedDebitNote.returnReasonNotes}</p>
                      </div>
                    )}

                    {/* Items table */}
                    <div className="overflow-x-auto border border-slate-300 rounded-xl p-3 bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs">
                            <th className="text-left py-2">Description</th>
                            <th className="text-left py-2">HSN/SAC</th>
                            <th className="text-right py-2">Qty</th>
                            <th className="text-right py-2">Rate</th>
                            <th className="text-right py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDebitNote.items?.map((it, idx) => (
                            <tr key={idx} className="border-t border-slate-200">
                              <td className="py-2 text-slate-700">{it.description}</td>
                              <td className="py-2 text-slate-600">{it.hsnSacCode}</td>
                              <td className="py-2 text-right text-slate-600">{it.quantity}</td>
                              <td className="py-2 text-right text-slate-600">₹{(it.rate || 0).toFixed(2)}</td>
                              <td className="py-2 text-right font-semibold text-slate-800">₹{(it.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        {selectedDebitNote.amountInWords && (
                          <p className="text-sm text-slate-600">
                            Amount in Words:{" "}
                            <span className="font-semibold text-slate-800">{selectedDebitNote.amountInWords}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-slate-700">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{(selectedDebitNote.subTotalAmount || 0).toFixed(2)}</span>
                        </div>
                        {selectedDebitNote.discountAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Discount ({selectedDebitNote.discountPercentage}%):</span>
                            <span>- ₹{(selectedDebitNote.discountAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t border-slate-200 pt-1">
                          <span>After Discount:</span>
                          <span>₹{(selectedDebitNote.amountAfterDiscount || 0).toFixed(2)}</span>
                        </div>
                        {selectedDebitNote.taxType === "CGST_SGST" && (
                          <>
                            <div className="flex justify-between">
                              <span>CGST ({selectedDebitNote.cgstPercentage}%):</span>
                              <span>+ ₹{(selectedDebitNote.cgstAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST ({selectedDebitNote.sgstPercentage}%):</span>
                              <span>+ ₹{(selectedDebitNote.sgstAmount || 0).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {selectedDebitNote.taxType === "IGST" && (
                          <div className="flex justify-between">
                            <span>IGST ({selectedDebitNote.igstPercentage}%):</span>
                            <span>+ ₹{(selectedDebitNote.igstAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedDebitNote.taxType === "JOBCGST_JOBSGST" && (
                          <>
                            <div className="flex justify-between">
                              <span>Job CGST ({selectedDebitNote.jobCgstPercentage}%):</span>
                              <span>+ ₹{(selectedDebitNote.jobCgstAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Job SGST ({selectedDebitNote.jobSgstPercentage}%):</span>
                              <span>+ ₹{(selectedDebitNote.jobSgstAmount || 0).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between font-bold border-t border-slate-300 pt-1 text-slate-800">
                          <span>Total:</span>
                          <span>₹{(selectedDebitNote.totalAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Download PDF */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleSinglePdf(selectedDebitNote._id, selectedDebitNote.debitNoteNumber)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════════
            CREATE MODAL
        ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isCreateOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={closeCreateModal} />
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto p-6 z-10 overflow-auto max-h-[90vh]"
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Create Debit Note</h3>
                    <p className="text-sm text-slate-500">Process a purchase return</p>
                  </div>
                  <button onClick={closeCreateModal} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-200 rounded-full p-2" />
                  </button>
                </div>

                {/* Alerts */}
                {createError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
                    <p className="text-rose-700">{createError}</p>
                  </div>
                )}
                {createSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                    <p className="text-emerald-700">{createSuccessMessage}</p>
                  </div>
                )}
                {Object.keys(createFormErrors || {}).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
                    <p className="font-semibold text-amber-700">Fix the following errors:</p>
                    <ul className="list-disc list-inside text-amber-700">
                      {Object.values(createFormErrors).map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-5">

                  {/* ── STEP 1: Supplier Company + Financial Year ── */}
                  <div className="border border-teal-100 bg-teal-50/40 rounded-xl p-4">
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> Step 1 — Select Supplier &amp; Financial Year
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Supplier */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Supplier Company <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={create_companyId}
                          onChange={(e) => handleCompanyChange(e.target.value)}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.companyId ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        >
                          <option value="">— Select Supplier —</option>
                          {companies.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                        {createFormErrors.companyId && (
                          <p className="text-xs text-rose-600 mt-1">{createFormErrors.companyId}</p>
                        )}
                      </div>

                      {/* Financial Year */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Financial Year <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={create_financialYear}
                          onChange={(e) => handleFinancialYearChange(e.target.value)}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.financialYear ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        >
                          <option value="">— Select FY —</option>
                          {create_fyOptions.map((fy) => (
                            <option key={fy} value={fy}>{fy}</option>
                          ))}
                        </select>
                        {createFormErrors.financialYear && (
                          <p className="text-xs text-rose-600 mt-1">{createFormErrors.financialYear}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── STEP 2: Note Number + Date + Purchase (unlocked after company) ── */}
                  <div className={`rounded-xl p-4 border transition-all ${
                    create_companyId
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-60 pointer-events-none"
                  }`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Step 2 — Note Details &amp; Purchase Selection
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Debit Note Number */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Debit Note Number
                          {create_debitNoteNumberLoading && (
                            <RefreshCw className="inline ml-2 h-3 w-3 animate-spin text-teal-500" />
                          )}
                        </label>
                        <input
                          value={create_debitNoteNumber}
                          onChange={(e) => setCreateDebitNoteNumber(e.target.value)}
                          placeholder={
                            create_debitNoteNumberLoading
                              ? "Generating…"
                              : `e.g. ${create_financialYear || "2025-26"}/DN01`
                          }
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.debitNoteNumber ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        />
                        {createFormErrors.debitNoteNumber && (
                          <p className="text-xs text-rose-600 mt-1">{createFormErrors.debitNoteNumber}</p>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Debit Note Date
                        </label>
                        <input
                          type="date"
                          value={create_debitNoteDate}
                          onChange={(e) => setCreateDebitNoteDate(e.target.value)}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.debitNoteDate ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        />
                      </div>

                      {/* Unpaid Purchase dropdown */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Unpaid Purchase Bill <span className="text-rose-500">*</span>
                          {create_unpaidLoading && (
                            <RefreshCw className="inline ml-2 h-3 w-3 animate-spin text-teal-500" />
                          )}
                        </label>
                        <select
                          value={create_purchaseId}
                          onChange={(e) => handlePurchaseSelection(e.target.value)}
                          disabled={!create_companyId || create_unpaidLoading}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.purchaseId ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        >
                          <option value="">
                            {!create_companyId
                              ? "Select supplier first"
                              : create_unpaidLoading
                              ? "Loading…"
                              : create_unpaidPurchases.length === 0
                              ? "No unpaid purchases found"
                              : "— Select Purchase Bill —"}
                          </option>
                          {create_unpaidPurchases.map((p) => (
                            <option key={p._id} value={p._id}>
                              #{p.purchaseBillNumber} — {formatDisplayDate(p.purchaseBillDate)} — ₹{p.amount?.toFixed(2)} [{p.paymentStatus}]
                            </option>
                          ))}
                        </select>
                        {createFormErrors.purchaseId && (
                          <p className="text-xs text-rose-600 mt-1">{createFormErrors.purchaseId}</p>
                        )}
                        {create_companyId && !create_unpaidLoading && create_unpaidPurchases.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No unpaid/partially-paid purchases found for this supplier &amp; financial year.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── STEP 3: Return info + items (unlocked after purchase selected) ── */}
                  <div className={`rounded-xl p-4 border transition-all ${
                    create_purchaseId
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-60 pointer-events-none"
                  }`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Step 3 — Return Details
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Return Reason <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={create_returnReason}
                          onChange={(e) => setCreateReturnReason(e.target.value)}
                          className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                        >
                          {RETURN_REASONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                        Return Notes (Optional)
                      </label>
                      <textarea
                        value={create_returnReasonNotes}
                        onChange={(e) => setCreateReturnReasonNotes(e.target.value)}
                        rows="2"
                        className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                        placeholder="Additional details about the return..."
                      />
                    </div>

                    {/* Items table */}
                    {create_items.length > 0 && (
                      <div className="border border-gray-200 p-3 rounded-lg">
                        <h4 className="text-sm text-gray-700 font-semibold mb-2">
                          Return Items — Adjust Quantities
                        </h4>

                        {/* Column headers */}
                        <div className="hidden lg:grid lg:grid-cols-6 gap-2 mb-1 px-1">
                          {["Description", "HSN/SAC", "Qty", "Rate", "Amount", ""].map((h) => (
                            <p key={h} className={`text-xs text-gray-500 font-medium ${h === "Amount" || h === "" ? "text-right" : ""} ${h === "Description" ? "col-span-2" : ""}`}>{h}</p>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {create_items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center">
                              {/* Description */}
                              <div className="lg:col-span-2">
                                <input
                                  value={item.description}
                                  onChange={(e) => handleCreateItemChange(idx, "description", e.target.value)}
                                  className={`w-full text-black p-2 border rounded-lg text-sm ${
                                    createFormErrors[`item_description_${idx}`]
                                      ? "border-rose-400 bg-rose-50"
                                      : "border-gray-200"
                                  }`}
                                  placeholder="Description"
                                />
                              </div>
                              {/* HSN */}
                              <div>
                                <input
                                  value={item.hsnSacCode}
                                  onChange={(e) => handleCreateItemChange(idx, "hsnSacCode", e.target.value)}
                                  className={`w-full text-black p-2 border rounded-lg text-sm ${
                                    createFormErrors[`item_hsn_${idx}`]
                                      ? "border-rose-400 bg-rose-50"
                                      : "border-gray-200"
                                  }`}
                                  placeholder="HSN/SAC"
                                />
                              </div>
                              {/* Qty */}
                              <div>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleCreateItemChange(idx, "quantity", e.target.value)}
                                  max={item.maxQuantity || undefined}
                                  min="0"
                                  step="0.01"
                                  placeholder={item.maxQuantity ? `Max: ${item.maxQuantity}` : "Qty"}
                                  className={`w-full text-black p-2 border rounded-lg text-sm ${
                                    createFormErrors[`item_qty_${idx}`]
                                      ? "border-rose-400 bg-rose-50"
                                      : "border-gray-200"
                                  }`}
                                />
                                {createFormErrors[`item_qty_${idx}`] && (
                                  <p className="text-xs text-rose-600 mt-0.5">{createFormErrors[`item_qty_${idx}`]}</p>
                                )}
                              </div>
                              {/* Rate */}
                              <div>
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => handleCreateItemChange(idx, "rate", e.target.value)}
                                  min="0"
                                  step="0.01"
                                  placeholder="Rate"
                                  className="w-full text-black p-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                              {/* Amount */}
                              <div className="text-sm text-black font-semibold text-right">
                                ₹{(item.amount || 0).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Item total row */}
                        <div className="flex justify-end mt-3 pt-2 border-t border-gray-200">
                          <p className="text-sm font-bold text-slate-800">
                            Items Total: ₹{create_items.reduce((s, it) => s + (it.amount || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {createFormErrors.items && (
                      <p className="text-xs text-rose-600 mt-1">{createFormErrors.items}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreateLoading || !create_companyId || !create_purchaseId}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      {isCreateLoading ? "Creating…" : "Create Debit Note"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════════
            EDIT MODAL
        ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isEditOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditOpen(false)} />
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-6 z-10 overflow-auto max-h-[80vh]"
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Edit Debit Note</h3>
                    <p className="text-sm text-slate-500">Update status and stock adjustment</p>
                  </div>
                  <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-200 rounded-full p-2" />
                  </button>
                </div>

                {isFetchingEditDebitNote && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                  </div>
                )}

                {editError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
                    <p className="text-rose-700">{editError}</p>
                  </div>
                )}

                {editSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                    <p className="text-emerald-700">{editSuccessMessage}</p>
                  </div>
                )}

                {!isFetchingEditDebitNote && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={edit_status}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processed">Processed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="editStockAdjusted"
                        checked={edit_stockAdjusted}
                        onChange={(e) => setEditStockAdjusted(e.target.checked)}
                        className="h-4 w-4 text-teal-600 border-gray-300 rounded"
                      />
                      <label htmlFor="editStockAdjusted" className="text-sm font-medium text-gray-700">
                        Stock Adjusted
                      </label>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                      <p className="text-xs text-teal-700">
                        <strong>Note:</strong> Check "Stock Adjusted" when the returned items have been
                        removed from purchase stock. This is typically done when status is changed to "Processed".
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isEditLoading}
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg disabled:opacity-50"
                      >
                        {isEditLoading ? "Updating…" : "Update Debit Note"}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default DebitNoteListPage;