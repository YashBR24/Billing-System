import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Plus,
  Package,
  Building2,
  Calendar,
  IndianRupee,
  SlidersHorizontal,
  Tag,
  ShoppingBag,
  Type,
} from "lucide-react";
import PurchaseService from "../../services/PurchaseService";
import CompanyService from "../../services/CompanyService";

const PurchaseListPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("list"); // 'list', 'add', 'edit', 'view'
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filter states
  const [suppliers, setSuppliers] = useState([]);
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterPurchaseType, setFilterPurchaseType] = useState("");

  // Form states for add/edit
  const [formData, setFormData] = useState({
    purchaseType: "YARN",
    supplierCompanyId: "",
    manualCompanyName: "",
    challanNumber: "",
    purchaseBillNumber: "",
    challanDate: "",
    purchaseBillDate: new Date().toISOString().split("T")[0],
    denier: "",
    grade: "",
    totalGrossWeight: "",
    tareWeight: "0",
    netWeight: "",
    ratePerUnit: "",
    carteageFridgeAmount: "0",
    baseAmount: "",
    amount: "",
    cgstPercentage: "2.5",
    sgstPercentage: "2.5",
    cgst: "0",
    sgst: "0",
    productType: "",
    productDescription: "",
    paymentStatus: "Unpaid",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Purchase type options
  const purchaseTypeOptions = [
    { value: "YARN", label: "Yarn Purchase", icon: Package },
    { value: "OTHER", label: "Other Purchase", icon: ShoppingBag },
  ];

  // Status options
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Paid", label: "Paid" },
    { value: "Unpaid", label: "Unpaid" },
    { value: "Partially Paid", label: "Partially Paid" },
  ];

  // Purchase type filter options
  const purchaseTypeFilterOptions = [
    { value: "", label: "All Types" },
    { value: "YARN", label: "Yarn Purchases" },
    { value: "OTHER", label: "Other Purchases" },
  ];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowFilters(true);
      } else {
        setShowFilters(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set initial date filters and fetch suppliers
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));

    const fetchSuppliers = async () => {
      setIsLoadingCompanies(true);
      try {
        const response = await CompanyService.getAllCompanies();
        const filteredSuppliers = response.data.filter(
          (company) =>
            company.companyType === "Buyer" || company.companyType === "Both"
        );
        setSuppliers(filteredSuppliers);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
        setError("Could not load suppliers. Please try again.");
      }
      setIsLoadingCompanies(false);
    };
    fetchSuppliers();
  }, []);

  // Format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle month change for date filters
  const handleMonthChange = (direction) => {
    const currentDate = new Date(filterStartDate);
    let newYear = currentDate.getFullYear();
    let newMonth = currentDate.getMonth();

    if (direction === "prev") {
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

  // Fetch purchases
  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const params = {
        startDate: filterStartDate,
        endDate: filterEndDate,
        supplierCompanyId: filterSupplierId,
        paymentStatus: filterStatus,
        purchaseType: filterPurchaseType,
      };
      const response = await PurchaseService.getAllPurchases(params);
      setPurchases(response.data);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch purchase records.";
      setError(errMsg);
      console.error("Fetch purchases error:", errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterSupplierId, filterStatus, filterPurchaseType]);

  useEffect(() => {
    if (view === "list") {
      fetchPurchases();
    }
  }, [fetchPurchases, view]);

  // Fetch single purchase for view/edit
  const fetchPurchaseDetails = useCallback(
    async (purchaseId) => {
      setIsLoading(true);
      setError("");
      try {
        const response = await PurchaseService.getPurchaseById(purchaseId);
        setSelectedPurchase(response.data);
        if (view === "edit") {
          const purchase = response.data;
          setFormData({
            purchaseType: purchase.purchaseType || "YARN",
            supplierCompanyId: purchase.supplierCompany?._id || purchase.supplierCompany || "",
            manualCompanyName: purchase.manualCompanyName || "",
            challanNumber: purchase.challanNumber || "",
            purchaseBillNumber: purchase.purchaseBillNumber || "",
            challanDate: purchase.challanDate
              ? new Date(purchase.challanDate).toISOString().split("T")[0]
              : "",
            purchaseBillDate: purchase.purchaseBillDate
              ? new Date(purchase.purchaseBillDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            denier: purchase.denier || "",
            grade: purchase.grade || "",
            totalGrossWeight: purchase.totalGrossWeight?.toString() || "",
            tareWeight: purchase.tareWeight?.toString() || "0",
            netWeight: purchase.netWeight?.toString() || "",
            ratePerUnit: purchase.ratePerUnit?.toString() || "",
            carteageFridgeAmount: purchase.carteageFridgeAmount?.toString() || "0",
            baseAmount: purchase.purchaseType === "OTHER"
              ? (purchase.amount - (purchase.cgst || 0) - (purchase.sgst || 0))?.toString() || ""
              : "",
            amount: purchase.amount?.toString() || "",
            cgstPercentage: purchase.cgstPercentage?.toString() || "2.5",
            sgstPercentage: purchase.sgstPercentage?.toString() || "2.5",
            cgst: purchase.cgst?.toString() || "0",
            sgst: purchase.sgst?.toString() || "0",
            productType: purchase.productType || "",
            productDescription: purchase.productDescription || "",
            paymentStatus: purchase.paymentStatus || "Unpaid",
            notes: purchase.notes || "",
          });
        }
      } catch (err) {
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch purchase details.";
        setError(errMsg);
        console.error("Fetch purchase details error:", errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [view]
  );

  // Handle download Excel
  const handleDownloadExcel = async () => {
    try {
      setIsLoading(true);
      const filters = {
        startDate: filterStartDate,
        endDate: filterEndDate,
        supplierCompanyId: filterSupplierId,
        paymentStatus: filterStatus,
        purchaseType: filterPurchaseType,
      };
      const response = await PurchaseService.downloadPurchasesExcel(filters);
      let fileName = "Purchases";
      if (filterPurchaseType) fileName += `_${filterPurchaseType}`;
      if (filterStartDate && filterEndDate) {
        fileName += `_${filterStartDate}_to_${filterEndDate}`;
      }
      if (filterSupplierId) {
        const supplier = suppliers.find((s) => s._id === filterSupplierId);
        fileName += `_${supplier?.name || filterSupplierId}`;
      }
      fileName += ".xlsx";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to download Excel.";
      setError(errMsg);
      console.error("Excel download error:", errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download PDF
  const handleDownloadPdf = async () => {
    try {
      setIsLoading(true);
      const filters = {
        startDate: filterStartDate,
        endDate: filterEndDate,
        supplierCompanyId: filterSupplierId,
        paymentStatus: filterStatus,
        purchaseType: filterPurchaseType,
      };
      const response = await PurchaseService.downloadPurchasesPdf(filters);
      let fileName = "Purchases";
      if (filterPurchaseType) fileName += `_${filterPurchaseType}`;
      if (filterStartDate && filterEndDate) {
        fileName += `_${filterStartDate}_to_${filterEndDate}`;
      }
      if (filterSupplierId) {
        const supplier = suppliers.find((s) => s._id === filterSupplierId);
        fileName += `_${supplier?.name || filterSupplierId}`;
      }
      fileName += ".pdf";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || "Failed to download PDF.";
      setError(errMsg);
      console.error("PDF download error:", errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete purchase
  const handleDeletePurchase = async (purchaseId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this purchase record? This action cannot be undone."
      )
    ) {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");
      try {
        await PurchaseService.deletePurchase(purchaseId);
        setPurchases((prevPurchases) =>
          prevPurchases.filter((p) => p._id !== purchaseId)
        );
        setSuccessMessage("Purchase deleted successfully!");
      } catch (err) {
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to delete purchase record.";
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle view purchase
  const handleViewPurchase = (purchaseId) => {
    setView("view");
    fetchPurchaseDetails(purchaseId);
  };

  // Handle edit purchase
  const handleEditPurchase = (purchaseId) => {
    setView("edit");
    setIsFormOpen(true);
    fetchPurchaseDetails(purchaseId);
  };

  // Handle add purchase
  const handleAddPurchase = () => {
    setFormData({
      purchaseType: "YARN",
      supplierCompanyId: "",
      manualCompanyName: "",
      challanNumber: "",
      purchaseBillNumber: "",
      challanDate: "",
      purchaseBillDate: new Date().toISOString().split("T")[0],
      denier: "",
      grade: "",
      totalGrossWeight: "",
      tareWeight: "0",
      netWeight: "",
      ratePerUnit: "",
      carteageFridgeAmount: "0",
      baseAmount: "",
      amount: "",
      cgstPercentage: "2.5",
      sgstPercentage: "2.5",
      cgst: "0",
      sgst: "0",
      productType: "",
      productDescription: "",
      paymentStatus: "Unpaid",
      notes: "",
    });
    setFormErrors({});
    setError("");
    setView("add");
    setIsFormOpen(true);
  };

  // Clear filters
  const clearFilters = () => {
    setFilterSupplierId("");
    setFilterStatus("");
    setFilterPurchaseType("");
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
    if (isMobile) setShowFilters(false);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "unpaid":
        return "bg-red-100 text-red-800 border-red-200";
      case "partially paid":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Get purchase type color and icon
  const getPurchaseTypeInfo = (type) => {
    switch (type) {
      case "YARN":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Package,
          label: "Yarn",
        };
      case "OTHER":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: ShoppingBag,
          label: "Other",
        };
      default:
        return {
          color: "bg-slate-100 text-slate-800 border-slate-200",
          icon: Tag,
          label: "Unknown",
        };
    }
  };

  // Form handling for add/edit
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };

    // When purchase type changes, reset type-specific fields
    if (name === "purchaseType") {
      if (value === "YARN") {
        newFormData.productType = "";
        newFormData.productDescription = "";
        newFormData.manualCompanyName = "";
        newFormData.baseAmount = "";
        newFormData.amount = "";
      } else {
        newFormData.challanNumber = "";
        newFormData.challanDate = "";
        newFormData.denier = "";
        newFormData.grade = "";
        newFormData.totalGrossWeight = "";
        newFormData.tareWeight = "0";
        newFormData.netWeight = "";
        newFormData.ratePerUnit = "";
        newFormData.carteageFridgeAmount = "0";
        newFormData.baseAmount = "";
        newFormData.amount = "";
      }
    }

    // When selecting a company, clear manual name
    if (name === "supplierCompanyId" && value) {
      newFormData.manualCompanyName = "";
    }

    // When entering manual company name, clear company selection
    if (name === "manualCompanyName" && value) {
      newFormData.supplierCompanyId = "";
    }

    // Calculate net weight and amount for YARN purchases
    if (newFormData.purchaseType === "YARN" &&
        (name === "totalGrossWeight" || name === "tareWeight" || name === "ratePerUnit" || name === "cgstPercentage" || name === "sgstPercentage" || name === "carteageFridgeAmount")) {
      const gross =
        parseFloat(
          name === "totalGrossWeight" ? value : newFormData.totalGrossWeight
        ) || 0;
      const tare =
        parseFloat(name === "tareWeight" ? value : newFormData.tareWeight) || 0;
      const rate =
        parseFloat(name === "ratePerUnit" ? value : newFormData.ratePerUnit) || 0;
      const carteageFridge =
        parseFloat(name === "carteageFridgeAmount" ? value : newFormData.carteageFridgeAmount) || 0;
      const cgstPct = parseFloat(name === "cgstPercentage" ? value : newFormData.cgstPercentage) || 0;
      const sgstPct = parseFloat(name === "sgstPercentage" ? value : newFormData.sgstPercentage) || 0;

      const net = parseFloat((gross - tare).toFixed(3));
      const subTotal = parseFloat((net * rate).toFixed(2));
      const baseForGst = subTotal + carteageFridge;
      const cgstAmt = parseFloat(((baseForGst * cgstPct) / 100).toFixed(2));
      const sgstAmt = parseFloat(((baseForGst * sgstPct) / 100).toFixed(2));
      const total = parseFloat((baseForGst + cgstAmt + sgstAmt).toFixed(2));

      newFormData.netWeight = isNaN(net) ? "" : net.toString();
      newFormData.cgst = cgstAmt.toString();
      newFormData.sgst = sgstAmt.toString();
      newFormData.amount = isNaN(total) ? "" : total.toString();
    }

    // Calculate total amount for OTHER purchases
    if (newFormData.purchaseType === "OTHER" && (name === "baseAmount" || name === "cgstPercentage" || name === "sgstPercentage")) {
      const baseAmount = parseFloat(name === "baseAmount" ? value : newFormData.baseAmount) || 0;
      const cgstPct = parseFloat(name === "cgstPercentage" ? value : newFormData.cgstPercentage) || 0;
      const sgstPct = parseFloat(name === "sgstPercentage" ? value : newFormData.sgstPercentage) || 0;
      
      const cgstAmt = parseFloat(((baseAmount * cgstPct) / 100).toFixed(2));
      const sgstAmt = parseFloat(((baseAmount * sgstPct) / 100).toFixed(2));
      const total = parseFloat((baseAmount + cgstAmt + sgstAmt).toFixed(2));
      
      newFormData.cgst = cgstAmt.toString();
      newFormData.sgst = sgstAmt.toString();
      newFormData.amount = isNaN(total) ? "" : total.toString();
    }

    setFormData(newFormData);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.purchaseBillNumber.trim())
      errors.purchaseBillNumber = "Bill number is required";
    if (!formData.purchaseBillDate)
      errors.purchaseBillDate = "Bill date is required";

    if (formData.purchaseType === "YARN") {
      if (!formData.supplierCompanyId)
        errors.supplierCompanyId = "Supplier is required";
      if (isNaN(parseFloat(formData.totalGrossWeight)) || parseFloat(formData.totalGrossWeight) <= 0)
        errors.totalGrossWeight = "Valid gross weight required";
      if (isNaN(parseFloat(formData.tareWeight)) || parseFloat(formData.tareWeight) < 0)
        errors.tareWeight = "Tare weight must be ≥ 0";
      if (isNaN(parseFloat(formData.ratePerUnit)) || parseFloat(formData.ratePerUnit) <= 0)
        errors.ratePerUnit = "Valid rate required";

      const gross = parseFloat(formData.totalGrossWeight) || 0;
      const tare = parseFloat(formData.tareWeight) || 0;
      if (tare > gross) errors.tareWeight = "Tare cannot exceed gross weight";

      if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0)
        errors.amount = "Valid amount required";
    } else if (formData.purchaseType === "OTHER") {
      if (!formData.supplierCompanyId && !formData.manualCompanyName.trim())
        errors.manualCompanyName = "Either select a company or enter company name";
      if (!formData.productType.trim())
        errors.productType = "Product type is required";
      if (isNaN(parseFloat(formData.baseAmount)) || parseFloat(formData.baseAmount) <= 0)
        errors.amount = "Valid base amount required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const submissionData = {
      ...formData,
      cgstPercentage: parseFloat(formData.cgstPercentage) || 2.5,
      sgstPercentage: parseFloat(formData.sgstPercentage) || 2.5,
      challanDate: formData.challanDate || null,
      purchaseBillDate: new Date(formData.purchaseBillDate).toISOString(),
    };

    // Clean up data based on purchase type
    if (formData.purchaseType === "YARN") {
      submissionData.totalGrossWeight = parseFloat(formData.totalGrossWeight);
      submissionData.tareWeight = parseFloat(formData.tareWeight);
      submissionData.ratePerUnit = parseFloat(formData.ratePerUnit);
      submissionData.carteageFridgeAmount = parseFloat(formData.carteageFridgeAmount || 0);
      delete submissionData.productType;
      delete submissionData.productDescription;
      delete submissionData.manualCompanyName;
      delete submissionData.baseAmount;
      delete submissionData.cgst;
      delete submissionData.sgst;
    } else {
      submissionData.amount = parseFloat(formData.baseAmount);
      delete submissionData.challanNumber;
      delete submissionData.challanDate;
      delete submissionData.denier;
      delete submissionData.grade;
      delete submissionData.totalGrossWeight;
      delete submissionData.tareWeight;
      delete submissionData.netWeight;
      delete submissionData.ratePerUnit;
      delete submissionData.carteageFridgeAmount;
      delete submissionData.cgst;
      delete submissionData.sgst;
    }

    try {
      if (view === "edit") {
        await PurchaseService.updatePurchase(
          selectedPurchase._id,
          submissionData
        );
        setSuccessMessage("Purchase updated successfully!");
      } else {
        await PurchaseService.createPurchase(submissionData);
        setSuccessMessage("Purchase created successfully!");
      }
      setView("list");
      setIsFormOpen(false);
      fetchPurchases();
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        (view === "edit"
          ? "Failed to update purchase"
          : "Failed to create purchase");
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      purchaseType: "YARN",
      supplierCompanyId: "",
      manualCompanyName: "",
      challanNumber: "",
      purchaseBillNumber: "",
      challanDate: "",
      purchaseBillDate: new Date().toISOString().split("T")[0],
      denier: "",
      grade: "",
      totalGrossWeight: "",
      tareWeight: "0",
      netWeight: "",
      ratePerUnit: "",
      carteageFridgeAmount: "0",
      baseAmount: "",
      amount: "",
      cgstPercentage: "2.5",
      sgstPercentage: "2.5",
      cgst: "0",
      sgst: "0",
      productType: "",
      productDescription: "",
      paymentStatus: "Unpaid",
      notes: "",
    });
    setFormErrors({});
    setError("");
  };

  // Render List View
  const renderListView = () => (
    <>
      <motion.div
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg xl:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Purchase Records
              </h1>
              <p className="text-sm text-slate-500">Manage yarn and other purchases</p>
            </div>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleAddPurchase}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Purchase</span>
                </div>
              </motion.button>
              <motion.button
                onClick={handleDownloadExcel}
                className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Export Excel</span>
                </div>
              </motion.button>
              <motion.button
                onClick={handleDownloadPdf}
                className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Export PDF</span>
                </div>
              </motion.button>
              <motion.button
                onClick={fetchPurchases}
                className="p-2 text-slate-400 hover:text-violet-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                />
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
              <svg
                className="h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
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
              <svg
                className="h-5 w-5 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
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
            className="p-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {showFilters ? (
              <>
                <div className="flex items-center gap-2 text-sm px-4 py-1 bg-white text-slate-700 border border-slate-200 rounded-full font-medium shadow-sm hover:bg-slate-50">
                  <X className="h-5 w-5" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm px-4 py-1 bg-white text-slate-700 border border-slate-200 rounded-full font-medium shadow-sm hover:bg-slate-50">
                  <Filter className="h-4 w-4" />
                  <p className="text-gray-500 font-semibold">Show Filters</p>
                </div>
              </>
            )}
          </motion.button>
          <br/>
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
                <span>Export Excel</span>
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
                <span>Export PDF</span>
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
              <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Showing purchases from
              <br className="xl:hidden" /> {formatDisplayDate(filterStartDate)}{" "}
              to {formatDisplayDate(filterEndDate)}
            </p>
          </div>

          <AnimatePresence>
            {(!isMobile || showFilters) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2 bg-transparent p-3">
                      <motion.button
                        onClick={() => handleMonthChange("prev")}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isLoading}
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
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
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      />
                      <motion.button
                        onClick={() => handleMonthChange("next")}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isLoading}
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                      </motion.button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Purchase Type
                      </label>
                      <select
                        value={filterPurchaseType}
                        onChange={(e) => setFilterPurchaseType(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        {purchaseTypeFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Supplier
                      </label>
                      <select
                        value={filterSupplierId}
                        onChange={(e) => setFilterSupplierId(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading || isLoadingCompanies}
                      >
                        <option value="">All Suppliers</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name} ({supplier.companyType})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                  <motion.button
                    onClick={fetchPurchases}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
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
                    className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <X className="h-4 w-4" />
                      <span className="text-sm">Reset Filters</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!isLoading && !error && purchases.length === 0 && (
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-800">
            No purchases found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your filters or create a new purchase.
          </p>
          <div className="mt-6">
            <motion.button
              onClick={handleAddPurchase}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add New Purchase</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {purchases.length > 0 && (
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Purchase Records ({purchases.length})
            </h2>
            <motion.button
              onClick={fetchPurchases}
              className="p-2 text-slate-400 hover:text-violet-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </motion.button>
          </div>

          {isMobile ? (
            <div className="space-y-4">
              {purchases.map((purchase, index) => {
                const typeInfo = getPurchaseTypeInfo(purchase.purchaseType);
                const TypeIcon = typeInfo.icon;
                return (
                  <motion.div
                    key={purchase._id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewPurchase(purchase._id)}
                            className="text-sm font-medium text-violet-600 hover:underline"
                          >
                            Purchase #{purchase.purchaseBillNumber}
                          </button>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${typeInfo.color}`}
                          >
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
                              purchase.paymentStatus
                            )} mt-1`}
                          >
                            {purchase.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleViewPurchase(purchase._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleEditPurchase(purchase._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeletePurchase(purchase._id)}
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
                        <span>
                          {purchase.supplierCompany?.name ||
                            purchase.supplierDetailsSnapshot?.name ||
                            purchase.manualCompanyName ||
                            "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>
                          {formatDisplayDate(purchase.purchaseBillDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-slate-400" />
                        <span>
                          {(purchase.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {purchase.purchaseType === "YARN" && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Net Wt.:</span>
                          <span>{purchase.netWeight?.toFixed(3)} Kg</span>
                        </div>
                      )}
                      {purchase.purchaseType === "OTHER" && purchase.productType && (
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-slate-400" />
                          <span>{purchase.productType}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Bill #
                    </th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {purchases.map((purchase, index) => {
                    const typeInfo = getPurchaseTypeInfo(purchase.purchaseType);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <motion.tr
                        key={purchase._id}
                        className="hover:bg-slate-50 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${typeInfo.color}`}
                          >
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewPurchase(purchase._id)}
                            className="text-violet-600 hover:underline"
                          >
                            {purchase.purchaseBillNumber}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {purchase.supplierCompany?.name ||
                            purchase.supplierDetailsSnapshot?.name ||
                            purchase.manualCompanyName ||
                            "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {formatDisplayDate(purchase.purchaseBillDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {purchase.purchaseType === "YARN" ? (
                            <>
                              {purchase.denier && <span className="mr-3"> {purchase.denier}</span>}
                              {/* {purchase.grade && <span className="mr-3">Grade: {purchase.grade}</span>}// */}
                              <div className="text-xs text-slate-500">
                                Net: {purchase.netWeight?.toFixed(3)} Kg
                              </div>
                            </>
                          ) : (
                            <>
                              <div>{purchase.productType || "-"}</div>
                              {purchase.productDescription && (
                                <div className="text-xs text-slate-500 truncate max-w-xs">
                                  {purchase.productDescription}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-medium">
                          ₹{(purchase.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
                              purchase.paymentStatus
                            )}`}
                          >
                            {purchase.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={() => handleViewPurchase(purchase._id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleEditPurchase(purchase._id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeletePurchase(purchase._id)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </>
  );

  // Render Add/Edit Form Modal
  const renderFormModal = () => {
    const pageTitle =
      view === "edit" ? "Edit Purchase Record" : "Add New Purchase";
    const submitButtonText =
      view === "edit" ? "Update Purchase" : "Save Purchase";

    const isYarnPurchase = formData.purchaseType === "YARN";
    const isOtherPurchase = formData.purchaseType === "OTHER";

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
              className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800">
                  {pageTitle}
                </h2>
                <motion.button
                  onClick={() => {
                    setIsFormOpen(false);
                    setView("list");
                  }}
                  className="p-2 text-slate-400 hover:text-red-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Purchase Type Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Purchase Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {purchaseTypeOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = formData.purchaseType === option.value;
                        return (
                          <motion.div
                            key={option.value}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                              isSelected
                                ? "border-violet-500 bg-violet-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() =>
                              setFormData({ ...formData, purchaseType: option.value })
                            }
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  isSelected
                                    ? "bg-violet-500 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-800">
                                  {option.label}
                                </h3>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Common Fields */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Bill Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="purchaseBillNumber"
                        value={formData.purchaseBillNumber}
                        onChange={handleChange}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                          formErrors.purchaseBillNumber
                            ? "border-red-500"
                            : "border-slate-200"
                        }`}
                      />
                      {formErrors.purchaseBillNumber && (
                        <p className="mt-1 text-xs text-red-500">
                          {formErrors.purchaseBillNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Bill Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="purchaseBillDate"
                        value={formData.purchaseBillDate}
                        onChange={handleChange}
                        className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                          formErrors.purchaseBillDate
                            ? "border-red-500"
                            : "border-slate-200"
                        }`}
                      />
                      {formErrors.purchaseBillDate && (
                        <p className="mt-1 text-xs text-red-500">
                          {formErrors.purchaseBillDate}
                        </p>
                      )}
                    </div>

                    {/* Supplier Selection - Common for both types */}
                    {isYarnPurchase ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Supplier Company <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="supplierCompanyId"
                          value={formData.supplierCompanyId}
                          onChange={handleChange}
                          className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                            formErrors.supplierCompanyId
                              ? "border-red-500"
                              : "border-slate-200"
                          }`}
                          disabled={isLoadingCompanies}
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((company) => (
                            <option key={company._id} value={company._id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.supplierCompanyId && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.supplierCompanyId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Select Company
                          </label>
                          <select
                            name="supplierCompanyId"
                            value={formData.supplierCompanyId}
                            onChange={handleChange}
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                            disabled={isLoadingCompanies}
                          >
                            <option value="">Select Supplier (Optional)</option>
                            {suppliers.map((company) => (
                              <option key={company._id} value={company._id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-slate-500">
                            Or enter company name below
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="manualCompanyName"
                            value={formData.manualCompanyName}
                            onChange={handleChange}
                            placeholder="Enter company name"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.manualCompanyName
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.manualCompanyName && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.manualCompanyName}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* YARN-specific fields */}
                    {isYarnPurchase && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Challan No.
                          </label>
                          <input
                            type="text"
                            name="challanNumber"
                            value={formData.challanNumber}
                            onChange={handleChange}
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Challan Date
                          </label>
                          <input
                            type="date"
                            name="challanDate"
                            value={formData.challanDate}
                            onChange={handleChange}
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Denier
                          </label>
                          <input
                            type="text"
                            name="denier"
                            value={formData.denier}
                            onChange={handleChange}
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Grade
                          </label>
                          <input
                            type="text"
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Total Gross Wt. (Kg) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="totalGrossWeight"
                            value={formData.totalGrossWeight}
                            onChange={handleChange}
                            step="0.001"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.totalGrossWeight
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.totalGrossWeight && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.totalGrossWeight}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Tare Wt. (Kg)
                          </label>
                          <input
                            type="number"
                            name="tareWeight"
                            value={formData.tareWeight}
                            onChange={handleChange}
                            step="0.001"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.tareWeight
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.tareWeight && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.tareWeight}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Net Wt. (Kg)
                          </label>
                          <input
                            type="text"
                            value={formData.netWeight}
                            readOnly
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg bg-slate-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Rate / Unit (₹/Kg) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="ratePerUnit"
                            value={formData.ratePerUnit}
                            onChange={handleChange}
                            step="0.01"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.ratePerUnit
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.ratePerUnit && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.ratePerUnit}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Carteage / Fridge Amount (₹)
                          </label>
                          <input
                            type="number"
                            name="carteageFridgeAmount"
                            value={formData.carteageFridgeAmount}
                            onChange={handleChange}
                            step="0.01"
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          />
                        </div>
                      </>
                    )}

                    {/* OTHER-specific fields */}
                    {isOtherPurchase && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Product Type <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="productType"
                            value={formData.productType}
                            onChange={handleChange}
                            placeholder="e.g., Packaging, Machinery, Office Supplies"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.productType
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.productType && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.productType}
                            </p>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Product Description
                          </label>
                          <textarea
                            name="productDescription"
                            value={formData.productDescription}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Detailed description of the product/service"
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                          ></textarea>
                        </div>
                      </>
                    )}

                    {/* GST Fields */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        CGST (%)
                      </label>
                      <input
                        type="number"
                        name="cgstPercentage"
                        value={formData.cgstPercentage}
                        onChange={handleChange}
                        step="0.01"
                        className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      />
                      {formData.cgst && parseFloat(formData.cgst) > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          CGST Amount: ₹{parseFloat(formData.cgst).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        SGST (%)
                      </label>
                      <input
                        type="number"
                        name="sgstPercentage"
                        value={formData.sgstPercentage}
                        onChange={handleChange}
                        step="0.01"
                        className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      />
                      {formData.sgst && parseFloat(formData.sgst) > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          SGST Amount: ₹{parseFloat(formData.sgst).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Common financial fields */}
                    {isYarnPurchase && (
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Total Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          step="0.01"
                          className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                            formErrors.amount
                              ? "border-red-500"
                              : "border-slate-200"
                          }`}
                        />
                        {formErrors.amount && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.amount}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          Auto-calculated: (SubTotal + Carteage/Fridge) + CGST + SGST (editable)
                        </p>
                      </div>
                    )}

                    {isOtherPurchase && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Base Amount (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="baseAmount"
                            value={formData.baseAmount}
                            onChange={handleChange}
                            step="0.01"
                            className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${
                              formErrors.amount
                                ? "border-red-500"
                                : "border-slate-200"
                            }`}
                          />
                          {formErrors.amount && (
                            <p className="mt-1 text-xs text-red-500">
                              {formErrors.amount}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            Total Amount (₹)
                          </label>
                          <input
                            type="text"
                            value={formData.amount ? `₹${parseFloat(formData.amount).toLocaleString("en-IN")}` : ""}
                            readOnly
                            className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg bg-slate-50"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Base + CGST + SGST (auto-calculated)
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Payment Status
                      </label>
                      <select
                        name="paymentStatus"
                        value={formData.paymentStatus}
                        onChange={handleChange}
                        className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes - Common for both types */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      placeholder="Additional notes or remarks..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <motion.button
                      type="button"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Reset
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-lg disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {view === "edit" ? "Updating..." : "Saving..."}
                        </>
                      ) : (
                        submitButtonText
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render View Details
  const renderViewDetails = () => {
    if (isLoading) {
      return (
        <motion.div
          className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
            <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">
              Loading purchase details...
            </p>
          </div>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div
          className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-red-500 font-medium">Error: {error}</p>
        </motion.div>
      );
    }

    if (!selectedPurchase) {
      return (
        <motion.div
          className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-slate-600 font-medium">
            Purchase record not found.
          </p>
        </motion.div>
      );
    }

    const { supplierDetailsSnapshot: supplier } = selectedPurchase;
    const typeInfo = getPurchaseTypeInfo(selectedPurchase.purchaseType);
    const TypeIcon = typeInfo.icon;

    return (
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
              <TypeIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Purchase Details: Bill #{selectedPurchase.purchaseBillNumber}
                </h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${typeInfo.color}`}
                >
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeInfo.label} Purchase
                </span>
              </div>
              <p className="text-slate-500 mt-1 font-medium">
                View details of the selected purchase
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => handleEditPurchase(selectedPurchase._id)}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                <span>Edit Purchase</span>
              </div>
            </motion.button>
            <Link
              to="/purchases"
              onClick={() => setView("list")}
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-violet-600 font-medium transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Purchase List</span>
            </Link>
          </div>
        </div>

        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-2">
                Supplier
              </h2>
              <p className="text-sm font-medium text-slate-800">
                {supplier?.name || selectedPurchase.manualCompanyName || "N/A"}
              </p>
              <p className="text-sm text-slate-600">
                {supplier?.address || "N/A"}
              </p>
              <p className="text-sm text-slate-600">
                GSTIN: {supplier?.gstNumber || "N/A"}
              </p>
            </motion.div>
            <motion.div
              className="text-left md:text-right space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <p className="text-sm text-slate-600">
                <span className="font-medium">Purchase Type:</span>{" "}
                <span
                  className={`inline-flex items-center px-2 py-1 text-xs rounded border ${typeInfo.color}`}
                >
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeInfo.label}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Bill Date:</span>{" "}
                {formatDisplayDate(selectedPurchase.purchaseBillDate)}
              </p>
              {selectedPurchase.purchaseType === "YARN" && selectedPurchase.challanNumber && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Challan No:</span>{" "}
                  {selectedPurchase.challanNumber}
                </p>
              )}
              {selectedPurchase.purchaseType === "YARN" && selectedPurchase.challanDate && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Challan Date:</span>{" "}
                  {formatDisplayDate(selectedPurchase.challanDate)}
                </p>
              )}
              <p className="text-sm font-semibold">
                <span className="font-medium">Payment Status:</span>{" "}
                <span
                  className={`inline-flex px-3 py-1 text-xs rounded-lg border ${getStatusColor(
                    selectedPurchase.paymentStatus
                  )}`}
                >
                  {selectedPurchase.paymentStatus}
                </span>
              </p>
            </motion.div>
          </div>

          {selectedPurchase.purchaseType === "YARN" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Material & Weight Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200 text-sm">
                {selectedPurchase.denier && (
                  <div>
                    <span className="font-medium text-slate-600">Denier:</span>{" "}
                    {selectedPurchase.denier}
                  </div>
                )}
                {selectedPurchase.grade && (
                  <div>
                    <span className="font-medium text-slate-600">Grade:</span>{" "}
                    {selectedPurchase.grade}
                  </div>
                )}
                <div>
                  <span className="font-medium text-slate-600">Gross Wt.:</span>{" "}
                  {selectedPurchase.totalGrossWeight?.toFixed(3)} Kg
                </div>
                <div>
                  <span className="font-medium text-slate-600">Tare Wt.:</span>{" "}
                  {selectedPurchase.tareWeight?.toFixed(3)} Kg
                </div>
                <div className="font-medium">
                  <span className="font-medium text-slate-600">Net Wt.:</span>{" "}
                  {selectedPurchase.netWeight?.toFixed(3)} Kg
                </div>
                <div>
                  <span className="font-medium text-slate-600">
                    Rate per Unit:
                  </span>{" "}
                  ₹{selectedPurchase.ratePerUnit?.toFixed(2)}/kg
                </div>
                {selectedPurchase.carteageFridgeAmount && selectedPurchase.carteageFridgeAmount > 0 && (
                  <div>
                    <span className="font-medium text-slate-600">Carteage/Fridge:</span>{" "}
                    ₹{selectedPurchase.carteageFridgeAmount?.toFixed(2)}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Product Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Product Type:</span>{" "}
                  {selectedPurchase.productType || "N/A"}
                </div>
                {selectedPurchase.productDescription && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-slate-600">Description:</span>{" "}
                    <p className="mt-1 text-slate-600 whitespace-pre-wrap">
                      {selectedPurchase.productDescription}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Financials
            </h3>
            <div className="space-y-3 mb-6 text-sm">
              {selectedPurchase.purchaseType === "YARN" && selectedPurchase.subTotal && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-600">Sub Total:</span>
                  <span className="font-medium">₹{(selectedPurchase.subTotal || 0).toLocaleString("en-IN")}</span>
                </div>
              )}
              {selectedPurchase.purchaseType === "OTHER" && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-600">Base Amount:</span>
                  <span className="font-medium">
                    ₹{((selectedPurchase.amount || 0) - (selectedPurchase.cgst || 0) - (selectedPurchase.sgst || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {(selectedPurchase.cgst > 0 || selectedPurchase.sgst > 0) && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">CGST ({selectedPurchase.cgstPercentage || 2.5}%):</span>
                    <span className="font-medium">₹{(selectedPurchase.cgst || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">SGST ({selectedPurchase.sgstPercentage || 2.5}%):</span>
                    <span className="font-medium">₹{(selectedPurchase.sgst || 0).toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Total Amount:</span>
                <span className="font-bold text-xl text-slate-800">
                  ₹{(selectedPurchase.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </motion.div>

          {selectedPurchase.notes && (
            <motion.div
              className="mt-6 pt-6 border-t border-slate-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Notes
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {selectedPurchase.notes}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  // Main render
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === "list" && renderListView()}
        {(view === "add" || view === "edit") && renderFormModal()}
        {view === "view" && renderViewDetails()}

        {isMobile && view === "list" && (
          <motion.button
            onClick={handleAddPurchase}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default PurchaseListPage;