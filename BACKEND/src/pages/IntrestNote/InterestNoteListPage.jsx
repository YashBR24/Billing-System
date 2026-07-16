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
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  Clock,
  Percent,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import InterestNoteService from "../../services/InterestNoteService";
import CompanyService from "../../services/CompanyService";

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatDisplayDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "paid":      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":   return "bg-amber-50 text-amber-700 border-amber-200";
    case "cancelled": return "bg-gray-50 text-gray-600 border-gray-200";
    default:          return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

// ─── main component ───────────────────────────────────────────────────────────

const InterestNoteListPage = () => {
  const [interestNotes, setInterestNotes]   = useState([]);
  const [companies, setCompanies]           = useState([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState("");
  const [isMobile, setIsMobile]             = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters]       = useState(false);

  // ── List filters ──────────────────────────────────────────────────────────
  const [filterStartDate, setFilterStartDate]         = useState("");
  const [filterEndDate, setFilterEndDate]             = useState("");
  const [filterCompany, setFilterCompany]             = useState("");
  const [filterStatus, setFilterStatus]               = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");

  // ── View modal ────────────────────────────────────────────────────────────
  const [selectedNote, setSelectedNote]   = useState(null);
  const [isViewOpen, setIsViewOpen]       = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [viewError, setViewError]         = useState("");

  // ── Create modal ──────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen]             = useState(false);
  const [isCreateLoading, setIsCreateLoading]       = useState(false);
  const [createError, setCreateError]               = useState("");
  const [createSuccessMessage, setCreateSuccessMessage] = useState("");
  const [createFormErrors, setCreateFormErrors]     = useState({});

  // Create form – step 1
  const [create_companyId, setCreateCompanyId]         = useState("");

  // Create form – step 2
  const [create_interestNoteNumber, setCreateInterestNoteNumber]           = useState("");
  const [create_interestNoteNumberLoading, setCreateInterestNoteNumberLoading] = useState(false);
  const [create_interestNoteDate, setCreateInterestNoteDate]               = useState(new Date().toISOString().split("T")[0]);
  const [create_billId, setCreateBillId]                                   = useState("");
  const [create_lateBills, setCreateLateBills]                             = useState([]);
  const [create_lateBillsLoading, setCreateLateBillsLoading]               = useState(false);
  const [create_filterFY, setCreateFilterFY]                             = useState("");

  // Create form – step 3 (interest rate + preview)
  const [create_monthlyRate, setCreateMonthlyRate]       = useState("");
  const [create_selectedBill, setCreateSelectedBill]     = useState(null);
  const [create_taxType, setCreateTaxType]               = useState("CGST_SGST");
  const [create_cgstPct, setCreateCgstPct]               = useState("9");
  const [create_sgstPct, setCreateSgstPct]               = useState("9");
  const [create_igstPct, setCreateIgstPct]               = useState("18");
  const [create_jobCgstPct, setCreateJobCgstPct]         = useState("9");
  const [create_jobSgstPct, setCreateJobSgstPct]         = useState("9");

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen]                         = useState(false);
  const [editNoteId, setEditNoteId]                         = useState(null);
  const [isEditLoading, setIsEditLoading]                   = useState(false);
  const [isFetchingEdit, setIsFetchingEdit]                 = useState(false);
  const [editError, setEditError]                           = useState("");
  const [editSuccessMessage, setEditSuccessMessage]         = useState("");
  const [edit_status, setEditStatus]                        = useState("Pending");

  // ── Bootstrap ─────────────────────────────────────────────────────────────
useEffect(() => {
  CompanyService.getAllCompanies()
    .then((r) => {
      const filteredCompanies = r.data.filter(
        (company) =>
          company.companyType === "Seller" ||
          company.companyType === "Both"
      );

      setCompanies(filteredCompanies);
    })
    .catch((e) => console.error("Failed to fetch companies:", e));

  setCreateFilterFY(getCurrentFY());
}, []);

  const getFYFromDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const month = d.getMonth();
    const year = d.getFullYear();
    if (month >= 3) return `${year}-${String(year + 1).slice(-2)}`;
    return `${year - 1}-${String(year).slice(-2)}`;
  };

  const getCurrentFY = () => {
    const d = new Date();
    const month = d.getMonth();
    const year = d.getFullYear();
    if (month >= 3) return `${year}-${String(year + 1).slice(-2)}`;
    return `${year - 1}-${String(year).slice(-2)}`;
  };

  const buildFYOptions = (yearsBack = 4, yearsForward = 1) => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = -yearsBack; i <= yearsForward; i++) {
      const y = currentYear + i;
      const fy = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
      options.push(fy);
    }
    return options;
  };

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowFilters(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Default date filter = current month ───────────────────────────────────
  useEffect(() => {
    const today = new Date();
    setFilterStartDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)));
    setFilterEndDate(formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  }, []);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const params = {};
    if (filterStartDate)    params.startDate     = filterStartDate;
    if (filterEndDate)      params.endDate       = filterEndDate;
    if (filterCompany)      params.companyId     = filterCompany;
    if (filterStatus)       params.status        = filterStatus;
    if (filterFinancialYear) params.financialYear = filterFinancialYear;
    try {
      const res = await InterestNoteService.getAllInterestNotes(params);
      setInterestNotes(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch interest notes.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterCompany, filterStatus, filterFinancialYear]);

  useEffect(() => {
    if (filterStartDate && filterEndDate) fetchNotes();
  }, [fetchNotes, filterStartDate, filterEndDate]);

  // ── Month nav ─────────────────────────────────────────────────────────────
  const handleMonthChange = (dir) => {
    const d = new Date(filterStartDate);
    let y = d.getFullYear(), m = d.getMonth();
    if (dir === "prev") { m--; if (m < 0)  { m = 11; y--; } }
    else                { m++; if (m > 11) { m = 0;  y++; } }
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

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handleDownloadPdf = async (id, noteNumber) => {
    try {
      setIsLoading(true);
      const res = await InterestNoteService.downloadInterestNotePdf(id);
      InterestNoteService.triggerDownload(res.data, `InterestNote_${noteNumber}.pdf`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this interest note? This cannot be undone.")) return;
    setIsLoading(true);
    try {
      await InterestNoteService.deleteInterestNote(id);
      setInterestNotes((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete interest note.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── View modal ─────────────────────────────────────────────────────────────
  const openViewModal = async (id) => {
    setIsViewOpen(true);
    setIsViewLoading(true);
    setViewError("");
    setSelectedNote(null);
    try {
      const res = await InterestNoteService.getInterestNoteById(id);
      setSelectedNote(res.data);
    } catch (err) {
      setViewError(err.response?.data?.message || "Failed to load interest note.");
    } finally {
      setIsViewLoading(false);
    }
  };

  const closeViewModal = () => { setIsViewOpen(false); setSelectedNote(null); setViewError(""); };

  // ── Create modal ───────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setCreateError("");
    setCreateSuccessMessage("");
    setCreateFormErrors({});
    setCreateCompanyId("");
    setCreateInterestNoteNumber("");
    setCreateInterestNoteDate(new Date().toISOString().split("T")[0]);
    setCreateBillId("");
    setCreateLateBills([]);
    setCreateSelectedBill(null);
    setCreateMonthlyRate("");
    setCreateTaxType("CGST_SGST");
    setCreateCgstPct("9");
    setCreateSgstPct("9");
    setCreateIgstPct("18");
    setCreateJobCgstPct("9");
    setCreateJobSgstPct("9");
    setCreateFilterFY(getCurrentFY());
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateFormErrors({});
    setCreateError("");
    setCreateSuccessMessage("");
  };

  const refreshNoteNumber = async (fy) => {
    if (!fy) return;
    try {
      setCreateInterestNoteNumberLoading(true);
      const res = await InterestNoteService.getNextInterestNoteNumber(fy);
      setCreateInterestNoteNumber(res.data.interestNoteNumber);
    } catch (err) {
      console.error("Failed to fetch next interest note number:", err);
    } finally {
      setCreateInterestNoteNumberLoading(false);
    }
  };

  // Step B: company changes → fetch late bills + refresh note number
  const handleCompanyChange = async (companyId) => {
    setCreateCompanyId(companyId);
    setCreateBillId("");
    setCreateSelectedBill(null);
    setCreateLateBills([]);
    setCreateInterestNoteNumber("");
    if (!companyId) return;
    try {
      setCreateLateBillsLoading(true);
      const res = await InterestNoteService.getLatePaidBillsByCompany(companyId, create_filterFY);
      setCreateLateBills(res.data);
    } catch (err) {
      console.error("Failed to fetch late bills:", err);
      setCreateError("Failed to load late-paid bills for this company.");
    } finally {
      setCreateLateBillsLoading(false);
    }
    const fy = getFYFromDate(create_interestNoteDate);
    await refreshNoteNumber(fy);
  };

  const handleBillSelection = (billId) => {
    setCreateBillId(billId);
    const found = create_lateBills.find((b) => b._id === billId);
    setCreateSelectedBill(found || null);
  };

  // Live interest preview
  const interestPreview = React.useMemo(() => {
    if (!create_selectedBill || !create_monthlyRate) return null;
    const rate = parseFloat(create_monthlyRate);
    if (isNaN(rate) || rate <= 0) return null;
    return InterestNoteService.calcInterestPreview(
      create_selectedBill.totalAmount,
      rate,
      create_selectedBill.lateDays
    );
  }, [create_selectedBill, create_monthlyRate]);

  // Validation
  const validateCreateForm = () => {
    const errs = {};
    if (!create_companyId)            errs.companyId           = "Company is required.";
    if (!create_interestNoteNumber.trim()) errs.interestNoteNumber = "Interest note number is required.";
    if (!create_interestNoteDate)     errs.interestNoteDate    = "Date is required.";
    if (!create_billId)               errs.billId              = "Please select a late-paid bill.";
    if (!create_monthlyRate || parseFloat(create_monthlyRate) <= 0)
      errs.monthlyRate = "Monthly interest rate must be greater than 0.";
    setCreateFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      setCreateError("Please fix the errors before submitting.");
      return;
    }
    setCreateError("");
    setIsCreateLoading(true);
    const payload = {
      companyId:          create_companyId,
      billId:             create_billId,
      interestNoteNumber: create_interestNoteNumber,
      interestNoteDate:   create_interestNoteDate,
      monthlyInterestRate: parseFloat(create_monthlyRate),
      taxType:            create_taxType,
      cgstPercentage:     parseFloat(create_cgstPct)    || 0,
      sgstPercentage:     parseFloat(create_sgstPct)    || 0,
      igstPercentage:     parseFloat(create_igstPct)    || 0,
      jobCgstPercentage:  parseFloat(create_jobCgstPct) || 0,
      jobSgstPercentage:  parseFloat(create_jobSgstPct) || 0,
    };
    try {
      await InterestNoteService.createInterestNote(payload);
      setCreateSuccessMessage("Interest note created successfully!");
      await fetchNotes();
      setTimeout(() => { setIsCreateOpen(false); setCreateSuccessMessage(""); }, 800);
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || "Failed to create interest note.");
    } finally {
      setIsCreateLoading(false);
    }
  };

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const openEditModal = async (id) => {
    setIsEditOpen(true);
    setEditNoteId(id);
    setIsFetchingEdit(true);
    setEditError("");
    try {
      const res = await InterestNoteService.getInterestNoteById(id);
      setEditStatus(res.data.status || "Pending");
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to load interest note for editing.");
      setIsEditOpen(false);
    } finally {
      setIsFetchingEdit(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setIsEditLoading(true);
    try {
      await InterestNoteService.updateInterestNote(editNoteId, { status: edit_status });
      setEditSuccessMessage("Interest note updated successfully!");
      await fetchNotes();
      setTimeout(() => { setIsEditOpen(false); setEditSuccessMessage(""); }, 800);
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update interest note.");
    } finally {
      setIsEditLoading(false);
    }
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const summaryStats = React.useMemo(() => {
    const total   = interestNotes.reduce((s, n) => s + (n.totalAmount || 0), 0);
    const paid    = interestNotes.filter((n) => n.status?.toLowerCase() === "paid")
                                  .reduce((s, n) => s + (n.totalAmount || 0), 0);
    const pending = interestNotes.filter((n) => n.status?.toLowerCase() === "pending")
                                  .reduce((s, n) => s + (n.totalAmount || 0), 0);
    return { total, paid, pending, count: interestNotes.length };
  }, [interestNotes]);

  // ── Full-page loading ──────────────────────────────────────────────────────
  if (isLoading && interestNotes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
              <div className="absolute inset-0 h-8 w-8 bg-violet-100 rounded-full animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium">Loading interest notes…</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Interest Note Management
                </h1>
              </div>
              <p className="text-sm text-slate-500 pl-11">
                Manage interest on late bill payments
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
                    : <><SlidersHorizontal className="h-4 w-4 mr-2 inline" />Filters</>}
                </motion.button>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                className="hidden lg:flex group px-3 py-2 lg:px-6 lg:py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 items-center"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-xs lg:text-base">Create Interest Note</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── SUMMARY CARDS ──────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { label: "Total Interest",  value: `₹${summaryStats.total.toFixed(2)}`,   icon: DollarSign,  color: "violet" },
            { label: "Paid",            value: `₹${summaryStats.paid.toFixed(2)}`,    icon: TrendingUp,  color: "emerald" },
            { label: "Pending",         value: `₹${summaryStats.pending.toFixed(2)}`, icon: BarChart3,   color: "amber" },
            { label: "Total Count",     value: summaryStats.count,                    icon: Building2,   color: "blue" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-4 shadow-md border border-slate-100 hover:shadow-lg transition-shadow"
            >
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

        {/* ── FILTERS ────────────────────────────────────────────────────── */}
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
                  <div className="p-2.5 bg-violet-50 rounded-xl">
                    <Filter className="h-5 w-5 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Filters</h2>
                </div>
                <div className="hidden lg:flex flex-wrap gap-2 lg:gap-3">
                  <motion.button
                    onClick={fetchNotes}
                    disabled={isLoading}
                    className="px-3 lg:px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
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
                    onClick={fetchNotes}
                    className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4 mr-2" /><span className="text-xs">Apply</span>
                  </motion.button>
                  <motion.button
                    onClick={clearFilters}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
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
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
                      />
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
                      />
                    </div>
                    <motion.button
                      onClick={() => handleMonthChange("next")}
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      disabled={isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
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
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Years</option>
                    {InterestNoteService.getFinancialYearOptions(4).map((fy) => (
                      <option key={fy} value={fy}>{fy}</option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div className="w-full md:flex-1 md:min-w-[150px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Companies</option>
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
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ERROR ──────────────────────────────────────────────────────── */}
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

        {/* ── EMPTY STATE ────────────────────────────────────────────────── */}
        {!isLoading && !error && interestNotes.length === 0 && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Clock className="h-12 w-12 text-violet-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No interest notes found</h3>
            <p className="text-slate-500 mb-8">
              Adjust your filters or create your first interest note.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Interest Note</span>
            </button>
          </motion.div>
        )}

        {/* ── TABLE / CARDS ───────────────────────────────────────────────── */}
        {interestNotes.length > 0 && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isMobile ? (
              /* ── MOBILE CARDS ── */
              <div className="divide-y divide-slate-100">
                {interestNotes.map((note, index) => (
                  <motion.div
                    key={note._id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <button
                          onClick={() => openViewModal(note._id)}
                          className="text-lg font-bold text-violet-600 hover:text-violet-800"
                        >
                          #{note.interestNoteNumber}
                        </button>
                        {note.financialYear && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg font-medium">
                            {note.financialYear}
                          </span>
                        )}
                        <p className="text-slate-500 text-sm">
                          {note.company?.name || note.companyDetailsSnapshot?.name || "N/A"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Bill: #{note.originalBillNumber} | Late: {note.lateDays} days
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(note.status)}`}>
                        {note.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Interest:</span>
                        <span className="font-semibold text-slate-800">₹{note.totalAmount?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Rate:</span>
                        <span className="text-slate-600">{note.monthlyInterestRate}%/month</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date:</span>
                        <span className="text-slate-600">{formatDisplayDate(note.interestNoteDate)}</span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <motion.button onClick={() => openViewModal(note._id)} whileTap={{ scale: 0.95 }}
                        className="flex-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1">
                        <Eye className="h-4 w-4" /><span className="text-sm">View</span>
                      </motion.button>
                      <motion.button onClick={() => openEditModal(note._id)} whileTap={{ scale: 0.95 }}
                        className="flex-1 px-2 py-1.5 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors flex items-center justify-center space-x-1">
                        <Edit3 className="h-4 w-4" /><span className="text-sm">Edit</span>
                      </motion.button>
                      <motion.button onClick={() => handleDelete(note._id)} whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                      <motion.button onClick={() => handleDownloadPdf(note._id, note.interestNoteNumber)} disabled={isLoading} whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl font-medium hover:bg-violet-100 transition-colors">
                        <FileText className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── DESKTOP TABLE ── */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Interest Note #", "Company",  "Date", "Late Days", "Amount", "Status", "Actions"].map((h) => (
                        <th
                          key={h}
                          className={`px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider ${
                            ["Amount"].includes(h) ? "text-right" : ["Status","Actions"].includes(h) ? "text-center" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {interestNotes.map((note, index) => (
                      <motion.tr
                        key={note._id}
                        className="hover:bg-slate-50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openViewModal(note._id)}
                            className="text-violet-600 hover:text-violet-800 font-semibold"
                          >
                            #{note.interestNoteNumber}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {note.company?.name || note.companyDetailsSnapshot?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {formatDisplayDate(note.interestNoteDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg">
                            <Clock className="h-3 w-3" />{note.lateDays} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-slate-800">
                          ₹{note.totalAmount?.toFixed(2) || "0.00"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(note.status)}`}>
                            {note.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            {[
                              { icon: Eye,      cls: "text-blue-600   hover:bg-blue-50",   action: () => openViewModal(note._id),                                  title: "View" },
                              { icon: Edit3,    cls: "text-amber-600  hover:bg-amber-50",  action: () => openEditModal(note._id),                                  title: "Edit" },
                              { icon: Trash2,   cls: "text-rose-600   hover:bg-rose-50",   action: () => handleDelete(note._id),                                   title: "Delete" },
                              { icon: FileText, cls: "text-violet-600 hover:bg-violet-50", action: () => handleDownloadPdf(note._id, note.interestNoteNumber), title: "PDF" },
                            ].map(({ icon: Icon, cls, action, title }) => (
                              <motion.button
                                key={title}
                                onClick={action}
                                disabled={isLoading && title === "PDF"}
                                className={`p-2 ${cls} rounded-xl transition-all`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={title}
                              >
                                <Icon className="h-4 w-4" />
                              </motion.button>
                            ))}
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

        {/* ── MOBILE FAB ─────────────────────────────────────────────────── */}
        {isMobile && (
          <motion.div
            className="fixed bottom-6 right-6 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              onClick={openCreateModal}
              className="w-16 h-16 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:shadow-3xl transition-all"
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
                className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto p-6 z-10 overflow-auto max-h-[85vh]"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Interest Note Details</h3>
                    <p className="text-sm text-slate-500">Full breakdown of this interest note</p>
                  </div>
                  <button onClick={closeViewModal} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-100 rounded-full p-2" />
                  </button>
                </div>

                {isViewLoading && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
                  </div>
                )}
                {viewError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
                    <p className="text-rose-700">{viewError}</p>
                  </div>
                )}

                {selectedNote && (
                  <div className="space-y-5">
                    {/* ── Meta row ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Interest Note No",  value: `#${selectedNote.interestNoteNumber}` },
                        { label: "Financial Year",    value: selectedNote.financialYear || "N/A", badge: true },
                        { label: "Original Bill No",  value: `#${selectedNote.originalBillNumber || "N/A"}` },
                        { label: "Bill Date",         value: formatDisplayDate(selectedNote.originalBillDate) },
                      ].map(({ label, value, badge }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-500">{label}</p>
                          {badge
                            ? <span className="inline-block px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-lg font-semibold">{value}</span>
                            : <p className="font-semibold text-slate-800">{value}</p>}
                        </div>
                      ))}
                    </div>

                    {/* ── Company + Date row ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Company</p>
                        <p className="font-semibold text-slate-800">
                          {selectedNote.company?.name || selectedNote.companyDetailsSnapshot?.name || "N/A"}
                        </p>
                        {(selectedNote.companyDetailsSnapshot?.gstNumber || selectedNote.company?.gstNumber) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            GSTIN: {selectedNote.companyDetailsSnapshot?.gstNumber || selectedNote.company?.gstNumber}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Interest Note Date</p>
                        <p className="font-semibold text-slate-800">{formatDisplayDate(selectedNote.interestNoteDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedNote.status)}`}>
                          {selectedNote.status}
                        </span>
                      </div>
                    </div>

                    {/* ── Interest calculation detail box ── */}
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-violet-800 mb-3 flex items-center gap-2">
                        <Percent className="h-4 w-4" /> Interest Calculation Breakdown
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {[
                          { label: "Due Date",          value: formatDisplayDate(selectedNote.dueDate) },
                          { label: "Payment Date",      value: formatDisplayDate(selectedNote.paymentDate) },
                          { label: "Late Days",         value: `${selectedNote.lateDays} days`, highlight: true },
                          { label: "Bill Amount",       value: `₹${(selectedNote.billTotalAmount || 0).toFixed(2)}` },
                          { label: "Monthly Rate",      value: `${selectedNote.monthlyInterestRate}%/month` },
                          { label: "Per Day Rate",      value: `₹${(selectedNote.perDayRate || 0).toFixed(4)}` },
                        ].map(({ label, value, highlight }) => (
                          <div key={label}>
                            <p className="text-xs text-violet-600">{label}</p>
                            <p className={`font-semibold ${highlight ? "text-orange-700" : "text-slate-800"}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Item table (single interest line) ── */}
                    <div className="overflow-x-auto border border-slate-300 rounded-xl p-3 bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs">
                            <th className="text-left py-2">Description</th>
                            <th className="text-right py-2">Rate/Day</th>
                            <th className="text-right py-2">Late Days</th>
                            <th className="text-right py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 text-slate-700">Interest on Late Payment Received</td>
                            <td className="py-2 text-right text-slate-600">₹{(selectedNote.perDayRate || 0).toFixed(4)}</td>
                            <td className="py-2 text-right text-slate-600">{selectedNote.lateDays}</td>
                            <td className="py-2 text-right font-semibold text-slate-800">₹{(selectedNote.subtotal || 0).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ── Tax + Total summary ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        {selectedNote.amountInWords && (
                          <p className="text-sm text-slate-600">
                            Amount in Words:{" "}
                            <span className="font-semibold text-slate-800">{selectedNote.amountInWords}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-slate-700">
                        <div className="flex justify-between">
                          <span>Interest (subtotal):</span>
                          <span>₹{(selectedNote.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {selectedNote.taxType === "CGST_SGST" && (
                          <>
                            <div className="flex justify-between">
                              <span>CGST ({selectedNote.cgstPercentage}%):</span>
                              <span>+ ₹{(selectedNote.cgstAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST ({selectedNote.sgstPercentage}%):</span>
                              <span>+ ₹{(selectedNote.sgstAmount || 0).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {selectedNote.taxType === "IGST" && (
                          <div className="flex justify-between">
                            <span>IGST ({selectedNote.igstPercentage}%):</span>
                            <span>+ ₹{(selectedNote.igstAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedNote.taxType === "JOBCGST_JOBSGST" && (
                          <>
                            <div className="flex justify-between">
                              <span>Job CGST ({selectedNote.jobCgstPercentage}%):</span>
                              <span>+ ₹{(selectedNote.jobCgstAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Job SGST ({selectedNote.jobSgstPercentage}%):</span>
                              <span>+ ₹{(selectedNote.jobSgstAmount || 0).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between font-bold border-t border-slate-300 pt-1 text-slate-800">
                          <span>Total:</span>
                          <span>₹{(selectedNote.totalAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── PDF button ── */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDownloadPdf(selectedNote._id, selectedNote.interestNoteNumber)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
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
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Create Interest Note</h3>
                    <p className="text-sm text-slate-500">Raise interest on a late-paid bill</p>
                  </div>
                  <button onClick={closeCreateModal} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-100 rounded-full p-2" />
                  </button>
                </div>

                {/* Alerts */}
                {createError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-rose-700">{createError}</p>
                  </div>
                )}
                {createSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-emerald-700">{createSuccessMessage}</p>
                  </div>
                )}
                {Object.keys(createFormErrors).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
                    <p className="font-semibold text-amber-700 mb-1">Fix the following errors:</p>
                    <ul className="list-disc list-inside text-amber-700 space-y-0.5">
                      {Object.values(createFormErrors).map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-5">

                  {/* ── STEP 1: Company ── */}
                  <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> Step 1 — Select Company
                    </p>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                        Company <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={create_companyId}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                          createFormErrors.companyId ? "border-rose-400 bg-rose-50" : "border-gray-200"
                        }`}
                      >
                        <option value="">— Select Company —</option>
                        {companies.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      {createFormErrors.companyId && <p className="text-xs text-rose-600 mt-1">{createFormErrors.companyId}</p>}
                    </div>
                  </div>

                  {/* ── STEP 2: Note details + bill selection ── */}
                  <div className={`rounded-xl p-4 border transition-all ${
                    create_companyId ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60 pointer-events-none"
                  }`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Step 2 — Note Details &amp; Bill Selection
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Interest Note Number */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Interest Note Number
                          {create_interestNoteNumberLoading && (
                            <RefreshCw className="inline ml-2 h-3 w-3 animate-spin text-indigo-500" />
                          )}
                        </label>
                        <input
                          value={create_interestNoteNumber}
                          onChange={(e) => setCreateInterestNoteNumber(e.target.value)}
                          placeholder={create_interestNoteNumberLoading ? "Generating…" : `e.g. ${getFYFromDate(create_interestNoteDate) || "2025-26"}/IN/01`}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.interestNoteNumber ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        />
                        {createFormErrors.interestNoteNumber && <p className="text-xs text-rose-600 mt-1">{createFormErrors.interestNoteNumber}</p>}
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Interest Note Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={create_interestNoteDate}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setCreateInterestNoteDate(newDate);
                            const fy = getFYFromDate(newDate);
                            refreshNoteNumber(fy);
                          }}
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.interestNoteDate ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        />
                        {createFormErrors.interestNoteDate && <p className="text-xs text-rose-600 mt-1">{createFormErrors.interestNoteDate}</p>}
                        {getFYFromDate(create_interestNoteDate) && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                            FY: {getFYFromDate(create_interestNoteDate)}
                          </span>
                        )}
                      </div>

                      {/* FY Filter for Bills */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Financial Year <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={create_filterFY}
                          onChange={(e) => setCreateFilterFY(e.target.value)}
                          className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                        >
                          {buildFYOptions().map((fy) => (
                            <option key={fy} value={fy}>{fy}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (create_companyId) {
                              setCreateLateBillsLoading(true);
                              InterestNoteService.getLatePaidBillsByCompany(create_companyId, create_filterFY)
                                .then((r) => setCreateLateBills(r.data))
                                .catch((e) => console.error("Failed to fetch:", e))
                                .finally(() => setCreateLateBillsLoading(false));
                            }
                          }}
                          className="mt-1 px-3 py-1 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                          Load Bills
                        </button>
                      </div>
                    </div>

                    {/* Late-paid bill dropdown */}
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                        Late-Paid Bill <span className="text-rose-500">*</span>
                        {create_lateBillsLoading && (
                          <RefreshCw className="inline ml-2 h-3 w-3 animate-spin text-indigo-500" />
                        )}
                      </label>
                      <select
                        value={create_billId}
                        onChange={(e) => handleBillSelection(e.target.value)}
                        disabled={!create_companyId || create_lateBillsLoading}
                        className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                          createFormErrors.billId ? "border-rose-400 bg-rose-50" : "border-gray-200"
                        } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                      >
                        <option value="">
                          {!create_companyId
                            ? "Select company first"
                            : create_lateBillsLoading
                            ? "Loading…"
                            : create_lateBills.length === 0
                            ? "No late-paid bills found"
                            : "— Select Late-Paid Bill —"}
                        </option>
                        {create_lateBills.map((bill) => (
                          <option key={bill._id} value={bill._id}>
                            #{bill.billNumber} — {formatDisplayDate(bill.billDate)} — ₹{bill.totalAmount?.toFixed(2)} [{bill.lateDays} days late]
                          </option>
                        ))}
                      </select>
                      {createFormErrors.billId && <p className="text-xs text-rose-600 mt-1">{createFormErrors.billId}</p>}
                      {create_companyId && !create_lateBillsLoading && create_lateBills.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No paid bills with late payment found for this company.
                        </p>
                      )}
                    </div>

                    {/* Selected bill info card */}
                    {create_selectedBill && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
                        {[
                          { label: "Due Date",    value: formatDisplayDate(create_selectedBill.dueDate) },
                          { label: "Paid On",     value: formatDisplayDate(create_selectedBill.paymentDate) },
                          { label: "Late Days",   value: `${create_selectedBill.lateDays} days` },
                          { label: "Bill Amount", value: `₹${(create_selectedBill.totalAmount || 0).toFixed(2)}` },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-xs text-orange-600">{label}</p>
                            <p className="font-semibold text-orange-800">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── STEP 3: Interest rate + tax config ── */}
                  <div className={`rounded-xl p-4 border transition-all ${
                    create_billId ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60 pointer-events-none"
                  }`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" /> Step 3 — Interest Rate &amp; Tax Configuration
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {/* Monthly rate */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                          Monthly Interest Rate (%) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={create_monthlyRate}
                          onChange={(e) => setCreateMonthlyRate(e.target.value)}
                          placeholder="e.g. 18"
                          className={`mt-1 text-black block w-full p-2 text-xs lg:text-sm border rounded-lg ${
                            createFormErrors.monthlyRate ? "border-rose-400 bg-rose-50" : "border-gray-200"
                          }`}
                        />
                        {createFormErrors.monthlyRate && <p className="text-xs text-rose-600 mt-1">{createFormErrors.monthlyRate}</p>}
                      </div>

                      {/* Tax type */}
                      <div>
                        <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                        <select
                          value={create_taxType}
                          onChange={(e) => setCreateTaxType(e.target.value)}
                          className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                        >
                          <option value="CGST_SGST">CGST + SGST</option>
                          <option value="IGST">IGST</option>
                          <option value="JOBCGST_JOBSGST">Job CGST + Job SGST</option>
                        </select>
                      </div>
                    </div>

                    {/* Tax % inputs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {create_taxType === "CGST_SGST" && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">CGST %</label>
                            <input type="number" min="0" step="0.01" value={create_cgstPct}
                              onChange={(e) => setCreateCgstPct(e.target.value)}
                              className="text-black block w-full p-2 text-xs border border-gray-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">SGST %</label>
                            <input type="number" min="0" step="0.01" value={create_sgstPct}
                              onChange={(e) => setCreateSgstPct(e.target.value)}
                              className="text-black block w-full p-2 text-xs border border-gray-200 rounded-lg" />
                          </div>
                        </>
                      )}
                      {create_taxType === "IGST" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">IGST %</label>
                          <input type="number" min="0" step="0.01" value={create_igstPct}
                            onChange={(e) => setCreateIgstPct(e.target.value)}
                            className="text-black block w-full p-2 text-xs border border-gray-200 rounded-lg" />
                        </div>
                      )}
                      {create_taxType === "JOBCGST_JOBSGST" && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Job CGST %</label>
                            <input type="number" min="0" step="0.01" value={create_jobCgstPct}
                              onChange={(e) => setCreateJobCgstPct(e.target.value)}
                              className="text-black block w-full p-2 text-xs border border-gray-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Job SGST %</label>
                            <input type="number" min="0" step="0.01" value={create_jobSgstPct}
                              onChange={(e) => setCreateJobSgstPct(e.target.value)}
                              className="text-black block w-full p-2 text-xs border border-gray-200 rounded-lg" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Live preview */}
                    {interestPreview && create_selectedBill && (
                      <div className="mt-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-2">
                          Live Interest Preview
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-violet-600">Per Day Rate</p>
                            <p className="font-semibold text-slate-800">₹{interestPreview.perDayRate.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-violet-600">Late Days</p>
                            <p className="font-semibold text-orange-700">{create_selectedBill.lateDays} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-violet-600">Interest (pre-tax)</p>
                            <p className="font-semibold text-slate-800">₹{interestPreview.interestAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-violet-600 font-semibold">Formula</p>
                            <p className="text-xs text-slate-600">
                              (₹{create_selectedBill.totalAmount?.toFixed(2)} × {create_monthlyRate}%) ÷ 30 × {create_selectedBill.lateDays}d
                            </p>
                          </div>
                        </div>
                      </div>
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
                      disabled={isCreateLoading || !create_companyId || !create_billId}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      {isCreateLoading ? "Creating…" : "Create Interest Note"}
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
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto p-6 z-10"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Edit Interest Note</h3>
                    <p className="text-sm text-slate-500">Update note status</p>
                  </div>
                  <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                    <X className="h-10 w-10 border border-slate-100 rounded-full p-2" />
                  </button>
                </div>

                {isFetchingEdit && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
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

                {!isFetchingEdit && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={edit_status}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="mt-1 text-black block w-full p-2 text-xs lg:text-sm border border-gray-200 rounded-lg"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> Mark as <strong>Paid</strong> once the interest amount has been
                        received from the party. Mark as <strong>Cancelled</strong> if the note is no longer applicable.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button type="button" onClick={() => setIsEditOpen(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={isEditLoading}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 hover:shadow-lg transition-all">
                        {isEditLoading ? "Updating…" : "Update Interest Note"}
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

export default InterestNoteListPage;